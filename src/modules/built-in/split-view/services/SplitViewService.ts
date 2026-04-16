import { EditorView } from '@codemirror/view';
import { ChangeSet } from '@codemirror/state';
import { Kernel } from '@/kernel/core/Kernel';
import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import { SettingsService } from '@/kernel/services/SettingsService';
import { EditorService } from '@/kernel/services/EditorService';
import { LoggerService } from '@/kernel/services/LoggerService';
import { SyncController } from './SyncController';

export class SplitViewService {
    private scrollTimer: ReturnType<typeof setTimeout> | null = null;
    private mainView: EditorView | null = null;
    private previewView: EditorView | null = null;
    private syncController: SyncController;
    private logger: any = null;
    private savedViewMode: 'source' | 'preview' | null = null;

    private _isSplitView: boolean = false;
    // [Bug 1] 缓存待同步内容：当 LIFECYCLE_FILE_LOADED 触发时 previewView 尚未就绪
    private pendingContent: string | null = null;

    // 主编辑器滚动监听器引用（用于清理）
    private _mainScrollHandler: (() => void) | null = null;
    // 打字时临时压制滚动监听器，防止 _syncScrollByTopLine 与光标同步冲突
    private _scrollCooldown: boolean = false;
    private _cooldownTimer: ReturnType<typeof setTimeout> | null = null;

    // 策略 2：高度差补偿
    // 打字时记录 scrollHeight，内容渲染后 scrollTop += 高度增量
    private _pendingScroll: boolean = false;
    private _prevScrollHeight: number = 0;
    private _fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    private _previewResizeObserver: ResizeObserver | null = null;

    constructor(private kernel: Kernel) {
        const settings = kernel.getService<SettingsService>(ServiceId.SETTINGS);
        const loggerService = kernel.getService<LoggerService>(ServiceId.LOGGER, false);
        this.logger = loggerService?.createLogger('SplitViewService');

        this._isSplitView = settings?.getSetting('editor.isSplitView', false) || false;

        // [Plugin-First] 引入解耦后的同步控制器
        this.syncController = new SyncController();
    }

    /**
     * 初始化 Service 的事件监听逻辑
     */
    init() {
        this.logger?.info('[SplitView] Service initialization started');

        // 监听视图就绪
        this.kernel.on(CoreEvents.MAIN_VIEW_READY, (v: any) => {
            this.setMainView(v);
        });

        this.kernel.on(CoreEvents.PREVIEW_VIEW_READY, (v: any) => {
            this.setPreviewView(v);
        });

        // 当前编辑上下文被清空时，分栏不应继续保留右侧预览。
        this.kernel.on(CoreEvents.OPEN_FILE, (path: string | null) => {
            if (path === null && this._isSplitView) {
                this.setSplitView(false);
            }
        });

        // 监听同步请求（打字输入 → 使用光标行锚点同步）
        this.kernel.on(CoreEvents.EDITOR_SYNC_CONTENT, (payload: any) => {
            if (this._isSplitView) {
                this.syncContent(payload.content, false, payload.cursorLine);
            }
        });

        // [Bug 1 & 4] 文件加载完成后同步到预览
        this.kernel.on(CoreEvents.LIFECYCLE_FILE_LOADED, (payload: any) => {
            if (!this._isSplitView || !payload.content) return;

            if (this.previewView && this.mainView) {
                setTimeout(() => {
                    if (this.mainView && this.previewView) {
                        const content = this.mainView.state.doc.toString();
                        if (content) {
                            this.syncContent(content, true);
                        }
                    }
                }, 50);
            } else {
                this.pendingContent = payload.content;
            }
        });
    }

    get isSplitView() {
        return this._isSplitView;
    }

    /**
     * 保存进入分栏前的 viewMode。
     * 必须在 SPLIT_VIEW_TRANSITION_START 时机调用，避免关闭分栏时被 source 覆盖。
     */
    captureViewModeBeforeSplitTransition() {
        if (this.savedViewMode !== null) return;

        const editorService = this.kernel.getService<EditorService>(ServiceId.EDITOR, false);
        if (editorService) {
            this.savedViewMode = editorService.getState().viewMode;
        }
    }

