/**
 * 测试范围：插件状态持久化治理组件
 * 测试类型：单元 / 回归
 * 测试目的：守护 Phase 3 拆出的状态存储组件，避免 PluginManager 状态快照读写回退
 * 防回归问题：插件启用状态、按引擎状态快照读写失效或写入到错误命名空间
 * 关键不变量：
 * - legacy 状态从 legacy 命名空间读取
 * - by-engine 状态从 engine 命名空间读取
 * - 保存 legacy 状态与保存引擎状态使用各自命名空间
 * 边界说明：
 * - 不覆盖 SettingsService 的 localStorage 行为
 * - 不覆盖 PluginManager 的状态快照组装逻辑
 * 依赖与限制：
 * - 使用 SettingsService 最小 stub
 */
import { describe, expect, it, vi } from 'vitest';

import { PluginStateStore } from '../PluginStateStore';

describe('PluginStateStore', () => {
    it('应按命名空间读取并保存 legacy 与按引擎状态', () => {
        const getSettings = vi.fn((namespace: string) => {
            if (namespace === 'legacy-ns') {
                return { alpha: true };
            }
            if (namespace === 'engine-ns') {
                return { codemirror: { beta: false } };
            }
            return {};
        });
        const updateSettings = vi.fn();
        const settingsService = {
            getSettings,
            updateSettings,
        };

        const store = new PluginStateStore(
            () => settingsService as never,
            { legacy: 'legacy-ns', byEngine: 'engine-ns' },
        );

        expect(store.loadLegacyStates()).toEqual({ alpha: true });
        expect(store.loadStatesByEngine()).toEqual({ codemirror: { beta: false } });

        store.saveLegacyStates({ alpha: false, beta: true });
        expect(updateSettings).toHaveBeenNthCalledWith(1, 'legacy-ns', { alpha: false, beta: true });

        store.saveStatesForEngine('prosemirror', { gamma: true });
        expect(updateSettings).toHaveBeenNthCalledWith(2, 'engine-ns', {
            prosemirror: { gamma: true },
        });
    });
});
