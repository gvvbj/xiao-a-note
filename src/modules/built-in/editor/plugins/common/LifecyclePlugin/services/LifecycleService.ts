/**
 * LifecycleService - 文件生命周期管理服务
 * 
 * 从 useEditorLogic.ts 抽离的核心状态机
 * 实现 ILifecycleService 接口
 * 
 * 职责:
 * 1. 管理文件切换 (switchFile) 的完整状态机
 * 2. 维护 activePath (逻辑激活) 和 loadedPath (物理加载) 的分离
 * 3. 发射生命周期事件供 UI 层订阅
 * 4. 处理缓存优先策略和竞态条件防护
 */

import { Kernel } from '@/kernel/core/Kernel';
import { ServiceId } from '@/kernel/core/ServiceId';
import { TabService } from '@/kernel/services/TabService';
import { EditorService } from '@/kernel/services/EditorService';
import { IFileSystem } from '@/kernel/interfaces/IFileSystem';
import { EditorEvents } from '../../../../constants/EditorEvents';
import { CoreEvents } from '@/kernel/core/Events';
import { EDITOR_CONSTANTS } from '../../../../constants/EditorConstants';
import { NoteService } from '../../NotePlugin/services/NoteService';
import { normalizePath } from '@/shared/utils/path';
import { normalizeMarkdown } from '@/shared/utils/ContentUtils';
import {
    ILifecycleService,
    ILifecycleState,
    IFileLoadedPayload,
    ILifecycleSwitchFailedPayload,
} from '@/modules/interfaces';
import { loggerService } from '@/kernel/services/LoggerService';

const logger = loggerService.createLogger('LifecycleService');

// Re-export types for backward compatibility
export type { ILifecycleState, IFileLoadedPayload };

export class LifecycleService implements ILifecycleService {
    private kernel: Kernel;
    private tabService: TabService | null = null;
    private editorService: EditorService | null = null;
    private noteService: NoteService | null = null;
    private fileSystem: IFileSystem | null = null;

    // 核心状态
    private activePath: string | null = null;
    private loadedPath: string | null = null;
    private status: 'idle' | 'switching' = 'idle';
    private initialContent: string = '';
    private isUnsaved: boolean = false;
    private lastError: string | null = null;

    // 防竞态与并发控制
    private skipNextLoad: boolean = false;
    private switchNonce: number = 0;
    private pendingRenameRetarget: { oldPath: string; newPath: string; expiresAt: number } | null = null;
    private cleanups: (() => void)[] = [];

    constructor(kernel: Kernel) {
        this.kernel = kernel;
        this.initServices();
        this.initRenameRetargetTracking();
    }

    private initServices(): void {
        this.tabService = this.kernel.getService<TabService>(ServiceId.TAB, false);
        this.editorService = this.kernel.getService<EditorService>(ServiceId.EDITOR, false);
        this.noteService = this.kernel.getService<NoteService>(ServiceId.NOTE, false);
        this.fileSystem = this.kernel.getService<IFileSystem>(ServiceId.FILE_SYSTEM, false) ?? null;

        if (!this.noteService) {
            this.noteService = new NoteService(this.kernel);
        }
    }

    private initRenameRetargetTracking(): void {
        const handleFileMoved = (payload: { oldPath: string; newPath: string }) => {
            const oldPath = normalizePath(payload.oldPath);
            const newPath = normalizePath(payload.newPath);

            // 仅记录短时间窗口内的重命名/移动路径对，供 switchFile 快照回填白名单匹配。
            this.pendingRenameRetarget = {
                oldPath,
                newPath,
                expiresAt: Date.now() + 2000,
            };
            this.logBug01Pkg('fileMoved.record', {
                oldPath,
                newPath,
                expiresAt: this.pendingRenameRetarget.expiresAt,
            });
        };

        this.kernel.on(CoreEvents.FILE_MOVED, handleFileMoved);
        this.cleanups.push(() => this.kernel.off(CoreEvents.FILE_MOVED, handleFileMoved));
    }

    /**
     * 获取当前状态快照 (只读)
     */
    public getState(): ILifecycleState {
        return {
            activePath: this.activePath,
            loadedPath: this.loadedPath,
            status: this.status,
            initialContent: this.initialContent,
            isUnsaved: this.isUnsaved,
            lastError: this.lastError,
        };
    }

