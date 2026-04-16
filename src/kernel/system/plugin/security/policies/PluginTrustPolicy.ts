import { ELEVATION_FIELD, HIDDEN_PLUGIN_IDS, SECURITY_ERROR_MESSAGES, TRUSTED_PATH_PATTERNS } from '../constants/PluginTrustConstants';

interface IPluginSecurityCandidate {
    id: string;
    internal?: boolean;
    hidden?: boolean;
    [ELEVATION_FIELD]?: boolean;
}

export interface IPluginSecurityProfile {
    isTrustedPath: boolean;
    isInternal: boolean;
    shouldHide: boolean;
    pathSpoofingMessage: string | null;
}

export function isTrustedPluginPath(path?: string | null): boolean {
    if (!path) {
        return false;
    }

    const normalizedPath = path.replace(/\\/g, '/');
    return normalizedPath.startsWith('./')
        || normalizedPath.includes(TRUSTED_PATH_PATTERNS.BUILT_IN)
        || normalizedPath.includes(TRUSTED_PATH_PATTERNS.SYNTAX)
        || normalizedPath.includes(TRUSTED_PATH_PATTERNS.PLUGIN_SYSTEM);
}

export function shouldHidePlugin(pluginId: string): boolean {
    return (HIDDEN_PLUGIN_IDS as readonly string[]).includes(pluginId);
}

export function resolvePluginSecurityProfile(
    plugin: IPluginSecurityCandidate,
    path?: string | null
): IPluginSecurityProfile {
    const isTrustedPath = isTrustedPluginPath(path);
    const pathSpoofingDetected = plugin.internal === true && !isTrustedPath;

    return {
        isTrustedPath,
        isInternal: isTrustedPath,
        shouldHide: plugin.hidden === true || shouldHidePlugin(plugin.id),
        pathSpoofingMessage: pathSpoofingDetected ? SECURITY_ERROR_MESSAGES.PATH_SPOOFING_DETECTED : null,
    };
}

export function shouldRequestPluginElevation(plugin: IPluginSecurityCandidate): boolean {
    return plugin.internal !== true && plugin[ELEVATION_FIELD] === true;
}
