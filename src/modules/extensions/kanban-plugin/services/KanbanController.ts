import { IPluginContext } from '@/kernel/system/plugin/types';
import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import { IFileSystem } from '@/kernel/interfaces/IFileSystem';
import { EditorView } from '@codemirror/view';
import { PROGRAMMATIC_TRANSACTION_SOURCES } from '@/modules/built-in/editor/constants/ProgrammaticTransactionSources';
import { KanbanData, KanbanViewState, KanbanCard, KanbanColumn, KanbanBoard } from '../constants/types';
import { KanbanParser } from './KanbanParser';
import { createInternalSyncTransaction } from '@/modules/built-in/editor/utils/InternalSyncTransaction';

/**
 * 看板控制器
 * 
 * 职责：
 * 1. 管理看板视图状态（是否激活、当前数据）
 * 2. 处理所有看板操作（拖拽、勾选、增删改）
 * 3. 调用 KanbanParser 序列化并回写 Markdown
 * 4. 通知 React 组件更新
 * 
 * 注意：使用 RestrictedPluginContext 的安全 API，不直接访问 Kernel
 */
export class KanbanController {

    private state: KanbanViewState = {
        isKanbanFile: false,
        isActive: false,
        data: null,
    };

    private listeners: Set<() => void> = new Set();
    private currentContent: string = '';
    private activePath: string = '';
    private pendingPath: string | null = null;
    /** 防止 deactivateView → dispatch → DOCUMENT_CHANGED → handleContentChange 循环 */
    private _syncing: boolean = false;
    /** CodeMirror EditorView 引用（由 index.tsx 通过编辑器扩展注入） */
    private editorView: EditorView | null = null;

    constructor(private context: IPluginContext) { }

    /** 注入当前活跃的 EditorView 引用 */
    setEditorView(view: EditorView | null): void {
        this.editorView = view;
    }

    // ─── 状态读取 API ───────────────────────────────

    /** 获取当前状态快照 */
    getState(): Readonly<KanbanViewState> {
        return this.state;
    }

    /** 订阅状态变化，返回取消订阅函数 */
    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    // ─── 内容检测 ───────────────────────────────────

    /** 处理文档内容变化，检测是否为看板文件 */
    handleContentChange(content: string, filePath?: string, authoritative: boolean = false): void {
        // 防止 deactivateView → dispatch → DOCUMENT_CHANGED → handleContentChange 循环
        if (this._syncing) {
            return;
        }

        const pathChanged = filePath !== undefined && filePath !== this.activePath;
        if (!authoritative && pathChanged && content.trim().length === 0) {
            this.pendingPath = filePath ?? null;
            return;
        }

        // 保存旧路径：deactivateView 需要将看板数据回写到原始文件
        // 必须在更新 activePath 之前捕获，否则看板数据会被写入新切换到的文件
        const previousPath = this.activePath;

        this.currentContent = content;
        if (filePath) {
            this.activePath = filePath;
        }
        if (filePath && this.pendingPath === filePath) {
            this.pendingPath = null;
        }

        const isKanbanFile = KanbanParser.isKanbanFile(content);
        const wasKanbanFile = this.state.isKanbanFile;

        this.state.isKanbanFile = isKanbanFile;

        // 如果切换到非看板文件，自动退出看板视图
        // 使用 previousPath 确保看板数据回写到原始看板文件
        if (!isKanbanFile && this.state.isActive) {
            this.deactivateView(previousPath);
            return;
        }

        // 如果是看板文件且视图已激活，更新数据并通知 UI
        if (isKanbanFile && this.state.isActive) {
            this.state.data = KanbanParser.parseKanban(content);
            this.notifyListeners();
            return;
        }

        // 自动激活：切换到看板文件时自动进入看板视图（仅文件切换时触发，打字不触发）
        if (isKanbanFile && !this.state.isActive && (authoritative || pathChanged || this.pendingPath === filePath)) {
            this.activateView();
            return;
        }

        // 文件类型变化或路径切换时通知（避免打字时频繁触发）
        if (isKanbanFile !== wasKanbanFile || pathChanged) {
            this.notifyListeners();
        }
    }