    /**
     * 分栏状态变化后恢复进入分栏前的 viewMode（仅关闭分栏时生效）。
     */
    restoreViewModeAfterSplitChange(isSplit: boolean) {
        if (!isSplit && this.savedViewMode) {
            if (this.savedViewMode !== 'source') {
                const editorService = this.kernel.getService<EditorService>(ServiceId.EDITOR, false);
                editorService?.setViewMode(this.savedViewMode);
            }
            this.savedViewMode = null;
        }
    }

    setSplitView(split: boolean) {
        if (this._isSplitView === split) return;

        this.kernel.emit(CoreEvents.SPLIT_VIEW_TRANSITION_START);

        this._isSplitView = split;
        const settings = this.kernel.getService<SettingsService>(ServiceId.SETTINGS);
        settings?.updateSettings('editor', { isSplitView: split });

        if (split) {
            const editorService = this.kernel.getService<EditorService>(ServiceId.EDITOR);
            if (editorService && editorService.getState().viewMode !== 'source') {
                editorService.setViewMode('source');
            }
        }

        if (!split) {
            this._removeMainScrollListener();
            this.setPreviewView(null);
        }

        this.kernel.emit(CoreEvents.SPLIT_VIEW_CHANGED, split);
    }

    setMainView(view: EditorView | null) {
        this._removeMainScrollListener();
        this.mainView = view;
        this.syncController.setViews(this.mainView, this.previewView);

        if (view && this._isSplitView) {
            this._attachMainScrollListener(view);
        }
    }

    setPreviewView(view: EditorView | null) {
        this.previewView = view;
        this.syncController.setViews(this.mainView, this.previewView);

        // 注册预览 updateListener（用于布局感知滚动同步）
        if (view) {
            this._installPreviewUpdateListener(view);
        }

        // [Bug 1] 消费缓存的待同步内容（重启场景）
        if (view && this._isSplitView && this.pendingContent) {
            const content = this.pendingContent;
            this.pendingContent = null;
            setTimeout(() => {
                if (this.previewView) {
                    this.syncContent(content, true);
                }
            }, 50);
            return;
        }

        // 原有逻辑：当两个视图都就绪时从 mainView 同步
        if (view && this.mainView && this._isSplitView) {
            const content = this.mainView.state.doc.toString();
            if (content) {
                this.syncContent(content, true);
            }

            if (!this._mainScrollHandler) {
                this._attachMainScrollListener(this.mainView);
            }
        }
    }

    /**
     * 同步内容到预览
     * @param cursorLine 光标行号（仅打字时传入，滚动同步不需要）
     */
    syncContent(content: string | (() => string), force: boolean = false, cursorLine?: number) {
        if (!this.previewView) return;

        this.syncController.syncContent(content, force);

        // 打字输入：设置待同步行号，等预览布局完成后由 updateListener 执行 scrollIntoView
        if (cursorLine !== undefined) {
            this._requestCursorSync(cursorLine);
        }
    }

    // ========= 策略 1：滚轮滚动 → 顶行锚点 =========

    private _attachMainScrollListener(view: EditorView) {
        this._removeMainScrollListener();

        const handler = () => {
            if (this._isSplitView && !this._scrollCooldown) {
                this._syncScrollByTopLine();
            }
        };

        this._mainScrollHandler = handler;
        view.scrollDOM.addEventListener('scroll', handler, { passive: true });
    }

    private _removeMainScrollListener() {
        if (this._mainScrollHandler && this.mainView) {
            this.mainView.scrollDOM.removeEventListener('scroll', this._mainScrollHandler);
        }
        this._mainScrollHandler = null;
    }

