import { SettingsService } from '@/kernel/services/SettingsService';

export interface IPluginStateStoreNamespaces {
    legacy: string;
    byEngine: string;
}

export class PluginStateStore {
    constructor(
        private readonly getSettingsService: () => SettingsService | undefined,
        private readonly namespaces: IPluginStateStoreNamespaces,
    ) { }

    loadLegacyStates(): Record<string, boolean> {
        return this.getSettingsService()?.getSettings<Record<string, boolean>>(this.namespaces.legacy) || {};
    }

    loadStatesByEngine(): Record<string, Record<string, boolean>> {
        return this.getSettingsService()?.getSettings<Record<string, Record<string, boolean>>>(this.namespaces.byEngine) || {};
    }

    saveLegacyStates(states: Record<string, boolean>): void {
        this.getSettingsService()?.updateSettings(this.namespaces.legacy, states);
    }

    saveStatesForEngine(engineId: string, states: Record<string, boolean>): void {
        this.getSettingsService()?.updateSettings<Record<string, Record<string, boolean>>>(
            this.namespaces.byEngine,
            { [engineId]: { ...states } },
        );
    }
}
