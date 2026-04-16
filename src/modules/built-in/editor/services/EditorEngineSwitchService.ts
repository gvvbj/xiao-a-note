import { CoreEvents } from '@/kernel/core/Events';
import { Kernel } from '@/kernel/core/Kernel';
import { ServiceId } from '@/kernel/core/ServiceId';
import { IEditorState } from '@/kernel/interfaces/IEditorService';
import { EditorService } from '@/kernel/services/EditorService';
import { SettingsService } from '@/kernel/services/SettingsService';
import type { IPlugin } from '@/kernel/system/plugin/types';
import { PluginManager } from '@/kernel/system/plugin/PluginManager';
import { SystemModuleRegistry } from '@/kernel/system/plugin/SystemModuleRegistry';
import { EDITOR_CONSTANTS } from '../constants/EditorConstants';
import {
    ENGINE_CONFLICT_GROUP,
    ENGINE_PLUGIN_ID_PREFIX,
    ENGINE_UI_CONFLICT_GROUP,
    ENGINE_UI_PLUGIN_ID_PREFIX,
} from '../engines/core/EnginePluginConstants';

interface IEngineSettings {
    engine?: string;
}

interface ISwitchOptions {
    persist?: boolean;
    silent?: boolean;
}

interface IEngineTransactionSnapshot {
    editorState: IEditorState;
    previousEnginePluginId: string | null;
    pluginActiveStates: Record<string, boolean>;
}

const DEFAULT_ENGINE_ID = 'codemirror';

export class EditorEngineSwitchService {
    private readonly kernel: Kernel;

    constructor(kernel: Kernel) {
        this.kernel = kernel;
    }

    init(): void {
        const configured = this.getConfiguredEngineId();
        this.switchEngine(configured, { persist: false, silent: true }).catch(() => {
            // 启动期容错：保持现有引擎，不阻塞应用启动。
            void this.ensureAtLeastOneEngineActive();
        });
    }

    getConfiguredEngineId(): string {
        const settings = this.getSettingsService();
        return settings?.getSetting<string>('editor.engine', DEFAULT_ENGINE_ID) ?? DEFAULT_ENGINE_ID;
    }

    async switchEngine(targetEngineId: string, options: ISwitchOptions = {}): Promise<void> {
        const targetPluginId = this.resolveEnginePluginId(targetEngineId);
        if (!targetPluginId) {
            throw new Error(`[EditorEngineSwitchService] Unknown engine id: ${targetEngineId}`);
        }

        const pluginManager = this.getPluginManager();
        const targetPlugin = pluginManager.getPlugins().find(plugin => plugin.id === targetPluginId);
        if (!targetPlugin) {
            throw new Error(`[EditorEngineSwitchService] Engine plugin not found: ${targetPluginId}`);
        }

        const activeEnginePlugins = this.getActiveEnginePlugins(pluginManager);
        const previousEnginePlugin = activeEnginePlugins[0] ?? null;

        if (previousEnginePlugin?.id === targetPluginId) {
            this.injectRuntimeModules(targetPlugin);
            if (options.persist !== false) {
                this.persistEngineChoice(targetEngineId);
            }
            return;
        }

        const snapshot = this.captureSnapshot(previousEnginePlugin?.id ?? null, pluginManager);
        const previousEngineId = previousEnginePlugin
            ? (this.extractEngineIdFromPlugin(previousEnginePlugin) ?? DEFAULT_ENGINE_ID)
            : null;

        try {
            this.prepareForSwitch(snapshot);
            if (previousEngineId) {
                pluginManager.saveCurrentActiveStatesForEngine(previousEngineId);
            }

            if (previousEnginePlugin) {
                pluginManager.deactivatePlugin(previousEnginePlugin.id);
            }

            await pluginManager.activatePlugin(targetPluginId);
            if (!pluginManager.isPluginActive(targetPluginId)) {
                throw new Error(`[EditorEngineSwitchService] Failed to activate target plugin: ${targetPluginId}`);
            }

            this.injectRuntimeModules(targetPlugin);
            await this.orchestratePluginsForTargetEngine(pluginManager, targetEngineId, targetPluginId, options);
            this.restoreSnapshot(snapshot);

            if (options.persist !== false) {
                this.persistEngineChoice(targetEngineId);
            }
        } catch (error) {
            try {
                await this.rollback(pluginManager, snapshot, targetPluginId, targetEngineId);
            } catch {
                // 回滚失败时保留原始切换异常，避免覆盖上层问题定位。
            }
            throw error;
        }
    }