    // ─── 视图切换 ───────────────────────────────────

    /** 切换看板视图 */
    toggleView(): void {
        if (this.state.isActive) {
            this.deactivateView();
        } else {
            // 优先从 EditorView 读取最新内容（避免 _syncing 导致 currentContent 过时）
            if (this.editorView) {
                this.currentContent = this.editorView.state.doc.toString();
            }

            if (this.currentContent) {
                this.state.isKanbanFile = KanbanParser.isKanbanFile(this.currentContent);
            }

            if (!this.state.isKanbanFile) {
                return;
            }
            try {
                this.activateView();
            } catch (err) {
                this.context.logger.error('[Kanban] toggleView: 激活失败:', err);
                this.state.isActive = false;
                this.state.data = null;
                this.notifyListeners();
            }
        }
    }

    /** 激活看板视图 */
    private activateView(): void {
        if (!this.state.isKanbanFile) return;

        // 解析当前内容
        const data = KanbanParser.parseKanban(this.currentContent);

        this.state.data = data;
        this.state.isActive = true;

        this.notifyListeners();
    }

    /**
     * 停用看板视图并回写内容
     * @param savePath 可选的保存目标路径（切换文件时由 handleContentChange 传入原始看板文件路径）
     */
    private deactivateView(savePath?: string): void {
        if (!this.state.isActive) return;

        // 序列化并保存到磁盘
        let serializedContent: string | null = null;
        if (this.state.data) {
            try {
                serializedContent = KanbanParser.serializeKanban(this.state.data);
                this.currentContent = serializedContent;
                // 使用 savePath 确保写入正确的文件（而非已被切换的 activePath）
                this.syncToFile(savePath);
                if (savePath) {
                    this._syncing = true;
                    try {
                        this.context.emit(CoreEvents.DOCUMENT_CHANGED, {
                            path: savePath,
                            content: serializedContent,
                            isInitial: true,
                        });
                    } finally {
                        this._syncing = false;
                    }
                }
            } catch (err) {
                this.context.logger.error('退出看板时保存失败:', err);
            }
        }

        this.state.isActive = false;
        this.state.data = null;

        this.notifyListeners();

        // 文件已切换时不 dispatch — 当前编辑器显示的是新文件，不应覆盖其内容
        // 仅在同文件停用（如用户手动关闭看板）时才 dispatch 回写
        const isFileSwitched = savePath !== undefined && savePath !== this.activePath;
        if (serializedContent && this.editorView && !isFileSwitched) {
            const view = this.editorView;
            const content = serializedContent;
            requestAnimationFrame(() => {
                this._syncing = true;
                try {
                    view.dispatch(createInternalSyncTransaction(
                        {
                            changes: {
                                from: 0,
                                to: view.state.doc.length,
                                insert: content,
                            },
                            selection: { anchor: 0 },
                        },
                        { source: PROGRAMMATIC_TRANSACTION_SOURCES.KANBAN_DEACTIVATE_VIEW },
                    ));
                    // 恢复编辑器焦点（覆盖层消失后需要显式 focus）
                    view.focus();
                } catch (err) {
                    this.context.logger.error('同步内容到编辑器失败:', err);
                } finally {
                    this._syncing = false;
                }
            });
        }
    }

    // ─── 卡片操作 ───────────────────────────────────

    /** 移动卡片到目标列 */
    moveCard(cardId: string, toColumnId: string, position: number): void {
        if (!this.state.data) return;

        const { card, sourceColumn } = this.findCard(cardId);
        const targetColumn = this.findColumn(toColumnId);
        if (!card || !sourceColumn || !targetColumn) return;

        // 从源列移除
        sourceColumn.cards = sourceColumn.cards.filter(c => c.id !== cardId);

        // 插入目标列
        const clampedPos = Math.min(position, targetColumn.cards.length);
        targetColumn.cards.splice(clampedPos, 0, card);

        // 根据目标列属性更新卡片状态
        if (targetColumn.isDone) {
            card.status = 'done';
        } else if (targetColumn.isDoing) {
            card.status = 'doing';
        } else {
            card.status = 'todo';
        }

        // 重新生成 ID
        this.regenerateIds();
        this.notifyAndSync();
    }

