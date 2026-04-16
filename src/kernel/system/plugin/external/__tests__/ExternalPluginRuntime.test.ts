/**
 * 测试范围：ExternalPluginRuntime 外部插件运行时组件
 * 测试类型：单元 / 回归
 * 测试目的：守住模块解析、依赖注入和入口执行行为
 * 防回归问题：相对路径 require 失效、系统模块无法注入、入口对象未被统一注入元数据
 * 关键不变量：
 * - 相对路径模块可被解析并执行
 * - SystemModuleRegistry 中的运行时依赖可被外部插件消费
 * - 成功执行后外部插件会被统一标记为 external / iframe
 * 边界说明：
 * - 不覆盖转译缓存
 * - 不覆盖文件系统目录读取
 */
import { describe, expect, it } from 'vitest';
import { SystemModuleRegistry } from '@/kernel/system/plugin/SystemModuleRegistry';
import { ExternalPluginRuntime } from '../ExternalPluginRuntime';

interface IRuntimeProbePlugin {
    helperValue: string;
    runtimeFlag: string;
    internal: boolean;
    hidden: boolean;
    isolationLevel: string;
    id: string;
}

describe('Phase 7 ExternalPluginRuntime', () => {
    it('应支持相对路径模块与系统模块注入', () => {
        SystemModuleRegistry.registerRuntimeModules({
            '@phase7/runtime': { flag: 'runtime-ready' },
        });

        const runtime = new ExternalPluginRuntime();
        const plugin = runtime.loadPlugin(
            {
                id: 'demo-runtime-plugin',
                name: 'Demo Runtime Plugin',
                version: '1.0.0',
                path: '/plugins/demo-runtime-plugin',
                main: 'index.js',
            },
            {
                'index.js': `
                    const helper = require('./helper');
                    const runtime = require('@phase7/runtime');
                    module.exports = {
                        default: {
                            helperValue: helper.value,
                            runtimeFlag: runtime.flag,
                            activate() {}
                        }
                    };
                `,
                'helper.js': `module.exports = { value: 'helper-ready' };`,
            },
        ) as IRuntimeProbePlugin | null;

        expect(plugin).toBeTruthy();
        expect(plugin?.helperValue).toBe('helper-ready');
        expect(plugin?.runtimeFlag).toBe('runtime-ready');
        expect(plugin?.internal).toBe(false);
        expect(plugin?.hidden).toBe(false);
        expect(plugin?.isolationLevel).toBe('iframe');
        expect(plugin?.id).toBe('demo-runtime-plugin');
    });
});
