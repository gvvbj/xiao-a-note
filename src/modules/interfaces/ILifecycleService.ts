/**
 * ILifecycleService - 文件生命周期服务接口
 * 
 * 核心契约
 * 用于解耦 LifecyclePlugin 与其他消费者 (如 useEditorLogic, TabManager)。
 * 
 * 消费者:
 * 1. useEditorLogic: 调用 switchFile
 * 2. EditorKernelIntegration: 监听事件
 * 3. TabManager: 可能需要 skipNextLoadOnce
 */

export interface ILifecycleState {
    activePath: string | null;
    loadedPath: string | null;
    status: 'idle' | 'switching';
    initialContent: string;
    isUnsaved: boolean;
    lastError: string | null;
}

export interface IFileLoadedPayload {
    path: string | null;
    content: string;
    isUnsaved: boolean;
    isFromCache: boolean;
    /** 切换前保存的光标/滚动状态，用于恢复视口位置 */
    scrollState?: {
        cursorPosition: number;
        scrollTop: number;
        topLineNumber?: number;
        topOffset?: number;
    };
}

export interface ILifecycleSwitchFailedPayload {
    path: string | null;
    error: string;
}

export interface ILifecycleService {
    /**
     * 获取当前状态快照 (只读)
     */
    getState(): ILifecycleState;

    /**
     * 核心方法: 切换文件
     */
    switchFile(
        nextPath: string | null,
        options?: {
            currentContent?: string | (() => string);
            forceReload?: boolean;
        }
    ): Promise<void>;

    /**
     * 更新脏状态 (供外部 Hook 调用)
     */
    setUnsaved(dirty: boolean): void;

    /**
     * 设置跳过下次加载标记 (用于保存后不重新加载)
     */
    skipNextLoadOnce(): void;
}
