/**
 * 兼容导出层
 *
 * Phase 2 开始安全子域已拆分至:
 * - security/constants/*
 * - constants/ExtensionLoaderConstants.ts
 *
 * 本文件仅保留兼容导出，避免一次性修改全部引用点。
 */

export { EXTERNAL_PLUGIN_PATHS, MANIFEST_REQUIRED_FIELDS } from './constants/ExtensionLoaderConstants';
export { CIRCUIT_BREAKER_CONFIG } from './security/constants/CircuitBreakerConstants';
export {
    ELEVATION_FIELD,
    HIDDEN_PLUGIN_IDS,
    SECURITY_ERROR_MESSAGES,
    TRUSTED_PATH_PATTERNS,
} from './security/constants/PluginTrustConstants';
export {
    SANDBOX_ALLOWED_EVENTS,
    SANDBOX_ALLOWED_SERVICES,
    SANDBOX_DENIED_SERVICES,
    SANDBOX_EDITOR_ALLOWED_METHODS,
    SANDBOX_FS_ALLOWED_METHODS,
    SANDBOX_PROXIED_SERVICES,
} from './security/constants/SandboxAccessConstants';
