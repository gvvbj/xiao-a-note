import { CoreEvents } from '@/kernel/core/Events';

/**
 * EditorEvents — 编辑器模块事件常量
 *
 * 所有值引用 CoreEvents，这是 CoreEvents 在编辑器模块内的便捷别名。
 * 禁止在此文件中使用字符串字面量。
 */
export const EditorEvents = {
    // ─── 文件操作 ────────────────────────────────────────
    OPEN_FILE: CoreEvents.OPEN_FILE,
    REQUEST_SAVE_CURSOR: CoreEvents.REQUEST_SAVE_CURSOR,
    REQUEST_SAVE_CONTENT: CoreEvents.REQUEST_SAVE_CONTENT,
    SYNC_EDITOR_CONTENT: CoreEvents.SYNC_EDITOR_CONTENT,
    SYNC_EDITOR_CONTENT_INTERNAL: CoreEvents.SYNC_EDITOR_CONTENT_INTERNAL,
    EDITOR_FOCUS: CoreEvents.EDITOR_FOCUS,
    EDITOR_REVEAL_RANGE: CoreEvents.EDITOR_REVEAL_RANGE,
    CREATE_UNTITLED_TAB: CoreEvents.CREATE_UNTITLED_TAB,
    PREVIEW_IMAGE: CoreEvents.PREVIEW_IMAGE,

    // ─── 保存相关 ────────────────────────────────────────
    SAVE_FILE: CoreEvents.APP_CMD_SAVE,
    SAVE_AS: CoreEvents.APP_CMD_SAVE_AS,
    SAVE_ALL: CoreEvents.SAVE_ALL_FILES,
    SAVE_FILE_REQUEST: CoreEvents.SAVE_FILE_REQUEST,
    FILE_SAVED: CoreEvents.FILE_SAVED,

    // ─── 文件交互命令 ────────────────────────────────────
    NEW_FILE: CoreEvents.APP_CMD_NEW_FILE,
    OPEN_FILE_CMD: CoreEvents.APP_CMD_OPEN_FILE,

    // ─── 视图控制 ────────────────────────────────────────
    TOGGLE_SPLIT_VIEW: CoreEvents.APP_CMD_TOGGLE_SPLIT_VIEW,
    CLOSE_SPLIT_VIEW: CoreEvents.CLOSE_SPLIT_VIEW,

    // ─── 资源管理器交互 ──────────────────────────────────
    REVEAL_IN_EXPLORER: CoreEvents.REVEAL_IN_EXPLORER,
    EXPLORER_SELECT_PATH: CoreEvents.EXPLORER_SELECT_PATH,
    CHECK_TABS_EXISTENCE: CoreEvents.CHECK_TABS_EXISTENCE,
    FILE_MOVED: CoreEvents.FILE_MOVED,

    // ─── 文本操作 ────────────────────────────────────────
    INSERT_TEXT: CoreEvents.EDITOR_INSERT_TEXT,

    // ─── 编辑器状态 ──────────────────────────────────────
    EDITOR_STATE_CHANGED: CoreEvents.EDITOR_STATE_CHANGED,
    DOCUMENT_CHANGED: CoreEvents.DOCUMENT_CHANGED,
    EDITOR_CONTENT_INPUT: CoreEvents.EDITOR_CONTENT_INPUT,

    // ─── UI 触发事件 ─────────────────────────────────────
    TRIGGER_IMAGE_UPLOAD: CoreEvents.TRIGGER_IMAGE_UPLOAD,
    TRIGGER_LINK_MODAL: CoreEvents.TRIGGER_LINK_MODAL,

    // ─── 生命周期事件 ────────────────────────────────────
    MAIN_VIEW_READY: CoreEvents.MAIN_VIEW_READY,
    LIFECYCLE_SWITCHING_START: CoreEvents.LIFECYCLE_SWITCHING_START,
    LIFECYCLE_FILE_LOADED: CoreEvents.LIFECYCLE_FILE_LOADED,
    LIFECYCLE_SWITCHING_FAILED: CoreEvents.LIFECYCLE_SWITCHING_FAILED,
    TOOLBAR_STATE_CHANGED: CoreEvents.TOOLBAR_STATE_CHANGED,
} as const;

