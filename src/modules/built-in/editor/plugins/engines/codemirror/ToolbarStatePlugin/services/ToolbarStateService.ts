import { Kernel } from '@/kernel/core/Kernel';
import { ServiceId } from '@/kernel/core/ServiceId';
import { EditorView, ViewUpdate } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { EditorEvents } from '../../../../../constants/EditorEvents';
import type { SyntaxNode } from '@lezer/common';
import { EditorExtensionRegistry } from '../../../../../registries/EditorExtensionRegistry';

/**
 * ToolbarStateService - 工具栏状态同步服务
 * 
 * 职责：
 * 监听编辑器光标变化，解析当前位置的 Markdown 语法树，
 * 将活跃的语法节点映射到工具栏按钮 ID，发射事件驱动 UI 更新。
 * 
 * 设计：
 * - 纯 CodeMirror 扩展，不依赖 React
 * - 通过 Kernel 事件总线与 UI 层解耦
 * - 使用防抖避免高频更新
 */

/**
 * Markdown AST 节点名 → 工具栏按钮 ID 映射表
 * 
 * Key: Lezer Markdown 语法树节点名
 * Value: MarkdownCorePlugin 中注册的工具栏 item.id
 */
const NODE_TO_TOOLBAR_ID: Record<string, string> = {
    StrongEmphasis: 'StrongEmphasis',
    Emphasis: 'Emphasis',
    Strikethrough: 'StrikeThrough',
    InlineCode: 'InlineCode',
    ATXHeading1: 'ATXHeading1',
    ATXHeading2: 'ATXHeading2',
    ATXHeading3: 'ATXHeading1',  // H3+ 归类到 H1 组
    ATXHeading4: 'ATXHeading1',
    ATXHeading5: 'ATXHeading1',
    ATXHeading6: 'ATXHeading2',
    BulletList: 'BulletList',
    OrderedList: 'OrderedList',
    Blockquote: 'Blockquote',
};

/** 防抖延迟（毫秒） */
const DEBOUNCE_DELAY_MS = 50;

export class ToolbarStateService {
    private kernel: Kernel;
    private _cleanupHandlers: (() => void)[] = [];
    private _debounceTimer: ReturnType<typeof setTimeout> | null = null;
    private _lastStateKey: string = '';
    private isRegistered = false;

    constructor(kernel: Kernel) {
        this.kernel = kernel;
    }

    start(): void {
        this.registerExtension();
    }

    private registerExtension(): void {
        if (this.isRegistered) return;

        const extensionRegistry = this.kernel.getService<EditorExtensionRegistry>(ServiceId.EDITOR_EXTENSION_REGISTRY, false);
        if (!extensionRegistry) {
            setTimeout(() => this.registerExtension(), 50);
            return;
        }

        const updateListener = EditorView.updateListener.of((update: ViewUpdate) => {
            // 仅在选区变化或文档变化时更新
            if (!update.selectionSet && !update.docChanged) return;
            this.scheduleUpdate(update.view);
        });

        const unregister = extensionRegistry.register('toolbar-state-sync', updateListener);
        this._cleanupHandlers.push(unregister);
        this.isRegistered = true;
    }

    /**
     * 防抖更新：避免快速光标移动时的高频事件发射
     */
    private scheduleUpdate(view: EditorView): void {
        if (this._debounceTimer) clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => {
            this.computeAndEmit(view);
        }, DEBOUNCE_DELAY_MS);
    }

    /**
     * 计算当前光标位置的 Markdown 活跃状态并发射事件
     */
    private computeAndEmit(view: EditorView): void {
        const state = view.state;
        const cursor = state.selection.main.head;
        const activeStates: Record<string, boolean> = {};

        try {
            const tree = syntaxTree(state);
            let node: SyntaxNode | null = tree.resolveInner(cursor, -1);

            // 向上遍历语法树祖先节点
            while (node) {
                const toolbarId = NODE_TO_TOOLBAR_ID[node.name];
                if (toolbarId) {
                    activeStates[toolbarId] = true;
                }
                node = node.parent;
            }
        } catch {
            // 语法树未就绪时静默跳过
        }

        // 去重：状态未变则不发射事件
        const stateKey = Object.keys(activeStates).sort().join(',');
        if (stateKey === this._lastStateKey) return;
        this._lastStateKey = stateKey;

        this.kernel.emit(EditorEvents.TOOLBAR_STATE_CHANGED, activeStates);
    }

    dispose(): void {
        if (this._debounceTimer) clearTimeout(this._debounceTimer);
        this._cleanupHandlers.forEach(fn => fn());
        this._cleanupHandlers = [];
    }
}
