/**
 * 测试范围：插件熔断治理组件
 * 测试类型：单元 / 回归
 * 测试目的：守护 Phase 3 拆出的熔断状态治理，避免错误阈值、冷却期和 essential 例外逻辑回退
 * 防回归问题：非 essential 插件未被熔断、essential 插件被误熔断、冷却期到期后状态不恢复
 * 关键不变量：
 * - essential 插件错误只记录警告，不触发熔断
 * - 达到阈值后必须触发 onTrip
 * - 超过冷却期后 isTripped 必须恢复为 false
 * 边界说明：
 * - 不覆盖 PluginManager 停用插件与广播逻辑
 * 依赖与限制：
 * - 使用 fake timers 控制时间窗口和冷却期
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PluginCircuitBreaker } from '../PluginCircuitBreaker';

describe('PluginCircuitBreaker', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('应忽略 essential 插件错误，并在普通插件达到阈值后熔断且冷却后恢复', () => {
        vi.useFakeTimers();

        const logger = {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
        };
        const breaker = new PluginCircuitBreaker(logger as never, {
            errorWindowMs: 1000,
            errorThreshold: 3,
            cooldownMs: 5000,
        });

        const essentialTrip = vi.fn();
        breaker.recordError('core-plugin', {
            essential: true,
            error: new Error('ignore'),
            onTrip: essentialTrip,
        });
        expect(essentialTrip).not.toHaveBeenCalled();
        expect(breaker.isTripped('core-plugin')).toBe(false);

        const trip = vi.fn();
        breaker.recordError('ext-plugin', { essential: false, error: new Error('1'), onTrip: trip });
        breaker.recordError('ext-plugin', { essential: false, error: new Error('2'), onTrip: trip });
        expect(breaker.isTripped('ext-plugin')).toBe(false);

        breaker.recordError('ext-plugin', { essential: false, error: new Error('3'), onTrip: trip });
        expect(trip).toHaveBeenCalledTimes(1);
        expect(breaker.isTripped('ext-plugin')).toBe(true);

        vi.advanceTimersByTime(5001);
        expect(breaker.isTripped('ext-plugin')).toBe(false);
    });
});