    private getPluginManager(): PluginManager {
        return this.kernel.getService<PluginManager>(ServiceId.PLUGIN_MANAGER);
    }

    private getEditorService(): EditorService | undefined {
        return this.kernel.getService<EditorService>(ServiceId.EDITOR, false);
    }

    private getSettingsService(): SettingsService | undefined {
        return this.kernel.getService<SettingsService>(ServiceId.SETTINGS, false);
    }

    private resolveEnginePluginId(engineId: string): string | null {
        const pluginManager = this.getPluginManager();
        return this.resolvePluginIdByEngine(pluginManager, engineId, ENGINE_CONFLICT_GROUP, ENGINE_PLUGIN_ID_PREFIX);
    }

    private resolveEngineUIPluginId(engineId: string, pluginManager: PluginManager): string | null {
        return this.resolvePluginIdByEngine(
            pluginManager,
            engineId,
            ENGINE_UI_CONFLICT_GROUP,
            ENGINE_UI_PLUGIN_ID_PREFIX
        );
    }

    private resolvePluginIdByEngine(
        pluginManager: PluginManager,
        engineId: string,
        conflictGroup: string,
        pluginIdPrefix: string
    ): string | null {
        const normalizedEngineId = engineId.trim().toLowerCase();
        const byConventionId = `${pluginIdPrefix}${normalizedEngineId}`;
        const plugins = pluginManager
            .getPlugins()
            .filter(plugin => plugin.conflictGroup === conflictGroup);

        const byConvention = plugins.find(plugin => plugin.id === byConventionId);
        if (byConvention) {
            return byConvention.id;
        }

        const byExtractedId = plugins.find(plugin => {
            if (!plugin.id.startsWith(pluginIdPrefix)) {
                return false;
            }
            const extractedEngineId = plugin.id.slice(pluginIdPrefix.length).trim().toLowerCase();
            return extractedEngineId === normalizedEngineId;
        });
        return byExtractedId?.id ?? null;
    }

    private extractEngineIdFromPlugin(plugin: IPlugin): string | null {
        const normalized = plugin.id.startsWith(ENGINE_PLUGIN_ID_PREFIX)
            ? plugin.id.slice(ENGINE_PLUGIN_ID_PREFIX.length)
            : plugin.id;
        return normalized || null;
    }

    private getActiveEnginePlugins(pluginManager: PluginManager): IPlugin[] {
        return pluginManager
            .getPlugins()
            .filter(plugin => plugin.conflictGroup === ENGINE_CONFLICT_GROUP && pluginManager.isPluginActive(plugin.id));
    }

    private captureSnapshot(
        previousEnginePluginId: string | null,
        pluginManager: PluginManager
    ): IEngineTransactionSnapshot {
        const editorService = this.getEditorService();
        const pluginActiveStates: Record<string, boolean> = {};
        pluginManager.getPlugins().forEach(plugin => {
            pluginActiveStates[plugin.id] = pluginManager.isPluginActive(plugin.id);
        });

        return {
            editorState: editorService?.getState() ?? {
                currentFileId: null,
                isUnsaved: false,
                headingNumbering: false,
                saveAsDialogOpen: false,
                viewMode: 'preview',
            },
            previousEnginePluginId,
            pluginActiveStates,
        };
    }

