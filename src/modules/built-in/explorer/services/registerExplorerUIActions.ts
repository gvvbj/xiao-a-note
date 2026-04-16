import { Kernel } from '@/kernel/core/Kernel';
import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import { UIActionId } from '@/kernel/constants/UIActionIds';
import type { IFileSystem, IUIActionService, IWorkspaceActionService } from '@/kernel/interfaces';

interface IOpenFilePayload {
    path: string;
}

interface IRevealInExplorerPayload {
    path: string;
}

export function registerExplorerUIActions(kernel: Kernel): Array<() => void> {
    const uiActionService = kernel.getService<IUIActionService>(ServiceId.UI_ACTIONS);
    const workspaceActionService = kernel.getService<IWorkspaceActionService>(ServiceId.WORKSPACE_ACTIONS);
    const fileSystem = kernel.getService<IFileSystem>(ServiceId.FILE_SYSTEM);

    return [
        uiActionService.registerAction<IOpenFilePayload>({
            id: UIActionId.OPEN_FILE,
            title: '打开文件',
            run: async (payload) => {
                const path = payload?.path?.trim();
                if (!path) {
                    throw new Error('ui.openFile requires payload.path.');
                }

                await workspaceActionService.openFile(path);
            },
        }),
        uiActionService.registerAction<IRevealInExplorerPayload>({
            id: UIActionId.REVEAL_IN_EXPLORER,
            title: '在资源管理器中定位文件',
            run: async (payload) => {
                const path = payload?.path?.trim();
                if (!path) {
                    throw new Error('ui.revealInExplorer requires payload.path.');
                }

                kernel.emit(CoreEvents.EXPLORER_SELECT_PATH, path);
                await fileSystem.showItemInFolder(path);
            },
        }),
    ];
}