    /**
     * 核心方法: 切换文件
     * 封装完整的状态机逻辑，确保原子性和防竞态
     */
    public async switchFile(
        nextPath: string | null,
        options?: {
            currentContent?: string | (() => string);
            forceReload?: boolean;
        }
    ): Promise<void> {
        const prevPath = this.activePath;
        const normalizedPrev = prevPath ? normalizePath(prevPath) : null;
        const normalizedNext = nextPath ? normalizePath(nextPath) : null;
        this.logBug01Pkg('switchFile.enter', {
            prevPath,
            nextPath,
            normalizedPrev,
            normalizedNext,
            status: this.status,
            switchNonce: this.switchNonce,
            pendingRenameRetarget: this.pendingRenameRetarget,
        });

        // [Guard 1] 跳过重复加载
        if (this.skipNextLoad && normalizedNext === normalizedPrev) {
            this.logBug01Pkg('switchFile.guard.skipNextLoad', { normalizedNext, normalizedPrev });
            this.skipNextLoad = false;
            this.status = 'idle';
            return;
        }

        // [Guard 2] 路径未变且已加载，不重复触发
        if (normalizedPrev === normalizedNext && normalizedNext !== null && !options?.forceReload) {
            this.logBug01Pkg('switchFile.guard.samePath', { normalizedPrev, normalizedNext });
            return;
        }

        // [Guard 3] 只有目标路径完全一致且非强制刷新时才忽略。
        // 如果正在切换中但目标不同，应允许新请求“覆盖”之前的切换（由 Nonce 保证最终一致性）
        if (this.status === 'switching' && normalizedNext === this.activePath) {
            this.logBug01Pkg('switchFile.guard.duplicateSwitchWhileSwitching', {
                normalizedNext,
                activePath: this.activePath,
            });
            return;
        }

        // === 开始切换 ===
        this.status = 'switching';
        this.lastError = null;
        const currentNonce = ++this.switchNonce;
        this.kernel.emit(EditorEvents.LIFECYCLE_SWITCHING_START, { prevPath, nextPath });

        // 1. [数据安全] 从 TabService 获取真实的脏状态
        const snapshotPath = this.activePath;
        const snapshotWasLoaded =
            snapshotPath !== null &&
            this.loadedPath !== null &&
            normalizePath(this.loadedPath) === normalizePath(snapshotPath);
        const tab = snapshotPath ? this.tabService?.getTab(snapshotPath) : null;
        const snapshotDirty = tab?.isDirty ?? this.isUnsaved;
        const snapshotContent = this.resolveContent(options?.currentContent);
        this.logBug01Pkg('switchFile.snapshot.prepare', {
            snapshotPath,
            normalizedNext,
            snapshotDirty,
            snapshotTabFound: !!tab,
            snapshotContentLen: snapshotContent.length,
            snapshotContentPreview: this.previewContent(snapshotContent),
        });

        // 2. [原子隔离] 立即解除旧路径绑定
        this.activePath = null;
        this.loadedPath = null;

        // 3. [原子保存] 仅在脏状态时保存快照
        if (snapshotPath) {
            // BUG-01 修复中的“回填到 nextPath”仅适用于重命名场景。
            // 关闭标签触发焦点切换时，旧标签被移除后也会满足「旧路径查不到、nextPath 存在」，
            // 若错误回填到 nextPath，会把被关闭标签内容串扰到新激活标签（BUG-05）。
            let snapshotTargetPath = snapshotPath;
            if (!tab && normalizedNext && this.tabService?.getTab(normalizedNext)) {
                const shouldRetarget = this.shouldRetargetSnapshotForRename(snapshotPath, normalizedNext);
                if (shouldRetarget) {
                    snapshotTargetPath = normalizedNext;
                }
                this.logBug01Pkg('switchFile.snapshot.retargetDecision', {
                    snapshotPath,
                    normalizedNext,
                    shouldRetarget,
                    finalTarget: snapshotTargetPath,
                    pendingRenameRetarget: this.pendingRenameRetarget,
                });
            }

            this.kernel.emit(EditorEvents.REQUEST_SAVE_CURSOR, snapshotTargetPath);
            // 仅允许“曾成功加载过的路径”写回快照。
            // 加载失败后 activePath 可能已经切到目标路径，但该路径从未真正拥有自己的文档内容；
            // 此时若继续把 currentContent 写回，会把上一份成功文档的内容串到失败标签里。
            if (snapshotWasLoaded && snapshotContent) {
                this.tabService?.updateTabContent(snapshotTargetPath, snapshotContent, snapshotDirty);
                this.logBug01Pkg('switchFile.snapshot.writeTabCache', {
                    snapshotTargetPath,
                    snapshotDirty,
                    contentLen: snapshotContent.length,
                    contentPreview: this.previewContent(snapshotContent),
                });
            }
        }

        // 4. 重置内部状态
        this.isUnsaved = false;
        this.initialContent = '';
        this.editorService?.setUnsaved(false);
        this.activePath = normalizedNext;

        // 5. 处理空路径 (关闭所有文件)
        if (!nextPath) {
            this.loadedPath = null;
            this.logBug01Pkg('switchFile.nextPath.null', {
                currentNonce,
                switchNonce: this.switchNonce,
            });
            if (currentNonce === this.switchNonce) {
                this.kernel.emit(EditorEvents.LIFECYCLE_FILE_LOADED, {
                    path: null,
                    content: '',
                    isUnsaved: false,
                    isFromCache: false,
                } as IFileLoadedPayload);
                this.kernel.emit(EditorEvents.EDITOR_STATE_CHANGED, { path: null, isUnsaved: false });
                this.status = 'idle';
            }
            return;
        }

        // 6. 加载内容 (缓存优先 -> 磁盘)
        try {
            const loadResult = await this.loadFileContent(normalizedNext!);
            this.logBug01Pkg('switchFile.loadResult', {
                normalizedNext,
                isFromCache: loadResult.isFromCache,
                isUnsaved: loadResult.isUnsaved,
                contentLen: loadResult.content.length,
                contentPreview: this.previewContent(loadResult.content),
                currentNonce,
                switchNonce: this.switchNonce,
            });

            // [Guard 4] 只有当此加载请求仍然是最新的请求时，才应用结果
            if (currentNonce !== this.switchNonce) {
                this.logBug01Pkg('switchFile.guard.staleLoadResult', {
                    normalizedNext,
                    currentNonce,
                    switchNonce: this.switchNonce,
                });
                return;
            }

            this.initialContent = loadResult.content;
            this.isUnsaved = loadResult.isUnsaved;
            this.loadedPath = normalizedNext;
            this.editorService?.setUnsaved(loadResult.isUnsaved);

            // 7. 发射加载完成事件（含滚动恢复数据）
            const targetTab = normalizedNext ? this.tabService?.getTab(normalizedNext) : null;
            const scrollState = (targetTab?.cursorPosition !== undefined || targetTab?.scrollTop !== undefined)
                ? {
                    cursorPosition: targetTab!.cursorPosition ?? 0,
                    scrollTop: targetTab!.scrollTop ?? 0,
                    topLineNumber: targetTab!.topLineNumber,
                    topOffset: targetTab!.topOffset,
                }
                : undefined;

            this.kernel.emit(EditorEvents.LIFECYCLE_FILE_LOADED, {
                path: normalizedNext,
                content: loadResult.content,
                isUnsaved: loadResult.isUnsaved,
                isFromCache: loadResult.isFromCache,
                scrollState,
            } as IFileLoadedPayload);

            // 8. 广播文档变更
            // 捕获加载结果的脏状态用于 queueMicrotask 闭包
            const wasUnsaved = loadResult.isUnsaved;
            queueMicrotask(() => {
                if (this.activePath === normalizedNext && currentNonce === this.switchNonce) {
                    this.kernel.emit(EditorEvents.EDITOR_STATE_CHANGED, {
                        path: this.activePath,
                        isUnsaved: this.isUnsaved,
                    });
                    this.kernel.emit(CoreEvents.DOCUMENT_CHANGED, {
                        content: this.initialContent,
                        path: nextPath,
                        // 仅无未保存修改时标记为初始化（isDirty=false）；有未保存修改时保留脏状态
                        isInitial: !wasUnsaved,
                    });
                }
            });

        } catch (err) {
            this.logBug01Pkg('switchFile.error', {
                normalizedNext,
                err: err instanceof Error ? { name: err.name, message: err.message } : String(err),
            });
            if (currentNonce === this.switchNonce) {
                const errorMessage = this.resolveLoadError(normalizedNext, err);
                this.loadedPath = null;
                this.initialContent = '';
                this.isUnsaved = false;
                this.lastError = errorMessage;
                if (normalizedNext) {
                    this.tabService?.clearTabContent(normalizedNext);
                }
                this.editorService?.setUnsaved(false);

                logger.error('Load failed', err);
                this.kernel.emit(EditorEvents.LIFECYCLE_SWITCHING_FAILED, {
                    path: normalizedNext,
                    error: errorMessage,
                } as ILifecycleSwitchFailedPayload);
                this.kernel.emit(EditorEvents.EDITOR_STATE_CHANGED, {
                    path: normalizedNext,
                    isUnsaved: false,
                    error: errorMessage,
                });
                this.status = 'idle';
            }
        } finally {
            if (currentNonce === this.switchNonce) {
                queueMicrotask(() => {
                    if (this.activePath === normalizedNext && this.status === 'switching') {
                        this.status = 'idle';
                    }
                });
            }
        }
    }

