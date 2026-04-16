import { Kernel } from '@/kernel/core/Kernel';
import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import { UIActionId } from '@/kernel/constants/UIActionIds';
import type { IUIActionService } from '@/kernel/interfaces';

export function registerSettingsUIActions(kernel: Kernel): Array<() => void> {
    const uiActionService = kernel.getService<IUIActionService>(ServiceId.UI_ACTIONS);

    return [
        uiActionService.registerAction({
            id: UIActionId.OPEN_SETTINGS,
            title: '打开设置',
            run: () => {
                kernel.emit(CoreEvents.APP_SHOW_SETTINGS_DIALOG);
            },
        }),
    ];
}
