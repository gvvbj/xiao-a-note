/**
 * 测试范围：PluginManager / RestrictedPluginContext / RuntimeModules 关键回归链路
 * 测试类型：集成/回归
 * 测试目的：守护插件系统在冲突管理、熔断、沙箱权限与运行时模块注入上的核心行为不回退
 * 防回归问题：引擎模块注入失效、沙箱能力越权、插件状态持久化错乱
 * 关键不变量：
 * - conflictGroup 互斥激活行为稳定
 * - sandbox 服务访问与事件发射受白名单约束
 * - runtime modules 注入后可被系统查询并消费
 * 边界说明：
 * - 不覆盖 UI 渲染层视觉行为
 * - 不覆盖真实外部插件目录扫描（由 stub 替代）
 * 依赖与限制（如有）：
 * - 依赖 jsdom 环境，ExtensionLoader 使用 mock/stub
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Kernel } from '@/kernel/core/Kernel';
import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import { RestrictedPluginContext } from '@/kernel/system/plugin/RestrictedPluginContext';
import { EditorExtensionRegistry } from '@/kernel/registries/EditorExtensionRegistry';
import { MarkdownDecorationRegistry } from '@/kernel/registries/MarkdownDecorationRegistry';
import { CIRCUIT_BREAKER_CONFIG } from '@/kernel/system/plugin/PluginSecurityConstants';
import { SystemModuleRegistry } from '@/kernel/system/plugin/SystemModuleRegistry';
import { PluginCategory, type IPlugin } from '@/kernel/system/plugin/types';
import EngineCodeMirrorPlugin from '@/modules/built-in/editor/plugins/engines/codemirror/EngineCodeMirrorPlugin';

// PluginManager 顶层会 import ExtensionLoader（其内部依赖 esbuild-wasm）。
// 这里将 ExtensionLoader 替换为无副作用 stub，避免 jsdom 环境触发 esbuild 环境不变式错误。
vi.mock('@/kernel/system/plugin/ExtensionLoader', () => ({
    ExtensionLoader: class {
        async loadAllPlugins() {
            return [];
        }
    }
}));

import { PluginManager } from '@/kernel/system/plugin/PluginManager';

interface IFileSystemProxyForTest {
    readFile(path: string): Promise<{ success: boolean; marker?: string; content?: string }>;
    pathJoin(...parts: string[]): Promise<string>;
    deleteFile(path: string): Promise<{ success: boolean }>;
}

interface IEditorProxyForTest {
    getState(): { currentFileId: string };
    getCurrentContent(): string;
    setCurrentFile(path: string): void;
}

function registerSettingsMock(kernel: Kernel) {
    const stateStore: Record<string, Record<string, unknown>> = {};
    const settingsMock = {
        getSettings: vi.fn((ns: string) => stateStore[ns] || {}),
        updateSettings: vi.fn((ns: string, value: Record<string, unknown>) => {
            stateStore[ns] = {
                ...(stateStore[ns] || {}),
                ...value,
            };
        }),
    };
    kernel.registerService(ServiceId.SETTINGS, settingsMock, true);
    return settingsMock;
}

function createPlugin(id: string, overrides: Partial<IPlugin> = {}): IPlugin {
    return {
        id,
        name: id,
        version: '1.0.0',
        activate: vi.fn(),
        deactivate: vi.fn(),
        ...overrides,
    };
}

describe('QA-5 插件系统关键路径回归基线', () => {
    beforeEach(() => {
        vi.useRealTimers();
    });

    it('PluginManager: 同 conflictGroup 激活时会自动停用组内已激活插件', () => {
        const kernel = new Kernel();
        registerSettingsMock(kernel);
        const manager = new PluginManager(kernel);

        const pluginA = createPlugin('plugin-a', { conflictGroup: 'editor-renderer' });
        const pluginB = createPlugin('plugin-b', { conflictGroup: 'editor-renderer' });

        manager.loadPlugin(pluginA);
        expect(manager.isPluginActive('plugin-a')).toBe(true);
        expect(pluginA.activate).toHaveBeenCalledTimes(1);

        manager.loadPlugin(pluginB);

        expect(manager.isPluginActive('plugin-a')).toBe(false);
        expect(manager.isPluginActive('plugin-b')).toBe(true);
        expect(pluginA.deactivate).toHaveBeenCalledTimes(1);
        expect(pluginB.activate).toHaveBeenCalledTimes(1);
    });

    it('EngineCodeMirrorPlugin: getRuntimeModules 可注入 @codemirror 模块映射', () => {
        const plugin = new EngineCodeMirrorPlugin();
        const runtimeModules = plugin.getRuntimeModules?.() ?? {};

        SystemModuleRegistry.registerRuntimeModules(runtimeModules);

        expect(SystemModuleRegistry.getModule('@codemirror/state')).toBeTruthy();
        expect(SystemModuleRegistry.getModule('@codemirror/view')).toBeTruthy();
        expect(SystemModuleRegistry.getModule('@codemirror/language')).toBeTruthy();
    });

    it('PluginManager: 支持读取 supportedEngines 元数据且不影响激活流程', () => {
        const kernel = new Kernel();
        registerSettingsMock(kernel);
        const manager = new PluginManager(kernel);

        const plugin = createPlugin('engine-aware-plugin', {
            supportedEngines: ['codemirror', 'prosemirror'],
        });

        manager.loadPlugin(plugin);

        const loaded = manager.getPlugins().find(item => item.id === plugin.id);
        expect(loaded?.supportedEngines).toEqual(['codemirror', 'prosemirror']);
        expect(manager.isPluginActive(plugin.id)).toBe(true);
        expect(plugin.activate).toHaveBeenCalledTimes(1);
    });

    it('PluginManager: 显式 supportedEngines 应按声明判定兼容性', () => {
        const kernel = new Kernel();
        registerSettingsMock(kernel);
        const manager = new PluginManager(kernel);

        const plugin = createPlugin('declared-compatible-plugin', {
            supportedEngines: ['codemirror', 'prosemirror'],
        });
        manager.loadPlugin(plugin);

        expect(manager.isPluginCompatibleWithEngine(plugin.id, 'codemirror')).toBe(true);
        expect(manager.isPluginCompatibleWithEngine(plugin.id, 'prosemirror')).toBe(true);
        expect(manager.isPluginCompatibleWithEngine(plugin.id, 'lexical')).toBe(false);
    });

    it('PluginManager: EDITOR 插件未声明 supportedEngines 时默认仅兼容 codemirror', () => {
        const kernel = new Kernel();
        registerSettingsMock(kernel);
        const manager = new PluginManager(kernel);

        const plugin = createPlugin('editor-default-policy-plugin', {
            category: PluginCategory.EDITOR,
        });
        manager.loadPlugin(plugin);

        expect(manager.isPluginCompatibleWithEngine(plugin.id, 'codemirror')).toBe(true);
        expect(manager.isPluginCompatibleWithEngine(plugin.id, 'prosemirror')).toBe(false);
    });

    it('PluginManager: 非 EDITOR 插件未声明 supportedEngines 时默认兼容全部引擎', () => {
        const kernel = new Kernel();
        registerSettingsMock(kernel);
        const manager = new PluginManager(kernel);

        const plugin = createPlugin('system-default-policy-plugin', {
            category: PluginCategory.SYSTEM,
        });
        manager.loadPlugin(plugin);

        expect(manager.isPluginCompatibleWithEngine(plugin.id, 'codemirror')).toBe(true);
        expect(manager.isPluginCompatibleWithEngine(plugin.id, 'prosemirror')).toBe(true);
    });

    it('PluginManager: editor-engine 组插件应默认兼容其自身引擎', () => {
        const kernel = new Kernel();
        registerSettingsMock(kernel);
        const manager = new PluginManager(kernel);

        const plugin = createPlugin('engine-codemirror', {
            category: PluginCategory.EDITOR,
            conflictGroup: 'editor-engine',
        });
        manager.loadPlugin(plugin);

        expect(manager.isPluginCompatibleWithEngine(plugin.id, 'codemirror')).toBe(true);
        expect(manager.isPluginCompatibleWithEngine(plugin.id, 'prosemirror')).toBe(false);
    });

    it('PluginManager: 可按 engineId 读写 plugin-states-by-engine 状态快照', () => {
        const kernel = new Kernel();
        registerSettingsMock(kernel);
        const manager = new PluginManager(kernel);

        manager.savePluginStatesForEngine('prosemirror', {
            'plugin-a': true,
            'plugin-b': false,
        });

        expect(manager.getPluginStatesForEngine('prosemirror')).toEqual({
            'plugin-a': true,
            'plugin-b': false,
        });
    });

    it('PluginManager: updatePluginStateForEngine 应增量更新引擎维度状态', () => {
        const kernel = new Kernel();
        registerSettingsMock(kernel);
        const manager = new PluginManager(kernel);

        manager.savePluginStatesForEngine('prosemirror', { 'plugin-a': true });
        manager.updatePluginStateForEngine('prosemirror', 'plugin-b', false);

        expect(manager.getPluginStatesForEngine('prosemirror')).toEqual({
            'plugin-a': true,
            'plugin-b': false,
        });
    });

    it('PluginManager: saveCurrentActiveStatesForEngine 应保存当前激活态快照', () => {
        const kernel = new Kernel();
        registerSettingsMock(kernel);
        const manager = new PluginManager(kernel);

        const pluginA = createPlugin('plugin-a');
        const pluginB = createPlugin('plugin-b');
        manager.loadPlugin(pluginA);
        manager.loadPlugin(pluginB);
        manager.deactivatePlugin(pluginB.id);

        manager.saveCurrentActiveStatesForEngine('codemirror');

        expect(manager.getPluginStatesForEngine('codemirror')).toMatchObject({
            'plugin-a': true,
            'plugin-b': false,
        });
    });

    it('PluginManager: codemirror 在无分层状态时应回退读取 legacy plugin-states', () => {
        const kernel = new Kernel();
        registerSettingsMock(kernel);
        const manager = new PluginManager(kernel);

        const plugin = createPlugin('legacy-plugin');
        manager.loadPlugin(plugin);
        manager.deactivatePlugin(plugin.id);

        expect(manager.getPluginStatesForEngine('codemirror')).toMatchObject({
            'legacy-plugin': false,
        });
    });

    it('PluginManager: 达到错误阈值后触发熔断并发射 PLUGIN_TRIPPED', () => {
        const kernel = new Kernel();
        registerSettingsMock(kernel);
        const manager = new PluginManager(kernel);

        const plugin = createPlugin('unstable-plugin');
        manager.loadPlugin(plugin);
        expect(manager.isPluginActive(plugin.id)).toBe(true);

        const trippedPayloads: Array<{ pluginId: string; message: string; cooldownMs: number }> = [];
        kernel.on(CoreEvents.PLUGIN_TRIPPED, (payload) => {
            trippedPayloads.push(payload);
        });

        for (let i = 0; i < CIRCUIT_BREAKER_CONFIG.ERROR_THRESHOLD; i++) {
            manager.recordPluginError(plugin.id, new Error(`boom-${i}`));
        }

        expect(manager.isPluginTripped(plugin.id)).toBe(true);
        expect(manager.isPluginActive(plugin.id)).toBe(false);
        expect(plugin.deactivate).toHaveBeenCalledTimes(1);
        expect(trippedPayloads).toHaveLength(1);
        expect(trippedPayloads[0].pluginId).toBe(plugin.id);
        expect(trippedPayloads[0].cooldownMs).toBe(CIRCUIT_BREAKER_CONFIG.COOLDOWN_MS);
    });

    it('PluginManager: 熔断冷却期结束后允许重新激活插件', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-02-24T12:00:00.000Z'));

        const kernel = new Kernel();
        registerSettingsMock(kernel);
        const manager = new PluginManager(kernel);

        const plugin = createPlugin('cooldown-plugin');
        manager.loadPlugin(plugin);
        expect(manager.isPluginActive(plugin.id)).toBe(true);

        for (let i = 0; i < CIRCUIT_BREAKER_CONFIG.ERROR_THRESHOLD; i++) {
            manager.recordPluginError(plugin.id, new Error(`boom-${i}`));
        }

        expect(manager.isPluginTripped(plugin.id)).toBe(true);
        expect(manager.isPluginActive(plugin.id)).toBe(false);

        vi.advanceTimersByTime(CIRCUIT_BREAKER_CONFIG.COOLDOWN_MS + 1);

        // 冷却期过后再次激活应成功，并自动重置熔断状态
        manager.activatePlugin(plugin.id);

        expect(manager.isPluginTripped(plugin.id)).toBe(false);
        expect(manager.isPluginActive(plugin.id)).toBe(true);
        expect(plugin.activate).toHaveBeenCalledTimes(2);
        expect(plugin.deactivate).toHaveBeenCalledTimes(1);
    });

    it('RestrictedPluginContext: 仅允许白名单事件 emit（未授权事件被拦截）', () => {
        const kernel = new Kernel();
        const context = new RestrictedPluginContext(
            kernel,
            'ext-test',
            new EditorExtensionRegistry(),
            new MarkdownDecorationRegistry()
        );

        const allowedHandler = vi.fn();
        const deniedHandler = vi.fn();
        kernel.on(CoreEvents.DOCUMENT_CHANGED, allowedHandler);
        kernel.on(CoreEvents.APP_CMD_SAVE, deniedHandler);

        context.emit(CoreEvents.DOCUMENT_CHANGED, { content: 'x' });
        context.emit(CoreEvents.APP_CMD_SAVE);

        expect(allowedHandler).toHaveBeenCalledTimes(1);
        expect(deniedHandler).not.toHaveBeenCalled();
    });

    it('RestrictedPluginContext: fileSystem/editorService 代理遵守方法白名单', async () => {
        const kernel = new Kernel();

        const fileSystem = {
            marker: 'fs-marker',
            readFile: vi.fn(async function (this: { marker: string }, _path: string) {
                return { success: true, marker: this.marker };
            }),
            pathJoin: vi.fn(async (...parts: string[]) => parts.join('/')),
            deleteFile: vi.fn(async () => ({ success: true })),
        };
        const editorService = {
            getState: vi.fn(() => ({ currentFileId: 'a.md' })),
            getCurrentContent: vi.fn(() => '# hello'),
            setCurrentFile: vi.fn(),
        };

        kernel.registerService(ServiceId.FILE_SYSTEM, fileSystem, true);
        kernel.registerService(ServiceId.EDITOR, editorService, true);

        const context = new RestrictedPluginContext(
            kernel,
            'ext-test',
            new EditorExtensionRegistry(),
            new MarkdownDecorationRegistry()
        );

        const fsProxy = context.getService<IFileSystemProxyForTest>(ServiceId.FILE_SYSTEM)!;
        const editorProxy = context.getService<IEditorProxyForTest>(ServiceId.EDITOR)!;

        expect(fsProxy).toBeTruthy();
        expect(editorProxy).toBeTruthy();

        const readResult = await fsProxy.readFile('note.md');
        expect(readResult.success).toBe(true);
        expect(readResult.marker).toBe('fs-marker');
        expect(fileSystem.readFile).toHaveBeenCalledTimes(1);

        await expect(fsProxy.pathJoin('a', 'b')).resolves.toBe('a/b');
        expect(fileSystem.pathJoin).toHaveBeenCalledTimes(1);

        await expect(fsProxy.deleteFile('note.md')).rejects.toThrow(/Sandbox: fileSystem\.deleteFile/);
        expect(fileSystem.deleteFile).not.toHaveBeenCalled();

        expect(editorProxy.getState()).toEqual({ currentFileId: 'a.md' });
        expect(editorService.getState).toHaveBeenCalledTimes(1);

        expect(editorProxy.getCurrentContent()).toBe('# hello');
        expect(editorService.getCurrentContent).toHaveBeenCalledTimes(1);

        expect(editorProxy.setCurrentFile('b.md')).toBeUndefined();
        expect(editorService.setCurrentFile).not.toHaveBeenCalled();
    });

    it('RestrictedPluginContext.kernel 代理会路由到沙箱规则（emit/getService/on/off）', async () => {
        const kernel = new Kernel();

        const fileSystem = {
            readFile: vi.fn(async () => ({ success: true, content: 'ok' })),
            deleteFile: vi.fn(async () => ({ success: true })),
        };
        kernel.registerService(ServiceId.FILE_SYSTEM, fileSystem, true);

        const context = new RestrictedPluginContext(
            kernel,
            'ext-kernel-proxy-test',
            new EditorExtensionRegistry(),
            new MarkdownDecorationRegistry()
        );

        const docHandler = vi.fn();
        context.kernel.on(CoreEvents.DOCUMENT_CHANGED, docHandler);

        context.kernel.emit(CoreEvents.DOCUMENT_CHANGED, { content: 'from-proxy' });
        context.kernel.emit(CoreEvents.APP_CMD_SAVE);
        expect(docHandler).toHaveBeenCalledTimes(1);

        context.kernel.off(CoreEvents.DOCUMENT_CHANGED, docHandler);
        context.kernel.emit(CoreEvents.DOCUMENT_CHANGED, { content: 'after-off' });
        expect(docHandler).toHaveBeenCalledTimes(1);

        const fsProxy = context.kernel.getService<IFileSystemProxyForTest>(ServiceId.FILE_SYSTEM)!;
        const deniedSettings = context.kernel.getService(ServiceId.SETTINGS);

        expect(fsProxy).toBeTruthy();
        expect(deniedSettings).toBeUndefined();

        await expect(fsProxy.readFile('x.md')).resolves.toEqual({ success: true, content: 'ok' });
        await expect(fsProxy.deleteFile('x.md')).rejects.toThrow(/Sandbox: fileSystem\.deleteFile/);
    });
});
