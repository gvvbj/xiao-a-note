import { Kernel } from '@/kernel/core/Kernel';
import { ServiceId } from '@/kernel/core/ServiceId';
import {
    AICapability,
    AICapabilityId,
    IAICapabilityPolicyService
} from '@/kernel/interfaces/IAICapabilityPolicyService';
import type { IPlugin } from '@/kernel/system/plugin/types';
import type { PluginManager } from '@/kernel/system/plugin/PluginManager';
import { loggerService } from './LoggerService';

const logger = loggerService.createLogger('AICapabilityPolicyService');

const EXTERNAL_DENIED_CAPABILITIES = new Set<AICapability>([
    AICapabilityId.EDITOR_WRITE_ACTIVE,
    AICapabilityId.WORKSPACE_CHANGE_APPLY,
    AICapabilityId.UI_ACTION_EXECUTE,
]);

export class AICapabilityPolicyService implements IAICapabilityPolicyService {
    constructor(private readonly kernel: Kernel) {}

    hasCapability(pluginId: string, capability: AICapability): boolean {
        return this.listCapabilities(pluginId).includes(capability);
    }

    assertCapability(pluginId: string, capability: AICapability): void {
        if (!this.hasCapability(pluginId, capability)) {
            throw new Error(`AI capability denied: plugin "${pluginId}" cannot access "${capability}"`);
        }
    }

    listCapabilities(pluginId: string): AICapability[] {
        const plugin = this.resolvePlugin(pluginId);
        if (!plugin) {
            logger.warn(`Plugin "${pluginId}" not found when resolving AI capabilities.`);
            return [];
        }

        const declared = Array.from(new Set(plugin.aiCapabilities ?? []));
        if (declared.length === 0) {
            return [];
        }

        if (plugin.internal === true) {
            return declared;
        }

        return declared.filter(capability => !EXTERNAL_DENIED_CAPABILITIES.has(capability));
    }

    private resolvePlugin(pluginId: string): IPlugin | undefined {
        const pluginManager = this.kernel.getService<PluginManager>(ServiceId.PLUGIN_MANAGER, false);
        if (!pluginManager) {
            logger.warn('PluginManager is not available when resolving AI capabilities.');
            return undefined;
        }

        return pluginManager.getPlugins().find(plugin => plugin.id === pluginId);
    }
}

