/**
 * 测试范围：插件安全策略（路径信任 / 隐藏规则 / 权限提升判定）
 * 测试类型：单元/回归
 * 测试目的：守护 Phase 2 安全子域收口后的策略函数，避免路径信任和权限提升规则回退
 * 防回归问题：internal 冒充、隐藏插件规则漂移、权限提升判定越权
 * 关键不变量：
 * - 未受信路径不能因为声明 internal=true 而获得内部权限
 * - 系统隐藏插件规则保持集中生效
 * - 权限提升仅对非内部插件显式声明时生效
 * 边界说明：
 * - 不覆盖 PluginManager 生命周期联动
 * - 不覆盖真实外部插件目录扫描
 * 依赖与限制（如有）：
 * - 仅验证纯策略函数，不包含运行时 UI 或 IPC
 */
import { describe, expect, it } from 'vitest';
import {
    isTrustedPluginPath,
    resolvePluginSecurityProfile,
    shouldRequestPluginElevation,
} from '../policies/PluginTrustPolicy';

describe('Phase 2 插件安全策略', () => {
    it('受信路径应被识别为 internal 可用路径', () => {
        expect(isTrustedPluginPath('./PluginSystemPlugin.ts')).toBe(true);
        expect(isTrustedPluginPath('src/modules/built-in/editor/index.tsx')).toBe(true);
        expect(isTrustedPluginPath('src/modules/syntax/markdown/index.ts')).toBe(true);
    });

    it('未受信路径声明 internal=true 时应强制回退为受限模式', () => {
        const profile = resolvePluginSecurityProfile({
            id: 'security-test',
            internal: true,
        }, 'plugins/security-test/index.js');

        expect(profile.isTrustedPath).toBe(false);
        expect(profile.isInternal).toBe(false);
        expect(profile.pathSpoofingMessage).toBeTruthy();
    });

    it('隐藏插件规则应可由集中策略统一判定', () => {
        const hiddenProfile = resolvePluginSecurityProfile({
            id: 'plugin-system',
        }, './PluginSystemPlugin.ts');

        const normalProfile = resolvePluginSecurityProfile({
            id: 'normal-plugin',
        }, './normal/index.ts');

        expect(hiddenProfile.shouldHide).toBe(true);
        expect(normalProfile.shouldHide).toBe(false);
    });

    it('权限提升仅对外置且显式声明的插件生效', () => {
        expect(shouldRequestPluginElevation({
            id: 'external-plugin',
            requestElevation: true,
        })).toBe(true);

        expect(shouldRequestPluginElevation({
            id: 'internal-plugin',
            internal: true,
            requestElevation: true,
        })).toBe(false);

        expect(shouldRequestPluginElevation({
            id: 'external-plugin-without-flag',
            requestElevation: false,
        })).toBe(false);
    });
});
