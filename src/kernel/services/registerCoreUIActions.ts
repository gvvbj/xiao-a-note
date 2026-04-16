import { Kernel } from '@/kernel/core/Kernel';
import { ServiceId } from '@/kernel/core/ServiceId';
import { UIActionId } from '@/kernel/constants/UIActionIds';
import type { IUIActionService } from '@/kernel/interfaces';
import { LayoutService } from './LayoutService';

interface IToggleLeftSidebarPayload {
    visible?: boolean;
}

export function registerCoreUIActions(kernel: Kernel): Array<() => void> {
    const uiActionService = kernel.getService<IUIActionService>(ServiceId.UI_ACTIONS);
    const layoutService = kernel.getService<LayoutService>(ServiceId.LAYOUT);

    return [
        uiActionService.registerAction<IToggleLeftSidebarPayload>({
            id: UIActionId.TOGGLE_LEFT_SIDEBAR,
            title: '切换左侧边栏',
            run: (payload) => {
                if (typeof payload?.visible === 'boolean') {
                    layoutService.setSidebarVisible(payload.visible);
                    return;
                }

                layoutService.toggleSidebar();
            },
        }),
    ];
}