    /** 切换卡片状态（复选框） */
    toggleCardStatus(cardId: string): void {
        if (!this.state.data) return;

        const { card, sourceColumn } = this.findCard(cardId);
        if (!card || !sourceColumn) return;

        // 切换状态
        if (card.status === 'done') {
            card.status = 'todo';
        } else {
            card.status = 'done';
        }

        // 如果勾选完成，自动移到同组的 ✅ 列
        if (card.status === 'done') {
            const board = this.findBoardByColumn(sourceColumn.id);
            if (board) {
                const doneColumn = board.columns.find(col => col.isDone && col.id !== sourceColumn.id);
                if (doneColumn) {
                    sourceColumn.cards = sourceColumn.cards.filter(c => c.id !== cardId);
                    doneColumn.cards.push(card);
                }
            }
        }

        this.regenerateIds();
        this.notifyAndSync();
    }

    /** 新增卡片 */
    addCard(columnId: string, text: string): void {
        if (!this.state.data || !text.trim()) return;

        const column = this.findColumn(columnId);
        if (!column) return;

        const card: KanbanCard = {
            id: `${columnId}-card-${column.cards.length}`,
            text: text.trim(),
            status: column.isDone ? 'done' : 'todo',
            children: [],
            description: '',
        };
        column.cards.push(card);

        this.regenerateIds();
        this.notifyAndSync();
    }

    /** 删除卡片 */
    deleteCard(cardId: string): void {
        if (!this.state.data) return;

        const { sourceColumn } = this.findCard(cardId);
        if (!sourceColumn) return;

        sourceColumn.cards = sourceColumn.cards.filter(c => c.id !== cardId);

        this.regenerateIds();
        this.notifyAndSync();
    }

    /** 编辑卡片文本 */
    editCard(cardId: string, text: string): void {
        if (!this.state.data) return;

        const { card } = this.findCard(cardId);
        if (!card) return;

        card.text = text;
        this.notifyAndSync();
    }

    /** 新建看板分组（带默认三列） */
    addBoard(title: string): void {
        if (!this.state.data || !title.trim()) return;

        const boardId = `board-${this.state.data.boards.length}`;
        const board: KanbanBoard = {
            id: boardId,
            title: title.trim(),
            columns: [
                { id: `${boardId}-col-0`, title: '待办 📋', isDone: false, isDoing: false, cards: [] },
                { id: `${boardId}-col-1`, title: '进行中 🔄', isDone: false, isDoing: true, cards: [] },
                { id: `${boardId}-col-2`, title: '已完成 ✅', isDone: true, isDoing: false, cards: [] },
            ],
        };
        this.state.data.boards.push(board);

        this.regenerateIds();
        this.notifyAndSync();
    }

    /** 编辑列标题 */
    editColumnTitle(columnId: string, title: string): void {
        if (!this.state.data || !title.trim()) return;

        const column = this.findColumn(columnId);
        if (!column) return;

        column.title = title.trim();
        // 重新检测列属性标识
        column.isDone = column.title.includes('✅');
        column.isDoing = column.title.includes('🔄');

        this.notifyAndSync();
    }

    /** 删除看板分组 */
    deleteBoard(boardId: string): void {
        if (!this.state.data) return;

        this.state.data.boards = this.state.data.boards.filter(b => b.id !== boardId);

        this.regenerateIds();
        this.notifyAndSync();
    }

    /** 重命名看板分组 */
    renameBoard(boardId: string, title: string): void {
        if (!this.state.data || !title.trim()) return;

        const board = this.state.data.boards.find(b => b.id === boardId);
        if (!board) return;

        board.title = title.trim();
        this.notifyAndSync();
    }