    /**
     * 加载文件内容 (缓存优先策略)
     */
    private async loadFileContent(path: string): Promise<{
        content: string;
        isUnsaved: boolean;
        isFromCache: boolean;
    }> {
        if (!path.startsWith(EDITOR_CONSTANTS.UNTITLED_PREFIX) && this.fileSystem) {
            const exists = await this.fileSystem.checkExists(path);
            if (!exists) {
                this.tabService?.clearTabContent(path);
                throw new Error(`目标文件不存在：${path}`);
            }
        }

        // 1. 检查 Tab 缓存
        const cachedContent = this.tabService?.getTabContent(path);
        const tab = this.tabService?.getTab(path);
        const isDirty = tab?.isDirty || false;

        // 有缓存就使用缓存（保留用户当前看到的内容），脏状态由 Tab 记录决定
        if (cachedContent !== undefined) {
            this.logBug01Pkg('loadFileContent.cache', {
                path,
                isDirty,
                contentLen: cachedContent.length,
                contentPreview: this.previewContent(cachedContent),
            });
            return {
                content: normalizeMarkdown(cachedContent),
                isUnsaved: isDirty,
                isFromCache: true,
            };
        }

        // 3. 新建文件 (Untitled)
        if (path.startsWith(EDITOR_CONSTANTS.UNTITLED_PREFIX)) {
            this.logBug01Pkg('loadFileContent.untitled', { path });
            return {
                content: '',
                isUnsaved: false,
                isFromCache: false,
            };
        }

        // 4. 从磁盘读取
        const diskContent = await this.noteService!.readFile(path);
        this.logBug01Pkg('loadFileContent.disk', {
            path,
            contentLen: diskContent.length,
            contentPreview: this.previewContent(diskContent),
        });
        return {
            content: normalizeMarkdown(diskContent),
            isUnsaved: false,
            isFromCache: false,
        };
    }

