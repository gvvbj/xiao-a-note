/**
 * UIActionId - 正式 UI 动作 ID 常量
 *
 * 这是 UIActionService 可执行动作的唯一真相源。
 * 所有注册与执行都必须使用此处常量，禁止散落字符串字面量。
 */
export const UIActionId = {
    OPEN_FILE: 'ui.openFile',
    FOCUS_EDITOR: 'ui.focusEditor',
    SET_VIEW_MODE: 'ui.setViewMode',
    TOGGLE_SPLIT_VIEW: 'ui.toggleSplitView',
    REVEAL_IN_EXPLORER: 'ui.revealInExplorer',
    SHOW_SAVE_AS_DIALOG: 'ui.showSaveAsDialog',
    TOGGLE_LEFT_SIDEBAR: 'ui.toggleLeftSidebar',
    OPEN_SETTINGS: 'ui.openSettings',
} as const;

export type UIActionIdType = typeof UIActionId[keyof typeof UIActionId];
