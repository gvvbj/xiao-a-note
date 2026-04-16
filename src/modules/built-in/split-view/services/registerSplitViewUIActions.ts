import { UIActionId } from '@/kernel/constants/UIActionIds';
import { ServiceId } from '@/kernel/core/ServiceId';
import type { IUIActionService } from '@/kernel/interfaces';
import { Kernel } from '@/kernel/core/Kernel';
import { SplitViewService } from './SplitViewService';

interface IToggleSplitViewPayload {
    value?: boolean;
}

export function registerSplitViewUIActions(kernel: Kernel, splitViewService: SplitViewService): Array<() => void> {
    const uiActionService = kernel.getService<IUIActionService>(ServiceId.UI_ACTIONS);

    return [
        uiActionService.registerAction<IToggleSplitViewPayload>({
            id: UIActionId.TOGGLE_SPLIT_VIEW,
            title: '切换分栏视图',
            run: (payload) => {
                const nextValue = typeof payload?.value === 'boolean'
                    ? payload.value
                    : !splitViewService.isSplitView;
                splitViewService.setSplitView(nextValue);
            },
        }),
    ];
}
