import { TabService } from '@/kernel/services/TabService';
import { WorkspaceService } from '@/kernel/services/WorkspaceService';

/**
 * Tab 状态同步服务
 * 负责同步 dirty 状态到 WorkspaceService
 */
export function createDirtySyncHandler(
    tabService: TabService | null,
    workspaceService: WorkspaceService | null
): () => void {
    return () => {
        if (!tabService) return;
        const tabs = tabService.getTabs();
        const hasDirty = tabs.some(tab => tab.isDirty);
        workspaceService?.setHasDirtyFiles(hasDirty);
    };
}
