export const EXTERNAL_PLUGIN_PATHS = {
    /** 外部插件目录名称 (相对于 app.getPath('userData')) */
    PLUGINS_DIR: 'plugins',
    /** 插件清单文件名 */
    MANIFEST_FILE: 'manifest.json',
    /** 插件入口文件名 */
    ENTRY_FILE: 'index.js'
} as const;

export const MANIFEST_REQUIRED_FIELDS = ['id', 'name', 'version', 'main'] as const;
