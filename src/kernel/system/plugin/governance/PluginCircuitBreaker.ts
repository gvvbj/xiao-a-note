import type { ILogger } from '@/kernel/services/LoggerService';

export interface IPluginCircuitBreakerConfig {
    errorWindowMs: number;
    errorThreshold: number;
    cooldownMs: number;
}

export interface IPluginCircuitBreakerRecordOptions {
    essential: boolean;
    error: unknown;
    onTrip: () => void;
}

export class PluginCircuitBreaker {
    private pluginErrorLog = new Map<string, number[]>();
    private trippedPlugins = new Map<string, number>();

    constructor(
        private readonly logger: ILogger,
        private readonly config: IPluginCircuitBreakerConfig,
    ) { }

    recordError(pluginId: string, options: IPluginCircuitBreakerRecordOptions): void {
        const now = Date.now();

        if (options.essential) {
            this.logger.warn(`[CircuitBreaker] Essential plugin ${pluginId} error ignored:`, options.error);
            return;
        }

        const errorLog = this.pluginErrorLog.get(pluginId) || [];
        const validErrors = errorLog.filter((timestamp) => now - timestamp < this.config.errorWindowMs);
        validErrors.push(now);
        this.pluginErrorLog.set(pluginId, validErrors);

        this.logger.warn(
            `[CircuitBreaker] Plugin ${pluginId} error recorded. Count in window: ${validErrors.length}/${this.config.errorThreshold}`
        );

        if (validErrors.length >= this.config.errorThreshold) {
            this.trip(pluginId, options.onTrip);
        }
    }

    isTripped(pluginId: string): boolean {
        const tripTime = this.trippedPlugins.get(pluginId);
        if (!tripTime) return false;

        if (Date.now() - tripTime > this.config.cooldownMs) {
            this.trippedPlugins.delete(pluginId);
            this.pluginErrorLog.delete(pluginId);
            this.logger.info(`[CircuitBreaker] Plugin ${pluginId} cooldown expired. Resetting state.`);
            return false;
        }

        return true;
    }

    private trip(pluginId: string, onTrip: () => void): void {
        this.logger.error(`[CircuitBreaker] Plugin ${pluginId} has exceeded error threshold. Tripping circuit breaker!`);
        this.trippedPlugins.set(pluginId, Date.now());
        onTrip();
    }
}
