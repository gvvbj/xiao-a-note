/**
 * ServiceId — 全局服务 ID 常量注册表
 *
 * 这是所有服务标识符的唯一真相源 (Single Source of Truth)。
 * 所有 registerService / getService 调用必须使用此处定义的常量，
 * 禁止使用字符串字面量。
 *
 * 命名规范：
 *   - 常量名使用 UPPER_SNAKE_CASE
 *   - 值为 camelCase 字符串（与现有注册保持一致）
 */
export const ServiceId = {
    // ─── 核心平台服务 ──────────────────────────────────
    FILE_SYSTEM: 'fileSystem',
    WINDOW: 'window',
    SETTINGS: 'settingsService',
    LAYOUT: 'layoutService',
    MENU: 'menuService',
    THEME: 'themeService',
    TAB: 'tabService',
    EXPLORER: 'explorerService',
    EDITOR: 'editorService',
    OUTLINE: 'outlineService',
    WORKSPACE: 'workspaceService',
    LOGGER: 'loggerService',
    MARKDOWN: 'markdownService',
    PLUGIN_MANAGER: 'pluginManager',

    // ─── 编辑器基础设施 ────────────────────────────────
    COMMAND_REGISTRY: 'commandRegistry',
    EDITOR_EXTENSION_REGISTRY: 'editorExtensionRegistry',
    EDITOR_PANEL_REGISTRY: 'editorPanelRegistry',
    EDITOR_TOOLBAR_REGISTRY: 'editorToolbarRegistry',
    MARKDOWN_DECORATION_REGISTRY: 'markdownDecorationRegistry',
    SHORTCUT_REGISTRY: 'shortcutRegistry',
    EDITOR_ENGINE: 'editorEngine',
    EDITOR_ACTIONS: 'editorActionsService',
    WORKSPACE_ACTIONS: 'workspaceActionsService',
    UI_ACTIONS: 'uiActionsService',
    AI_CAPABILITY_POLICY: 'aiCapabilityPolicyService',
    AI_CONTEXT: 'aiContextService',
    AI_TASK: 'aiTaskService',

    // ─── 插件注册的动态服务 ────────────────────────────
    SPLIT_VIEW: 'splitViewService',
    LIFECYCLE: 'lifecycleService',
    PERSISTENCE: 'persistenceService',
    NOTE: 'noteService',
    EDITOR_SYNC: 'editor.sync',
    EDITOR_EXPORT: 'editorExportService',
    ASSET_TRANSFORMER: 'assetTransformer',
    SETTINGS_REGISTRY: 'settingsRegistry',
    COMMON_CONTENT: 'built-in.common.content',
    COMMON_UTILS_LOGGER: 'common-utils.logger',
    WORKSPACE_FACADE: 'workspace',
} as const;

/** ServiceId 值的联合类型 */
export type ServiceIdType = typeof ServiceId[keyof typeof ServiceId];
