export const TRUSTED_PATH_PATTERNS = {
    /** 内置插件目录 */
    BUILT_IN: 'modules/built-in/',
    /** 语法扩展目录 */
    SYNTAX: 'modules/syntax/',
    /** 系统核心插件 */
    PLUGIN_SYSTEM: 'kernel/system/plugin/'
} as const;

export const HIDDEN_PLUGIN_IDS = [
    'common-utils',
    'plugin-system'
] as const;

export const SECURITY_ERROR_MESSAGES = {
    PATH_SPOOFING_DETECTED: 'Security: Plugin declared internal=true but path is not trusted. Forcing restricted mode.',
    KERNEL_ACCESS_DENIED: 'Security: Kernel access denied for non-internal plugin.'
} as const;

export const ELEVATION_FIELD = 'requestElevation' as const;
