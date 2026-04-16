import { CoreEvents } from '@/kernel/core/Events';
import { Kernel, type KernelEvents } from '@/kernel/core/Kernel';
import type { ILogger } from '@/kernel/services/LoggerService';
import type { IPlugin } from '../types';

export interface IPluginLazyActivationCoordinatorHooks {
    getPlugin(pluginId: string): IPlugin | undefined;
    activatePlugin(pluginId: string): void;
    registerStaticCapabilities(plugin: IPlugin): void;
    onPluginActivated?: (pluginId: string) => void;
}

export class PluginLazyActivationCoordinator {
    private pendingPluginIds = new Set<string>();
    private disposers: Array<() => void> = [];

    constructor(
        private readonly kernel: Kernel,
        private readonly logger: ILogger,
        private readonly hooks: IPluginLazyActivationCoordinatorHooks,
    ) { }

    deferPlugin(plugin: IPlugin): void {
        this.pendingPluginIds.add(plugin.id);
        this.hooks.registerStaticCapabilities(plugin);
    }

    hasPendingPlugin(pluginId: string): boolean {
        return this.pendingPluginIds.has(pluginId);
    }

    refreshTriggerListeners(): void {
        this.clearTriggerListeners();

        if (this.pendingPluginIds.size === 0) {
            this.logger.info('No lazy plugins to setup.');
            return;
        }

        this.logger.info(`Setting up lazy activation for ${this.pendingPluginIds.size} plugins...`);

        const handleDocumentChanged = (payload: { content?: string }) => {
            this.checkSyntaxTriggers(payload?.content ?? '');
        };
        this.kernel.on(CoreEvents.DOCUMENT_CHANGED, handleDocumentChanged);
        this.disposers.push(() => {
            this.kernel.off(CoreEvents.DOCUMENT_CHANGED, handleDocumentChanged);
        });

        const eventTriggers = new Map<string, string[]>();

        this.pendingPluginIds.forEach((pluginId) => {
            const trigger = this.hooks.getPlugin(pluginId)?.activationTrigger;
            if (trigger?.type !== 'event') {
                return;
            }

            const eventNames = trigger.eventNames || (trigger.eventName ? [trigger.eventName] : []);
            eventNames.forEach((eventName) => {
                const ids = eventTriggers.get(eventName) || [];
                ids.push(pluginId);
                eventTriggers.set(eventName, ids);
            });
        });

        eventTriggers.forEach((pluginIds, eventName) => {
            const kernelEventName = eventName as keyof KernelEvents;
            const handler = (...args: unknown[]) => {
                this.logger.info(`Event trigger '${eventName}' received. Activating plugins: ${pluginIds.join(', ')}`);
                pluginIds.forEach((pluginId) => {
                    this.activatePendingPlugin(pluginId, false);
                });
                this.kernel.emit(kernelEventName, ...(args as []));
            };

            this.kernel.once(kernelEventName, handler as never);
            this.disposers.push(() => {
                this.kernel.off(kernelEventName, handler as never);
            });
        });
    }

    activatePendingPlugin(pluginId: string, logWhenMissing: boolean = true): void {
        if (!this.pendingPluginIds.has(pluginId)) {
            if (logWhenMissing) {
                this.logger.warn(`Plugin ${pluginId} is not a pending lazy plugin.`);
            }
            return;
        }

        this.pendingPluginIds.delete(pluginId);
        this.hooks.activatePlugin(pluginId);
        this.hooks.onPluginActivated?.(pluginId);
        this.refreshTriggerListeners();
    }

    requeuePlugin(plugin: IPlugin): void {
        if (plugin.lazy !== true) {
            return;
        }

        this.pendingPluginIds.add(plugin.id);
        this.hooks.registerStaticCapabilities(plugin);
        this.refreshTriggerListeners();
    }

    dispose(): void {
        this.clearTriggerListeners();
        this.pendingPluginIds.clear();
    }

    private checkSyntaxTriggers(content: string): void {
        const toActivate: string[] = [];

        this.pendingPluginIds.forEach((pluginId) => {
            const plugin = this.hooks.getPlugin(pluginId);
            const trigger = plugin?.activationTrigger;
            if (!plugin || !trigger || trigger.type !== 'syntax') {
                return;
            }

            if (trigger.pattern.test(content)) {
                this.logger.info(`Syntax trigger matched for lazy plugin: ${pluginId}`);
                toActivate.push(pluginId);
            }
        });

        toActivate.forEach((pluginId) => {
            this.activatePendingPlugin(pluginId, false);
        });
    }

    private clearTriggerListeners(): void {
        this.disposers.forEach((dispose) => dispose());
        this.disposers = [];
    }
}
