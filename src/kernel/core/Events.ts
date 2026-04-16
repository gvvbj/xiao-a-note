/**
 * CoreEvents — 全局事件常量注册表
 *
 * 这是所有跨模块事件的唯一真相源 (Single Source of Truth)。
 * 所有事件 ID 必须在此处定义，禁止在其他位置使用字符串字面量。
 *
 * 命名规范：
 *   - 命名空间用冒号分隔，例如 'editor:xxx'、'app:xxx'、'fs:xxx'
 *   - 常量名使用 UPPER_SNAKE_CASE
 *
 * 注意：部分事件字符串值为历史遗留格式，修改它们会导致运行时中断。
 *       请勿随意修改已有事件的字符串值。
 */
export const CoreEvents = {
    // ─── 系统事件 ────────────────────────────────────────
    READY: 'READY',
    UI_UPDATED: 'UI_UPDATED',

    // ─── 编辑器核心事件 ───────────────────────────────────
    EDITOR_STATE_CHANGED: 'editor:state_changed',
    DOCUMENT_CHANGED: 'editor:document_changed',
    VIEW_READY: 'editor:view_ready',
    EDITOR_FOCUS: 'editor:focus',
    EDITOR_SCROLL_TO_LINE: 'editor:scroll_to_line',
    EDITOR_REVEAL_RANGE: 'editor:reveal_range',
    EDITOR_INSERT_TEXT: 'editor:insert_text',
    EDITOR_SELECT_MATCH: 'editor:select_match',
    EDITOR_CONTENT_INPUT: 'editor:content_input',
    CURSOR_ACTIVITY: 'editor:cursor_activity',
    EDITOR_REQUEST_REFRESH: 'editor:request_refresh',
    TOOLBAR_STATE_CHANGED: 'editor:toolbar_state_changed',

    // ─── 编辑器生命周期事件 ──────────────────────────────
    MAIN_VIEW_READY: 'editor:main_view_ready',
    PREVIEW_VIEW_READY: 'editor:preview_view_ready',
    LIFECYCLE_SWITCHING_START: 'editor:lifecycle_switching_start',
    LIFECYCLE_FILE_LOADED: 'editor:lifecycle_file_loaded',
    LIFECYCLE_SWITCHING_FAILED: 'editor:lifecycle_switching_failed',

    // ─── 分屏视图事件 ────────────────────────────────────
    SPLIT_VIEW_CHANGED: 'split_view:changed',
    SPLIT_VIEW_TRANSITION_START: 'split_view:transition_start',

    // ─── 文件操作事件 ────────────────────────────────────
    OPEN_FILE: 'editor:open_file',
    REQUEST_SAVE: 'editor:request_save',
    REQUEST_SAVE_CURSOR: 'editor:request_save_cursor',
    REQUEST_SAVE_CONTENT: 'editor:request_save_content',
    SAVE_FILE_REQUEST: 'editor:save_file_request',
    SAVE_CURSOR_BEFORE_SWITCH: 'editor:save_cursor_before_switch',
    FILE_SAVED: 'editor:file_saved',
    SYNC_EDITOR_CONTENT: 'editor:sync_content',
    EDITOR_SYNC_CONTENT: 'editor:sync_content_broadcast',
    SYNC_EDITOR_CONTENT_INTERNAL: 'editor:sync_content_internal',
    CREATE_UNTITLED_TAB: 'editor:create_untitled_tab',
    SAVE_ALL_FILES: 'editor:save_all_files',

    // ─── UI 触发事件 ─────────────────────────────────────
    TRIGGER_IMAGE_UPLOAD: 'editor:trigger_image_upload',
    TRIGGER_LINK_MODAL: 'editor:trigger_link_modal',
    PREVIEW_IMAGE: 'editor:preview_image',

    // ─── 分屏/视图事件 ───────────────────────────────────
    SPLIT_VIEW_TAB: 'split_view:tab',
    CLOSE_SPLIT_VIEW: 'split_view:close',
    TOGGLE_SPLIT_VIEW: 'split_view:toggle',

    // ─── 应用命令事件 ────────────────────────────────────
    APP_CMD_NEW_FILE: 'app:cmd_new_file',
    APP_CMD_OPEN_FILE: 'app:cmd_open_file',
    APP_CMD_SAVE: 'app:cmd_save',
    APP_CMD_SAVE_AS: 'app:cmd_save_as',
    APP_CMD_TOGGLE_ZEN_MODE: 'app:cmd_toggle_zen_mode',
    APP_CMD_TOGGLE_SIDEBAR: 'app:cmd_toggle_sidebar',
    APP_CMD_TOGGLE_SPLIT_VIEW: 'app:cmd_toggle_split_view',
    APP_CMD_EXPORT_PDF: 'app:cmd_export_pdf',
    APP_CMD_EXPORT_WORD: 'app:cmd_export_word',
    APP_CMD_TOGGLE_THEME: 'app:cmd_toggle_theme',
    APP_CLEAR_STATE: 'app:clear_state',

    // ─── 文件系统事件 ────────────────────────────────────
    FS_FILE_CHANGED: 'fs:file_changed',
    FS_FILE_CREATED: 'fs:file_created',
    FS_FILE_DELETED: 'fs:file_deleted',
    FILE_MOVED: 'fs:file_moved',
    FILE_OVERWRITTEN: 'fs:file_overwritten',

    // ─── 标签页事件 ──────────────────────────────────────
    TABS_CHANGED: 'TABS_CHANGED',
    CHECK_TABS_EXISTENCE: 'tabs:check_existence',
    TAB_DIRTY_COUNT_CHANGED: 'tabs:dirty_count_changed',

    // ─── 资源管理器事件 ──────────────────────────────────
    EXPLORER_CHANGED: 'EXPLORER_CHANGED',
    EXPLORER_SELECT_PATH: 'explorer:select_path',
    EXPLORER_CREATE_FILE: 'explorer:create_file',
    EXPLORER_CREATE_FOLDER: 'explorer:create_folder',
    EXPLORER_SET_FILE_TREE: 'explorer:set_file_tree',
    REVEAL_IN_EXPLORER: 'explorer:reveal',

    // ─── 内核服务本地事件（历史遗留大写事件名） ──────────────
    EDITOR_CHANGED: 'EDITOR_CHANGED',
    LAYOUT_CHANGED: 'LAYOUT_CHANGED',
    ZEN_MODE_CHANGED: 'ZEN_MODE_CHANGED',
    OUTLINE_CHANGED: 'OUTLINE_CHANGED',
    MENU_UPDATED: 'MENU_UPDATED',
    THEME_CHANGED: 'THEME_CHANGED',
    THEME_LIST_CHANGED: 'THEME_LIST_CHANGED',

    // ─── 工作区事件 ──────────────────────────────────────
    WORKSPACE_CHANGED: 'workspace:changed',
    WORKSPACE_PROJECT_ROOT_CHANGED: 'workspace:project_root_changed',
    WORKSPACE_SELECTED_FILE_CHANGED: 'workspace:selected_file_changed',
    WORKSPACE_DIRTY_STATE_CHANGED: 'workspace:dirty_state_changed',

    // ─── 插件系统事件 ────────────────────────────────────
    PLUGIN_TRIPPED: 'plugin:tripped',
    PLUGIN_REQUEST_AUTH: 'plugin:request_auth',
    PLUGIN_AUTH_RESPONSE: 'plugin:auth_response',

    // ─── 设置事件 ────────────────────────────────────────
    SETTING_CHANGED: 'settings:changed',

    // ─── 对话框事件 ──────────────────────────────────────
    APP_SHOW_AUTO_SAVE_DIALOG: 'app:show_auto_save_dialog',
    APP_SHOW_SHORTCUT_DIALOG: 'app:show_shortcut_dialog',
    APP_SHOW_MESSAGE_DIALOG: 'app:show_message_dialog',
    APP_SHOW_SAVE_CONFIRM_DIALOG: 'app:show_save_confirm_dialog',
    APP_SHOW_SETTINGS_DIALOG: 'app:show_settings_dialog',
} as const;