    /**
     * 更新脏状态 (供外部 Hook 调用)
     */
    public setUnsaved(dirty: boolean): void {
        this.isUnsaved = dirty;
        this.editorService?.setUnsaved(dirty);
        if (this.activePath) {
            this.tabService?.setTabDirty(this.activePath, dirty);
        }
    }

    /**
     * 设置跳过下次加载标记 (用于保存后不重新加载)
     */
    public skipNextLoadOnce(): void {
        this.skipNextLoad = true;
    }

    public dispose(): void {
        this.cleanups.forEach((cleanup) => cleanup());
        this.cleanups = [];
        this.pendingRenameRetarget = null;
    }

    /**
     * 仅在“最近一次 FILE_MOVED(old->new) 白名单命中”时允许快照回填到 nextPath。
     * 这样可排除关闭标签、删除文件等同样满足“旧路径不存在/查不到 Tab”的场景。
     */
    private shouldRetargetSnapshotForRename(snapshotPath: string, nextPath: string): boolean {
        const normalizedSnapshot = normalizePath(snapshotPath);
        const normalizedNext = normalizePath(nextPath);

        if (normalizedSnapshot.startsWith(EDITOR_CONSTANTS.UNTITLED_PREFIX)) {
            this.logBug01Pkg('retarget.skipUntitled', { snapshotPath, nextPath });
            return false;
        }

        const candidate = this.pendingRenameRetarget;
        if (!candidate) {
            this.logBug01Pkg('retarget.noCandidate', { snapshotPath: normalizedSnapshot, nextPath: normalizedNext });
            return false;
        }

        if (Date.now() > candidate.expiresAt) {
            this.logBug01Pkg('retarget.candidateExpired', {
                snapshotPath: normalizedSnapshot,
                nextPath: normalizedNext,
                candidate,
                now: Date.now(),
            });
            this.pendingRenameRetarget = null;
            return false;
        }

        const matched =
            candidate.oldPath === normalizedSnapshot &&
            candidate.newPath === normalizedNext;

        if (matched) {
            // 一次性消费，避免后续关闭/删除等切换误命中。
            this.pendingRenameRetarget = null;
        }

        this.logBug01Pkg('retarget.result', {
            snapshotPath: normalizedSnapshot,
            nextPath: normalizedNext,
            candidate,
            matched,
            consumed: matched,
        });

        return matched;
    }

    private logBug01Pkg(stage: string, data?: unknown): void {
        void stage;
        void data;
    }

    private previewContent(content: string, max = 80): string {
        return content.replace(/\r?\n/g, '\\n').slice(0, max);
    }

    /**
     * 解析 Lazy Content
     */
    private resolveContent(val?: string | (() => string)): string {
        if (!val) return '';
        return (typeof val === 'function' ? val() : val).replace(/\r\n/g, '\n');
    }

    private resolveLoadError(path: string | null, err: unknown): string {
        const fallback = path ? `无法加载文件：${path}` : '无法加载当前文件';
        if (err instanceof Error && err.message) {
            return err.message;
        }
        if (typeof err === 'string' && err.trim()) {
            return err;
        }
        return fallback;
    }
}