    private prepareForSwitch(snapshot: IEngineTransactionSnapshot): void {
        if (snapshot.editorState.currentFileId) {
            this.kernel.emit(CoreEvents.REQUEST_SAVE_CURSOR, snapshot.editorState.currentFileId);
            this.kernel.emit(CoreEvents.REQUEST_SAVE, snapshot.editorState.currentFileId);
        } else {
            this.kernel.emit(CoreEvents.REQUEST_SAVE);
        }
    }

    private restoreSnapshot(snapshot: IEngineTransactionSnapshot): void {
        const editorService = this.getEditorService();
        if (!editorService) {
            return;
        }

        editorService.setHeadingNumbering(snapshot.editorState.headingNumbering);
        editorService.setViewMode(snapshot.editorState.viewMode);
        editorService.setSaveAsDialogOpen(snapshot.editorState.saveAsDialogOpen);

        if (snapshot.editorState.currentFileId) {
            this.kernel.emit(CoreEvents.OPEN_FILE, snapshot.editorState.currentFileId);
        } else {
            editorService.setCurrentFile(null);
        }
    }

    private injectRuntimeModules(plugin: IPlugin): void {
        if (typeof plugin.getRuntimeModules !== 'function') {
            return;
        }
        const runtimeModules = plugin.getRuntimeModules();
        if (!runtimeModules || Object.keys(runtimeModules).length === 0) {
            return;
        }
        SystemModuleRegistry.registerRuntimeModules(runtimeModules);
    }

    private persistEngineChoice(targetEngineId: string): void {
        const settings = this.getSettingsService();
        const updates: Partial<IEngineSettings> = { engine: targetEngineId };
        settings?.updateSettings<IEngineSettings>('editor', updates);
    }

    private async orchestratePluginsForTargetEngine(
        pluginManager: PluginManager,
        targetEngineId: string,
        targetEnginePluginId: string,
        options: ISwitchOptions
    ): Promise<void> {
        const scopedStates = pluginManager.getPluginStatesForEngine(targetEngineId);
        const hasExplicitScopedState = Object.keys(scopedStates).length > 0;
        const targetEngineUIPluginId = this.resolveEngineUIPluginId(targetEngineId, pluginManager);
        const autoDisabledIncompatible: string[] = [];

        for (const plugin of pluginManager.getPlugins()) {
            if (plugin.id === targetEnginePluginId) {
                scopedStates[plugin.id] = true;
                continue;
            }

            // editor-engine 组由引擎切换事务负责，不参与通用兼容编排。
            if (plugin.conflictGroup === ENGINE_CONFLICT_GROUP) {
                scopedStates[plugin.id] = pluginManager.isPluginActive(plugin.id);
                continue;
            }

            if (plugin.conflictGroup === ENGINE_UI_CONFLICT_GROUP) {
                const compatible = pluginManager.isPluginCompatibleWithEngine(plugin, targetEngineId);
                const isActive = pluginManager.isPluginActive(plugin.id);

                if (!compatible) {
                    if (isActive) {
                        pluginManager.deactivatePlugin(plugin.id);
                    }
                    scopedStates[plugin.id] = false;
                    continue;
                }

                const hasScopedState = Object.prototype.hasOwnProperty.call(scopedStates, plugin.id);
                const shouldActivate = hasExplicitScopedState && hasScopedState
                    ? scopedStates[plugin.id] === true
                    : plugin.id === targetEngineUIPluginId;

                if (shouldActivate && !isActive) {
                    await pluginManager.activatePlugin(plugin.id);
                    if (!pluginManager.isPluginActive(plugin.id)) {
                        throw new Error(`[EditorEngineSwitchService] Failed to reactivate plugin: ${plugin.id}`);
                    }
                } else if (!shouldActivate && isActive) {
                    pluginManager.deactivatePlugin(plugin.id);
                }

                scopedStates[plugin.id] = shouldActivate;
                continue;
            }

            const compatible = pluginManager.isPluginCompatibleWithEngine(plugin, targetEngineId);
            const isActive = pluginManager.isPluginActive(plugin.id);

            if (!compatible) {
                if (isActive) {
                    pluginManager.deactivatePlugin(plugin.id);
                    autoDisabledIncompatible.push(plugin.name || plugin.id);
                }
                scopedStates[plugin.id] = false;
                continue;
            }

            if (hasExplicitScopedState && Object.prototype.hasOwnProperty.call(scopedStates, plugin.id)) {
                const shouldActivate = scopedStates[plugin.id] === true;
                if (shouldActivate && !isActive) {
                    await pluginManager.activatePlugin(plugin.id);
                    if (!pluginManager.isPluginActive(plugin.id)) {
                        throw new Error(`[EditorEngineSwitchService] Failed to reactivate plugin: ${plugin.id}`);
                    }
                } else if (!shouldActivate && isActive) {
                    pluginManager.deactivatePlugin(plugin.id);
                }
            } else {
                scopedStates[plugin.id] = isActive;
            }
        }

        pluginManager.savePluginStatesForEngine(targetEngineId, scopedStates);

        if (!options.silent && autoDisabledIncompatible.length > 0) {
            this.kernel.emit(CoreEvents.APP_SHOW_MESSAGE_DIALOG, {
                title: '插件兼容提示',
                message: `切换到 ${targetEngineId} 后，以下插件因不兼容已自动停用：${autoDisabledIncompatible.join('、')}`,
                type: 'info',
            });
        }
    }

