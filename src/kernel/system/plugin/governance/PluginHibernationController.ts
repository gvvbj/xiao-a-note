import type { ILogger } from '@/kernel/services/LoggerService';
import type { IPlugin } from '../types';

export interface IPluginHibernationControllerHooks {
    getActivePluginIds(): Iterable<string>;
    getPlugin(pluginId: string): IPlugin | undefined;
    deactivatePlugin(pluginId: string): void;
    requeuePlugin(plugin: IPlugin): void;
}

export interface IPluginHibernationControllerOptions {
    intervalMs?: number;
    now?: () => number;
}

export class PluginHibernationController {
    private lastActiveMap = new Map<string, number>();
    private timer: NodeJS.Timeout | null = null;
    private readonly intervalMs: number;
    private readonly now: () => number;

    constructor(
        private readonly logger: ILogger,
        private readonly hooks: IPluginHibernationControllerHooks,
        options: IPluginHibernationControllerOptions = {},
    ) {
        this.intervalMs = options.intervalMs ?? 60000;
        this.now = options.now ?? (() => Date.now());
    }

    recordActivity(pluginId: string): void {
        this.lastActiveMap.set(pluginId, this.now());
    }

    clearActivity(pluginId: string): void {
        this.lastActiveMap.delete(pluginId);
    }

    start(): void {
        this.stop();
        this.timer = setInterval(() => {
            this.runOnce();
        }, this.intervalMs);
    }

    stop(): void {
        if (!this.timer) {
            return;
        }
        clearInterval(this.timer);
        this.timer = null;
    }

    runOnce(now: number = this.now()): string[] {
        const toHibernate: string[] = [];

        for (const pluginId of this.hooks.getActivePluginIds()) {
            const plugin = this.hooks.getPlugin(pluginId);
            if (!plugin || plugin.essential || !plugin.hibernationTimeout) {
                continue;
            }

            const lastActive = this.lastActiveMap.get(pluginId) ?? 0;
            if (now - lastActive > plugin.hibernationTimeout) {
                toHibernate.push(pluginId);
            }
        }

        toHibernate.forEach((pluginId) => {
            this.logger.info(`Plugin ${pluginId} has been idle. Hibernating to save memory...`);
            this.hooks.deactivatePlugin(pluginId);

            const plugin = this.hooks.getPlugin(pluginId);
            if (plugin?.lazy) {
                this.hooks.requeuePlugin(plugin);
            }
        });

        return toHibernate;
    }
}