    /**
     * 找到主编辑器视口顶部可见的行号 → 在预览中将同一行对齐到视口顶部
     */
    private _syncScrollByTopLine() {
        if (!this.previewView || !this.mainView) return;

        if (this.scrollTimer) clearTimeout(this.scrollTimer);
        this.scrollTimer = setTimeout(() => {
            try {
                const main = this.mainView;
                const preview = this.previewView;
                if (!main || !preview) return;

                const mainRect = main.scrollDOM.getBoundingClientRect();
                const topPos = main.posAtCoords({ x: mainRect.left, y: mainRect.top });
                if (topPos === null) return;

                const topLine = main.state.doc.lineAt(topPos);
                const previewDoc = preview.state.doc;
                if (topLine.number > previewDoc.lines) return;

                const previewLine = previewDoc.line(topLine.number);
                const previewCoords = preview.coordsAtPos(previewLine.from);
                if (!previewCoords) return;

                const previewRect = preview.scrollDOM.getBoundingClientRect();
                const offset = previewCoords.top - previewRect.top;

                if (Math.abs(offset) < 2) return;

                preview.scrollDOM.scrollBy({ top: offset, behavior: 'auto' });
            } catch (e) {
                // 静默处理
            }
        }, 16);
    }

    // ========= 策略 2：打字输入 → 高度差补偿 =========

    /**
     * 在预览编辑器上安装 ResizeObserver。
     * 当 contentDOM 高度变化（内容/装饰器渲染完成）时，
     * 将 scrollTop 增加高度差，确保新增内容始终可见。
     */
    private _installPreviewUpdateListener(view: EditorView) {
        this._previewResizeObserver?.disconnect();

        const observer = new ResizeObserver(() => {
            if (this._pendingScroll) {
                this._applyHeightDelta();
            }
        });

        observer.observe(view.contentDOM);
        this._previewResizeObserver = observer;
    }

    /**
     * 请求滚动补偿（打字时调用）
     * 记录当前 scrollHeight，等 ResizeObserver 检测到高度变化后补偿差值
     */
    private _requestCursorSync(_cursorLine: number) {
        const preview = this.previewView;
        if (!preview) return;

        // 记录同步前的高度
        this._prevScrollHeight = preview.scrollDOM.scrollHeight;
        this._pendingScroll = true;

        // 取消任何待执行的 top-line 同步
        if (this.scrollTimer) clearTimeout(this.scrollTimer);

        // 开启冷却：压制 scroll 事件监听器
        this._scrollCooldown = true;
        if (this._cooldownTimer) clearTimeout(this._cooldownTimer);
        this._cooldownTimer = setTimeout(() => {
            this._scrollCooldown = false;
        }, 150);

        // 兜底：如果 300ms 内没有 resize（纯文本相同高度），也做一次补偿
        if (this._fallbackTimer) clearTimeout(this._fallbackTimer);
        this._fallbackTimer = setTimeout(() => {
            if (this._pendingScroll) {
                this._applyHeightDelta();
            }
        }, 300);
    }

    /**
     * 应用高度差补偿（由 ResizeObserver 或 fallback timer 触发）
     * 核心逻辑：scrollTop += (newScrollHeight - oldScrollHeight)
     * 新增内容让文档变高多少，就向下滚动多少 — 保证新内容始终可见
     */
    private _applyHeightDelta() {
        this._pendingScroll = false;

        if (this._fallbackTimer) {
            clearTimeout(this._fallbackTimer);
            this._fallbackTimer = null;
        }

        try {
            const preview = this.previewView;
            if (!preview) return;

            const newScrollHeight = preview.scrollDOM.scrollHeight;
            const delta = newScrollHeight - this._prevScrollHeight;

            // 高度增加了 → 向下滚动相应量
            if (delta > 0) {
                preview.scrollDOM.scrollTop += delta;
            }

            this._prevScrollHeight = newScrollHeight;
        } catch (e) {
            // 静默处理
        }
    }

    dispose() {
        this.logger?.info('Service disposing');
        this.savedViewMode = null;
        this._removeMainScrollListener();
        if (this.scrollTimer) clearTimeout(this.scrollTimer);
        if (this._cooldownTimer) clearTimeout(this._cooldownTimer);
        if (this._fallbackTimer) clearTimeout(this._fallbackTimer);
        this._previewResizeObserver?.disconnect();
        this._previewResizeObserver = null;
        this._pendingScroll = false;
        this.syncController.dispose();
        this.mainView = null;
        this.previewView = null;
    }
}