    private async rollback(
        pluginManager: PluginManager,
        snapshot: IEngineTransactionSnapshot,
        currentTargetPluginId: string,
        targetEngineId: string
    ): Promise<void> {
        if (!snapshot.previousEnginePluginId) {
            if (!pluginManager.isPluginActive(currentTargetPluginId)) {
                await pluginManager.activatePlugin(currentTargetPluginId);
            }
            if (pluginManager.isPluginActive(currentTargetPluginId)) {
                this.persistEngineChoice(targetEngineId);
            }
            return;
        }

        await this.restorePluginActivationStates(pluginManager, snapshot.pluginActiveStates);
        this.restoreSnapshot(snapshot);

        const restored = pluginManager
            .getPlugins()
            .find(plugin => plugin.id === snapshot.previousEnginePluginId);
        if (restored) {
            this.injectRuntimeModules(restored);
            const restoredEngineId = this.extractEngineIdFromPlugin(restored) ?? DEFAULT_ENGINE_ID;
            this.persistEngineChoice(restoredEngineId);
        }
    }

    private async restorePluginActivationStates(
        pluginManager: PluginManager,
        expectedStates: Record<string, boolean>
    ): Promise<void> {
        for (const plugin of pluginManager.getPlugins()) {
            const shouldBeActive = expectedStates[plugin.id] === true;
            const isActive = pluginManager.isPluginActive(plugin.id);

            if (shouldBeActive && !isActive) {
                await pluginManager.activatePlugin(plugin.id);
            } else if (!shouldBeActive && isActive) {
                pluginManager.deactivatePlugin(plugin.id);
            }
        }
    }

    async ensureAtLeastOneEngineActive(): Promise<boolean> {
        const pluginManager = this.getPluginManager();
        const activeCount = this.getActiveEnginePlugins(pluginManager).length;
        if (activeCount >= 1) {
            return true;
        }

        for (const plugin of pluginManager.getPlugins()) {
            if (plugin.conflictGroup !== ENGINE_CONFLICT_GROUP) {
                continue;
            }
            await pluginManager.activatePlugin(plugin.id);
            if (pluginManager.isPluginActive(plugin.id)) {
                return true;
            }
        }

        return false;
    }
}

export const EDITOR_ENGINE_SWITCH_SERVICE_ID = EDITOR_CONSTANTS.SERVICE_NAMES.ENGINE_SWITCH;
