/**
 * 测试范围：PluginLazyActivationCoordinator 懒加载治理组件
 * 测试类型：单元 / 回归
 * 测试目的：守住语法触发、事件触发和非待处理插件降级行为
 * 防回归问题：懒加载插件无法被唤醒、事件被 once 消费后丢失、错误触发导致异常中断
 * 关键不变量：
 * - 待处理懒加载插件命中触发器后会被激活
 * - 事件触发后会重发射给激活后注册的处理器
 * - 非待处理插件手动激活只记警告，不抛错
 * 边界说明：
 * - 不覆盖 PluginManager 宿主管线
 * - 不覆盖真实文件系统与 esbuild 转译
 */
import { describe, expect, it, vi } from 'vitest';
import { Kernel } from '@/kernel/core/Kernel';
import { CoreEvents } from '@/kernel/core/Events';
import type { ILogger } from '@/kernel/services/LoggerService';
import type { IPlugin } from '@/kernel/system/plugin/types';
import { PluginLazyActivationCoordinator } from '../PluginLazyActivationCoordinator';

function createLoggerStub(): ILogger {
    return {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    };
}

function createPlugin(id: string, overrides: Partial<IPlugin> = {}): IPlugin {
    return {
        id,
        name: id,
        version: '1.0.0',
        activate: vi.fn(),
        ...overrides,
    };
}

describe('Phase 6 PluginLazyActivationCoordinator', () => {
    it('命中文法触发器后应激活待处理懒加载插件', () => {
        const kernel = new Kernel();
        const logger = createLoggerStub();
        const activated: string[] = [];
        const registered: string[] = [];
        const plugins = new Map<string, IPlugin>();

        const plugin = createPlugin('lazy-syntax-plugin', {
            lazy: true,
            activationTrigger: { type: 'syntax', pattern: /```kanban/ },
        });
        plugins.set(plugin.id, plugin);

        const coordinator = new PluginLazyActivationCoordinator(kernel, logger, {
            getPlugin: (pluginId) => plugins.get(pluginId),
            activatePlugin: (pluginId) => {
                activated.push(pluginId);
            },
            registerStaticCapabilities: (registeredPlugin) => {
                registered.push(registeredPlugin.id);
            },
        });

        coordinator.deferPlugin(plugin);
        coordinator.refreshTriggerListeners();
        kernel.emit(CoreEvents.DOCUMENT_CHANGED, { content: '```kanban\n- item' });

        expect(registered).toEqual(['lazy-syntax-plugin']);
        expect(activated).toEqual(['lazy-syntax-plugin']);
        expect(coordinator.hasPendingPlugin(plugin.id)).toBe(false);
    });

    it('事件触发激活后应重新发射事件给插件新注册的监听器', () => {
        const kernel = new Kernel();
        const logger = createLoggerStub();
        const plugins = new Map<string, IPlugin>();
        const runtimeHandler = vi.fn();

        const plugin = createPlugin('lazy-event-plugin', {
            lazy: true,
            activationTrigger: { type: 'event', eventName: 'plugin:test-event' },
        });
        plugins.set(plugin.id, plugin);

        const coordinator = new PluginLazyActivationCoordinator(kernel, logger, {
            getPlugin: (pluginId) => plugins.get(pluginId),
            activatePlugin: () => {
                kernel.on('plugin:test-event', runtimeHandler);
            },
            registerStaticCapabilities: vi.fn(),
        });

        coordinator.deferPlugin(plugin);
        coordinator.refreshTriggerListeners();
        kernel.emit('plugin:test-event', { source: 'qa' });

        expect(runtimeHandler).toHaveBeenCalledTimes(1);
        expect(runtimeHandler).toHaveBeenCalledWith({ source: 'qa' });
        expect(coordinator.hasPendingPlugin(plugin.id)).toBe(false);
    });

    it('手动激活非待处理插件时只记警告不抛错', () => {
        const kernel = new Kernel();
        const logger = createLoggerStub();
        const coordinator = new PluginLazyActivationCoordinator(kernel, logger, {
            getPlugin: () => undefined,
            activatePlugin: vi.fn(),
            registerStaticCapabilities: vi.fn(),
        });

        coordinator.activatePendingPlugin('missing-plugin');

        expect(logger.warn).toHaveBeenCalledTimes(1);
    });
});