    /** 新建列 */
    addColumn(boardId: string, title: string): void {
        if (!this.state.data || !title.trim()) return;

        const board = this.state.data.boards.find(b => b.id === boardId);
        if (!board) return;

        const colTitle = title.trim();
        const column: KanbanColumn = {
            id: `${boardId}-col-${board.columns.length}`,
            title: colTitle,
            isDone: colTitle.includes('✅'),
            isDoing: colTitle.includes('🔄'),
            cards: [],
        };
        board.columns.push(column);

        this.regenerateIds();
        this.notifyAndSync();
    }

    /** 删除列 */
    deleteColumn(columnId: string): void {
        if (!this.state.data) return;

        const board = this.findBoardByColumn(columnId);
        if (!board) return;

        board.columns = board.columns.filter(c => c.id !== columnId);

        this.regenerateIds();
        this.notifyAndSync();
    }

    // ─── 保存相关 ───────────────────────────────────

    /** 手动保存（Ctrl+S 时调用） */
    save(): void {
        if (this.state.isActive && this.state.data) {
            this.syncToFile();
        }
    }

    // ─── 内部方法 ───────────────────────────────────

    /** 通知 UI 并自动同步到磁盘 */
    private notifyAndSync(): void {
        this.notifyListeners();
        this.syncToFile();
    }

    /**
     * 同步看板数据到文件（仅写磁盘，不触碰编辑器缓冲区）
     * 使用 ServiceId.FILE_SYSTEM 获取文件系统服务（通过沙箱代理）
     * 注意：不能使用 EditorView.dispatch()，因为看板覆盖层激活期间 dispatch 会导致崩溃
     * @param overridePath 可选的目标路径（切换文件停用看板时传入原始看板文件路径）
     */
    private syncToFile(overridePath?: string): void {
        // 优先使用显式传入的路径，确保看板数据写回正确的文件
        const targetPath = overridePath || this.activePath;
        if (!this.state.data || !targetPath) return;

        const markdown = KanbanParser.serializeKanban(this.state.data);
        this.currentContent = markdown;

        const fs = this.context.getService<IFileSystem>(ServiceId.FILE_SYSTEM);
        if (fs?.saveFile) {
            fs.saveFile(targetPath, markdown).catch((err: Error) => {
                this.context.logger.error('看板保存失败:', err);
            });
        }
    }

    /** 查找卡片及其所在列 */
    private findCard(cardId: string): { card: KanbanCard | null; sourceColumn: KanbanColumn | null } {
        if (!this.state.data) return { card: null, sourceColumn: null };

        for (const board of this.state.data.boards) {
            for (const column of board.columns) {
                const card = column.cards.find(c => c.id === cardId);
                if (card) {
                    return { card, sourceColumn: column };
                }
            }
        }
        return { card: null, sourceColumn: null };
    }

    /** 查找列 */
    private findColumn(columnId: string): KanbanColumn | null {
        if (!this.state.data) return null;

        for (const board of this.state.data.boards) {
            const column = board.columns.find(c => c.id === columnId);
            if (column) return column;
        }
        return null;
    }

    /** 查找列所属的分组 */
    private findBoardByColumn(columnId: string): KanbanBoard | null {
        if (!this.state.data) return null;

        for (const board of this.state.data.boards) {
            if (board.columns.some(c => c.id === columnId)) {
                return board;
            }
        }
        return null;
    }

    /** 重新生成所有 ID（操作后保持一致性） */
    private regenerateIds(): void {
        if (!this.state.data) return;

        let boardIdx = 0;
        for (const board of this.state.data.boards) {
            board.id = `board-${boardIdx++}`;
            let colIdx = 0;
            for (const column of board.columns) {
                column.id = `${board.id}-col-${colIdx++}`;
                let cardIdx = 0;
                for (const card of column.cards) {
                    card.id = `${column.id}-card-${cardIdx++}`;
                }
            }
        }
    }

    /** 通知所有订阅者 */
    private notifyListeners(): void {
        this.listeners.forEach(fn => fn());
    }

    /** 清理资源 */
    dispose(): void {
        this.listeners.clear();
        this.pendingPath = null;
        this.state = { isKanbanFile: false, isActive: false, data: null };
    }
}
