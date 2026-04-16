export enum UISlotId {
    LEFT_SIDEBAR = 'left-sidebar',
    RIGHT_SIDEBAR = 'right-sidebar',
    SIDEBAR_BOTTOM = 'sidebar-bottom',
    MAIN_EDITOR = 'main-editor',
    TITLE_BAR = 'title-bar',
    EDITOR_TABS = 'editor-tabs',
    EDITOR_HEADER = 'editor-header',
    EDITOR_HEADER_RIGHT = 'editor-header-right',
    EDITOR_TOOLBAR = 'editor-toolbar',
    EDITOR_TOOLBAR_ITEMS = 'editor-toolbar-items', // 新增：用于工具栏具体项
    EDITOR_MODALS = 'editor-modals',
    EDITOR_SIDE_COMPANION = 'editor-side-companion', // 新增：分栏/伴随视图插槽
    STATUS_BAR = 'status-bar',
    STATUS_BAR_LEFT = 'status-bar-left',
    STATUS_BAR_RIGHT = 'status-bar-right'
}

const UI_SLOT_ID_SET = new Set<string>(Object.values(UISlotId));

export function isUISlotId(slotId: string): slotId is UISlotId {
    return UI_SLOT_ID_SET.has(slotId);
}
