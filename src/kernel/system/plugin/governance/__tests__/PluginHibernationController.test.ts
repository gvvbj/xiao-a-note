/**
 * 测试范围：PluginHibernationController 休眠治理组件
 * 测试类型：单元 / 回归
 * 测试目的：守住空闲休眠判定与 lazy 插件重入队行为
 * 防回归问题：空闲插件无法休眠、essential 插件被误休眠、lazy 插件休眠后丢失待激活状态
 * 关键不变量：
 * - 超时插件会被停用
 * - lazy 插件休眠后会重新入队
 * - essential 或无超时配置的插件不会被休眠
 * 边界说明：
 * - 不依赖真实定时器流逝
 * - 不覆盖 PluginManager 宿主管线与停用实现细节
 */
import { describe, expect, it, vi } from 'vitest';
import type { ILogger } from '@/kernel/services/LoggerService';
import type { IPlugin } from '@/kernel/system/plugin/types';
import { PluginHibernationController } from '../PluginHibernationController';

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

describe('Phase 6 PluginHibernationController', () => {
    it('空闲超时后应休眠插件并将懒加载插件重新入队', () => {
        const logger = createLoggerStub();
        const deactivated: string[] = [];
        const requeued: string[] = [];
        const plugins = new Map<string, IPlugin>();

        const plugin = createPlugin('lazy-idle-plugin', {
            lazy: true,
            hibernationTimeout: 100,
        });
        plugins.set(plugin.id, plugin);

        const controller = new PluginHibernationController(
            logger,
            {
                getActivePluginIds: () => [plugin.id],
                getPlugin: (pluginId) => plugins.get(pluginId),
                deactivatePlugin: (pluginId) => {
                    deactivated.push(pluginId);
                },
                requeuePlugin: (requeueTarget) => {
                    requeued.push(requeueTarget.id);
                },
            },
            {
                now: () => 1_000,
            },
        );

        controller.recordActivity(plugin.id);
        const hibernated = controller.runOnce(1_200);

        expect(hibernated).toEqual([plugin.id]);
        expect(deactivated).toEqual([plugin.id]);
        expect(requeued).toEqual([plugin.id]);
    });

    it('essential 或未声明超时的插件不应被休眠', () => {
        const logger = createLoggerStub();
        const deactivated = vi.fn();
        const plugins = new Map<string, IPlugin>();

        const essentialPlugin = createPlugin('essential-plugin', {
            essential: true,
            hibernationTimeout: 100,
        });
        const alwaysOnPlugin = createPlugin('always-on-plugin');
        plugins.set(essentialPlugin.id, essentialPlugin);
        plugins.set(alwaysOnPlugin.id, alwaysOnPlugin);

        const controller = new PluginHibernationController(
            logger,
            {
                getActivePluginIds: () => [essentialPlugin.id, alwaysOnPlugin.id],
                getPlugin: (pluginId) => plugins.get(pluginId),
                deactivatePlugin: deactivated,
                requeuePlugin: vi.fn(),
            },
            {
                now: () => 500,
            },
        );

        controller.recordActivity(essentialPlugin.id);
        controller.recordActivity(alwaysOnPlugin.id);
        const hibernated = controller.runOnce(1_000);

        expect(hibernated).toEqual([]);
        expect(deactivated).not.toHaveBeenCalled();
    });
});
