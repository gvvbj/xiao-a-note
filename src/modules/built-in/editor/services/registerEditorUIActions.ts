import { Kernel } from '@/kernel/core/Kernel';
import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import { UIActionId } from '@/kernel/constants/UIActionIds';
import type { IUIActionService } from '@/kernel/interfaces';
import { EditorService } from '@/kernel/services/EditorService';
import { SplitViewService } from '@/modules/built-in/split-view/services/SplitViewService';

interface ISetViewModePayload {
    mode: 'source' | 'preview';
}

export function registerEditorUIActions(kernel: Kernel): Array<() => void> {
    const uiActionService = kernel.getService<IUIActionService>(ServiceId.UI_ACTIONS);
    const editorService = kernel.getService<EditorService>(ServiceId.EDITOR);

    return [
        uiActionService.registerAction({
            id: UIActionId.FOCUS_EDITOR,
            title: '聚焦编辑器',
            run: () => {
                kernel.emit(CoreEvents.EDITOR_FOCUS);
            },
        }),
        uiActionService.registerAction<ISetViewModePayload>({
            id: UIActionId.SET_VIEW_MODE,
            title: '设置编辑器视图模式',
            run: (payload) => {
                const mode = payload?.mode;
                if (mode !== 'source' && mode !== 'preview') {
                    throw new Error('ui.setViewMode requires payload.mode to be source or preview.');
                }

                const splitViewService = kernel.getService<SplitViewService>(ServiceId.SPLIT_VIEW, false);
                if (splitViewService?.isSplitView && mode !== 'source') {
                    throw new Error('Preview view mode is unavailable while split view is active.');
                }

                editorService.setViewMode(mode);
            },
        }),
        uiActionService.registerAction({
            id: UIActionId.SHOW_SAVE_AS_DIALOG,
            title: '打开另存为对话框',
            run: () => {
                kernel.emit(CoreEvents.APP_CMD_SAVE_AS);
            },
        }),
    ];
}
