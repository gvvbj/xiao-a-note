import { Kernel } from '@/kernel/core/Kernel';
import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import { EDITOR_CONSTANTS } from '../../../../constants/EditorConstants';
import { TabService } from '@/kernel/services/TabService';

/**
 * SyncService - 编辑器状态同步服务
 * 负责：
 * 1. 同步文件状态到标签页与资源管理器
 * 2. 内容变更同步到 TabService
 */
export class SyncService {
    private kernel: Kernel;
    private _disposeHandlers: (() => void)[] = [];

    constructor(kernel: Kernel) {
        this.kernel = kernel;
    }

    /**
     * 启动同步监听
     */
    start(): void {
        const tabService = this.kernel.getService<TabService>(ServiceId.TAB, false);

        // 1. 同步文件状态到标签页与资源管理器
        const handleStateChange = (payload: { path: string | null, isUnsaved: boolean }) => {
            const { path, isUnsaved } = payload;
            if (path && tabService) {
                tabService.setTabDirty(path, isUnsaved);
                if (!path.startsWith(EDITOR_CONSTANTS.UNTITLED_PREFIX)) {
                    this.kernel.emit(CoreEvents.EXPLORER_SELECT_PATH, path);
                }
            }
        };

        // 2. 内容变更同步 (原本在 NoteEditor 中的逻辑)
        const handleDocChange = (payload: { content: string, path: string | null, isInitial?: boolean }) => {
            if (payload.path && tabService) {
                // 如果是初始加载广播，显式指定为非脏
                tabService.updateTabContent(payload.path, payload.content, payload.isInitial ? false : undefined);
            }
        };

        this.kernel.on(CoreEvents.EDITOR_STATE_CHANGED, handleStateChange);
        this.kernel.on(CoreEvents.DOCUMENT_CHANGED, handleDocChange);

        this._disposeHandlers.push(() => {
            this.kernel.off(CoreEvents.EDITOR_STATE_CHANGED, handleStateChange);
            this.kernel.off(CoreEvents.DOCUMENT_CHANGED, handleDocChange);
        });
    }

    /**
     * 停止并清理
     */
    dispose(): void {
        this._disposeHandlers.forEach(fn => fn());
        this._disposeHandlers = [];
    }
}
