/**
 * 测试范围：EditorEngineSwitchService 引擎切换事务与回滚
 * 测试类型：集成/回归
 * 测试目的：防止引擎切换流程破坏现有编辑会话与引擎激活状态
 * 防回归问题：T8（B2.1-B2.4）+ B2.5/B2.6（异步保护与动态引擎解析）+ D9（engine-ui 互斥编排）
 * 关键不变量：
 * - 切换成功后目标引擎处于激活态，配置持久化为目标引擎
 * - 切换失败后恢复原引擎激活态，配置回滚为原引擎
 * - 切换后按兼容策略停用不兼容插件，并按目标引擎快照恢复兼容插件
 * - 任意时刻至少一个 editor-engine 激活
 * 边界说明：
 * - 不覆盖 UI 层切换入口（T9 范围）
 * 依赖与限制（如有）：
 * - 通过最小 PluginManager mock 聚焦切换事务逻辑
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CoreEvents } from '@/kernel/core/Events';
import { Kernel } from '@/kernel/core/Kernel';
import { ServiceId } from '@/kernel/core/ServiceId';
import { IEditorState } from '@/kernel/interfaces/IEditorService';
import { EditorEngineSwitchService } from '@/modules/built-in/editor/services/EditorEngineSwitchService';
import { SystemModuleRegistry } from '@/kernel/system/plugin/SystemModuleRegistry';
import { PluginCategory } from '@/kernel/system/plugin/types';

interface IPluginLike {
    id: string;
    name?: string;
    category?: PluginCategory;
    supportedEngines?: string[];
    conflictGroup?: string;
    getRuntimeModules?: () => Record<string, unknown>;
}

class PluginManagerMock {
    public readonly plugins: IPluginLike[];
    public readonly active = new Set<string>();
    public readonly engineStates: Record<string, Record<string, boolean>> = {};
    public readonly compatibilityMatrix: Record<string, Record<string, boolean>>;
    public readonly activatePlugin = vi.fn(async (id: string) => {
        this.active.add(id);
    });
    public readonly deactivatePlugin = vi.fn((id: string) => {
        this.active.delete(id);
    });
    public readonly saveCurrentActiveStatesForEngine = vi.fn((engineId: string) => {
        const snapshot: Record<string, boolean> = {};
        this.plugins.forEach(plugin => {
            snapshot[plugin.id] = this.active.has(plugin.id);
        });
        this.engineStates[engineId] = snapshot;
    });
    public readonly getPluginStatesForEngine = vi.fn((engineId: string) => {
        return { ...(this.engineStates[engineId] || {}) };
    });
    public readonly savePluginStatesForEngine = vi.fn((engineId: string, states: Record<string, boolean>) => {
        this.engineStates[engineId] = { ...states };
    });
    public readonly isPluginCompatibleWithEngine = vi.fn((pluginOrId: string | IPluginLike, engineId: string) => {
        const pluginId = typeof pluginOrId === 'string' ? pluginOrId : pluginOrId.id;
        const byEngine = this.compatibilityMatrix[engineId] || {};
        if (Object.prototype.hasOwnProperty.call(byEngine, pluginId)) {
            return byEngine[pluginId];
        }
        return true;
    });

    constructor(
        plugins: IPluginLike[],
        activeIds: string[] = [],
        compatibilityMatrix: Record<string, Record<string, boolean>> = {}
    ) {
        this.plugins = plugins;
        this.compatibilityMatrix = compatibilityMatrix;
        activeIds.forEach(id => this.active.add(id));
    }

    getPlugins(): IPluginLike[] {
        return this.plugins;
    }

    isPluginActive(id: string): boolean {
        return this.active.has(id);
    }
}

function registerSettingsMock(kernel: Kernel, configuredEngine = 'codemirror') {
    const settings = {
        getSetting: vi.fn((_key: string, fallback: string) => configuredEngine ?? fallback),
        updateSettings: vi.fn(),
    };
    kernel.registerService(ServiceId.SETTINGS, settings, true);
    return settings;
}

function registerEditorServiceMock(kernel: Kernel, state?: Partial<IEditorState>) {
    const editorState: IEditorState = {
        currentFileId: '/demo.md',
        isUnsaved: false,
        headingNumbering: false,
        saveAsDialogOpen: false,
        viewMode: 'preview',
        ...state,
    };
    const editorService = {
        getState: vi.fn(() => ({ ...editorState })),
        setHeadingNumbering: vi.fn(),
        setViewMode: vi.fn(),
        setSaveAsDialogOpen: vi.fn(),
        setCurrentFile: vi.fn(),
    };
    kernel.registerService(ServiceId.EDITOR, editorService, true);
    return editorService;
}

describe('EditorEngineSwitchService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('切换成功时应激活目标引擎并持久化 editor.engine', async () => {
        const kernel = new Kernel();
        const settings = registerSettingsMock(kernel, 'codemirror');
        registerEditorServiceMock(kernel);

        const runtimeToken = { source: 'cm-state' };
        const pluginManager = new PluginManagerMock([
            {
                id: 'engine-codemirror',
                conflictGroup: 'editor-engine',
                getRuntimeModules: () => ({ '@codemirror/state': runtimeToken }),
            },
        ]);
        kernel.registerService(ServiceId.PLUGIN_MANAGER, pluginManager as unknown as object, true);

        const service = new EditorEngineSwitchService(kernel);
        await service.switchEngine('codemirror');

        expect(pluginManager.activatePlugin).toHaveBeenCalledWith('engine-codemirror');
        expect(pluginManager.isPluginActive('engine-codemirror')).toBe(true);
        expect(settings.updateSettings).toHaveBeenCalledWith('editor', { engine: 'codemirror' });
        expect(SystemModuleRegistry.getModule('@codemirror/state')).toBe(runtimeToken);
    });

    it('切换失败时应回滚到原引擎并恢复配置', async () => {
        const kernel = new Kernel();
        const settings = registerSettingsMock(kernel, 'old');
        registerEditorServiceMock(kernel);

        const pluginManager = new PluginManagerMock(
            [
                { id: 'engine-old', conflictGroup: 'editor-engine' },
                { id: 'engine-codemirror', conflictGroup: 'editor-engine' },
            ],
            ['engine-old']
        );

        pluginManager.activatePlugin.mockImplementation(async (id: string) => {
            if (id === 'engine-codemirror') {
                return;
            }
            pluginManager.active.add(id);
        });

        kernel.registerService(ServiceId.PLUGIN_MANAGER, pluginManager as unknown as object, true);

        const service = new EditorEngineSwitchService(kernel);

        await expect(service.switchEngine('codemirror')).rejects.toThrow(/Failed to activate target plugin/);

        expect(pluginManager.isPluginActive('engine-old')).toBe(true);
        expect(settings.updateSettings).toHaveBeenCalledWith('editor', { engine: 'old' });
    });

    it('兼容编排阶段失败时应回滚插件激活态并保持状态一致', async () => {
        const kernel = new Kernel();
        const settings = registerSettingsMock(kernel, 'old');
        registerEditorServiceMock(kernel);

        const messageHandler = vi.fn();
        kernel.on(CoreEvents.APP_SHOW_MESSAGE_DIALOG, messageHandler);

        const pluginManager = new PluginManagerMock(
            [
                { id: 'engine-old', conflictGroup: 'editor-engine' },
                { id: 'engine-prosemirror', conflictGroup: 'editor-engine' },
                { id: 'editor-a', name: 'Editor A', category: PluginCategory.EDITOR },
                { id: 'editor-b', name: 'Editor B', category: PluginCategory.EDITOR },
            ],
            ['engine-old', 'editor-a'],
            {
                prosemirror: {
                    'editor-a': false,
                    'editor-b': true,
                },
            }
        );
        pluginManager.savePluginStatesForEngine('prosemirror', {
            'editor-b': true,
        });

        pluginManager.activatePlugin.mockImplementation(async (id: string) => {
            if (id === 'editor-b') {
                return;
            }
            pluginManager.active.add(id);
        });

        kernel.registerService(ServiceId.PLUGIN_MANAGER, pluginManager as unknown as object, true);

        const service = new EditorEngineSwitchService(kernel);
        await expect(service.switchEngine('prosemirror')).rejects.toThrow(/Failed to reactivate plugin: editor-b/);

        expect(pluginManager.isPluginActive('engine-old')).toBe(true);
        expect(pluginManager.isPluginActive('engine-prosemirror')).toBe(false);
        expect(pluginManager.isPluginActive('editor-a')).toBe(true);
        expect(pluginManager.isPluginActive('editor-b')).toBe(false);
        expect(settings.updateSettings).toHaveBeenCalledWith('editor', { engine: 'old' });
        expect(messageHandler).not.toHaveBeenCalled();
    });

    it('无激活引擎时应自动拉起至少一个 editor-engine', async () => {
        const kernel = new Kernel();
        registerSettingsMock(kernel, 'codemirror');
        registerEditorServiceMock(kernel);

        const pluginManager = new PluginManagerMock([
            { id: 'engine-codemirror', conflictGroup: 'editor-engine' },
        ]);
        kernel.registerService(ServiceId.PLUGIN_MANAGER, pluginManager as unknown as object, true);

        const service = new EditorEngineSwitchService(kernel);
        const ok = await service.ensureAtLeastOneEngineActive();

        expect(ok).toBe(true);
        expect(pluginManager.isPluginActive('engine-codemirror')).toBe(true);
    });

    it('应通过命名约定动态解析 engine-{id} 插件并完成切换', async () => {
        const kernel = new Kernel();
        const settings = registerSettingsMock(kernel, 'prosemirror');
        registerEditorServiceMock(kernel);

        const pluginManager = new PluginManagerMock([
            { id: 'engine-prosemirror', conflictGroup: 'editor-engine' },
        ]);
        kernel.registerService(ServiceId.PLUGIN_MANAGER, pluginManager as unknown as object, true);

        const service = new EditorEngineSwitchService(kernel);
        await service.switchEngine('prosemirror');

        expect(pluginManager.activatePlugin).toHaveBeenCalledWith('engine-prosemirror');
        expect(pluginManager.isPluginActive('engine-prosemirror')).toBe(true);
        expect(settings.updateSettings).toHaveBeenCalledWith('editor', { engine: 'prosemirror' });
    });

    it('切换后应停用不兼容插件并按目标引擎快照恢复兼容插件', async () => {
        const kernel = new Kernel();
        registerSettingsMock(kernel, 'prosemirror');
        registerEditorServiceMock(kernel);

        const messageHandler = vi.fn();
        kernel.on(CoreEvents.APP_SHOW_MESSAGE_DIALOG, messageHandler);

        const pluginManager = new PluginManagerMock(
            [
                { id: 'engine-codemirror', name: 'CodeMirror', conflictGroup: 'editor-engine' },
                { id: 'engine-prosemirror', name: 'ProseMirror', conflictGroup: 'editor-engine' },
                { id: 'editor-a', name: 'Editor A', category: PluginCategory.EDITOR },
                { id: 'editor-b', name: 'Editor B', category: PluginCategory.EDITOR },
                { id: 'ui-c', name: 'UI C', category: PluginCategory.UI },
            ],
            ['engine-codemirror', 'editor-a', 'ui-c'],
            {
                prosemirror: {
                    'editor-a': false,
                    'editor-b': true,
                    'ui-c': false,
                },
            }
        );
        pluginManager.savePluginStatesForEngine('prosemirror', {
            'editor-b': true,
            'ui-c': false,
        });
        kernel.registerService(ServiceId.PLUGIN_MANAGER, pluginManager as unknown as object, true);

        const service = new EditorEngineSwitchService(kernel);
        await service.switchEngine('prosemirror');

        expect(pluginManager.saveCurrentActiveStatesForEngine).toHaveBeenCalledWith('codemirror');
        expect(pluginManager.isPluginActive('editor-a')).toBe(false);
        expect(pluginManager.isPluginActive('editor-b')).toBe(true);
        expect(pluginManager.isPluginActive('ui-c')).toBe(false);
        expect(pluginManager.isPluginActive('engine-prosemirror')).toBe(true);
        expect(messageHandler).toHaveBeenCalledTimes(1);
    });

    it('silent 模式下切换引擎不应弹出兼容治理提示', async () => {
        const kernel = new Kernel();
        registerSettingsMock(kernel, 'prosemirror');
        registerEditorServiceMock(kernel);

        const messageHandler = vi.fn();
        kernel.on(CoreEvents.APP_SHOW_MESSAGE_DIALOG, messageHandler);

        const pluginManager = new PluginManagerMock(
            [
                { id: 'engine-codemirror', conflictGroup: 'editor-engine' },
                { id: 'engine-prosemirror', conflictGroup: 'editor-engine' },
                { id: 'editor-a', category: PluginCategory.EDITOR },
            ],
            ['engine-codemirror', 'editor-a'],
            { prosemirror: { 'editor-a': false } }
        );
        kernel.registerService(ServiceId.PLUGIN_MANAGER, pluginManager as unknown as object, true);

        const service = new EditorEngineSwitchService(kernel);
        await service.switchEngine('prosemirror', { silent: true });

        expect(pluginManager.isPluginActive('editor-a')).toBe(false);
        expect(messageHandler).not.toHaveBeenCalled();
    });

    it('首次切换到目标引擎时应自动激活对应 engine-ui 插件并停用非目标 engine-ui', async () => {
        const kernel = new Kernel();
        registerSettingsMock(kernel, 'prosemirror');
        registerEditorServiceMock(kernel);

        const pluginManager = new PluginManagerMock(
            [
                { id: 'engine-codemirror', conflictGroup: 'editor-engine' },
                { id: 'engine-prosemirror', conflictGroup: 'editor-engine' },
                {
                    id: 'engine-ui-codemirror',
                    conflictGroup: 'editor-engine-ui',
                    category: PluginCategory.UI,
                    supportedEngines: ['codemirror'],
                },
                {
                    id: 'engine-ui-prosemirror',
                    conflictGroup: 'editor-engine-ui',
                    category: PluginCategory.UI,
                    supportedEngines: ['prosemirror'],
                },
            ],
            ['engine-codemirror', 'engine-ui-codemirror'],
            {
                prosemirror: {
                    'engine-ui-codemirror': false,
                    'engine-ui-prosemirror': true,
                },
            }
        );
        kernel.registerService(ServiceId.PLUGIN_MANAGER, pluginManager as unknown as object, true);

        const service = new EditorEngineSwitchService(kernel);
        await service.switchEngine('prosemirror');

        expect(pluginManager.isPluginActive('engine-ui-codemirror')).toBe(false);
        expect(pluginManager.isPluginActive('engine-ui-prosemirror')).toBe(true);
    });

    it('目标引擎存在显式快照时应按快照恢复 engine-ui 状态而非默认自动激活', async () => {
        const kernel = new Kernel();
        registerSettingsMock(kernel, 'codemirror');
        registerEditorServiceMock(kernel);

        const pluginManager = new PluginManagerMock(
            [
                { id: 'engine-codemirror', conflictGroup: 'editor-engine' },
                { id: 'engine-prosemirror', conflictGroup: 'editor-engine' },
                {
                    id: 'engine-ui-codemirror',
                    conflictGroup: 'editor-engine-ui',
                    category: PluginCategory.UI,
                    supportedEngines: ['codemirror'],
                },
                {
                    id: 'engine-ui-prosemirror',
                    conflictGroup: 'editor-engine-ui',
                    category: PluginCategory.UI,
                    supportedEngines: ['prosemirror'],
                },
            ],
            ['engine-prosemirror', 'engine-ui-prosemirror'],
            {
                codemirror: {
                    'engine-ui-codemirror': false,
                    'engine-ui-prosemirror': false,
                },
                prosemirror: {
                    'engine-ui-prosemirror': true,
                },
            }
        );
        pluginManager.savePluginStatesForEngine('codemirror', {
            'engine-ui-codemirror': false,
            'engine-ui-prosemirror': false,
        });
        kernel.registerService(ServiceId.PLUGIN_MANAGER, pluginManager as unknown as object, true);

        const service = new EditorEngineSwitchService(kernel);
        await service.switchEngine('codemirror');

        expect(pluginManager.isPluginActive('engine-ui-codemirror')).toBe(false);
        expect(pluginManager.isPluginActive('engine-ui-prosemirror')).toBe(false);
    });
});
