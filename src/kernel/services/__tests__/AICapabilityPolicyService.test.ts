/**
 * 测试范围：AICapabilityPolicyService
 * 测试类型：单元 / 回归
 * 测试目的：守护 AI 能力声明与内置/外置插件授权过滤规则不回退。
 * 防回归问题：AI 高风险能力被外置插件误获取、未声明能力被默认放行。
 * 关键不变量：
 * - 内置插件按声明获得 AI 能力
 * - 外置插件的高风险能力会被策略服务过滤
 * - 未注册插件默认没有 AI 能力
 * 边界说明：
 * - 不覆盖真实 PluginManager 生命周期
 * - 不覆盖未来 AI 任务执行链路
 * 依赖与限制（如有）：
 * - 使用 Kernel + PluginManager stub 验证策略服务行为
 */

import { describe, expect, it } from 'vitest';
import { Kernel } from '@/kernel/core/Kernel';
import { ServiceId } from '@/kernel/core/ServiceId';
import { AICapabilityId } from '@/kernel/interfaces/IAICapabilityPolicyService';
import { AICapabilityPolicyService } from '@/kernel/services/AICapabilityPolicyService';
import type { IPlugin } from '@/kernel/system/plugin/types';

function registerPluginManagerStub(kernel: Kernel, plugins: IPlugin[]) {
    kernel.registerService(ServiceId.PLUGIN_MANAGER, {
        getPlugins: () => plugins,
    }, true);
}

function createPlugin(id: string, overrides: Partial<IPlugin> = {}): IPlugin {
    return {
        id,
        name: id,
        version: '1.0.0',
        activate: () => {},
        ...overrides,
    };
}

describe('AICapabilityPolicyService', () => {
    it('内置插件应按声明保留 AI 能力', () => {
        const kernel = new Kernel();
        registerPluginManagerStub(kernel, [
            createPlugin('internal-ai-plugin', {
                internal: true,
                aiCapabilities: [
                    AICapabilityId.EDITOR_READ,
                    AICapabilityId.EDITOR_WRITE_ACTIVE,
                    AICapabilityId.WORKSPACE_CHANGE_APPLY,
                    AICapabilityId.UI_ACTION_EXECUTE,
                ],
            }),
        ]);

        const service = new AICapabilityPolicyService(kernel);

        expect(service.listCapabilities('internal-ai-plugin')).toEqual([
            AICapabilityId.EDITOR_READ,
            AICapabilityId.EDITOR_WRITE_ACTIVE,
            AICapabilityId.WORKSPACE_CHANGE_APPLY,
            AICapabilityId.UI_ACTION_EXECUTE,
        ]);
        expect(service.hasCapability('internal-ai-plugin', AICapabilityId.EDITOR_WRITE_ACTIVE)).toBe(true);
    });

    it('外置插件应被过滤掉高风险 AI 能力', () => {
        const kernel = new Kernel();
        registerPluginManagerStub(kernel, [
            createPlugin('external-ai-consumer', {
                internal: false,
                aiCapabilities: [
                    AICapabilityId.EDITOR_READ,
                    AICapabilityId.EDITOR_WRITE_ACTIVE,
                    AICapabilityId.WORKSPACE_CHANGE_STAGE,
                    AICapabilityId.WORKSPACE_CHANGE_APPLY,
                    AICapabilityId.UI_ACTION_EXECUTE,
                ],
            }),
        ]);

        const service = new AICapabilityPolicyService(kernel);

        expect(service.listCapabilities('external-ai-consumer')).toEqual([
            AICapabilityId.EDITOR_READ,
            AICapabilityId.WORKSPACE_CHANGE_STAGE,
        ]);
        expect(service.hasCapability('external-ai-consumer', AICapabilityId.EDITOR_WRITE_ACTIVE)).toBe(false);
        expect(service.hasCapability('external-ai-consumer', AICapabilityId.WORKSPACE_CHANGE_APPLY)).toBe(false);
        expect(service.hasCapability('external-ai-consumer', AICapabilityId.UI_ACTION_EXECUTE)).toBe(false);
    });

    it('未声明或不存在的插件默认没有 AI 能力', () => {
        const kernel = new Kernel();
        registerPluginManagerStub(kernel, [
            createPlugin('plain-plugin', {
                internal: true,
            }),
        ]);

        const service = new AICapabilityPolicyService(kernel);

        expect(service.listCapabilities('plain-plugin')).toEqual([]);
        expect(service.listCapabilities('missing-plugin')).toEqual([]);
        expect(() => service.assertCapability('plain-plugin', AICapabilityId.AI_TASK_RUN)).toThrow(/AI capability denied/);
    });
});

