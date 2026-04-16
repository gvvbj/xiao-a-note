/**
 * AuthStore — 插件授权决定持久化
 *
 * 使用 localStorage 存储用户对第三方插件的授权决定。
 * 仅存储 "always-allow" 决定；单次 allow/deny 不持久化。
 */

const STORAGE_KEY = 'xiao-a-note:plugin-auth-decisions';

export type AuthDecision = 'always-allow';

export class AuthStore {
    /**
     * 获取用户对指定插件的持久化授权决定
     * @returns 'always-allow' 或 null（无记录）
     */
    static getDecision(pluginId: string): AuthDecision | null {
        const decisions = AuthStore._loadAll();
        return decisions[pluginId] || null;
    }

    /**
     * 持久化用户授权决定
     */
    static setDecision(pluginId: string, decision: AuthDecision): void {
        const decisions = AuthStore._loadAll();
        decisions[pluginId] = decision;
        AuthStore._saveAll(decisions);
    }

    /**
     * 撤销用户对指定插件的授权决定
     */
    static revokeDecision(pluginId: string): void {
        const decisions = AuthStore._loadAll();
        delete decisions[pluginId];
        AuthStore._saveAll(decisions);
    }

    /**
     * 获取所有已持久化的授权决定（用于设置页面或调试）
     */
    static getAllDecisions(): Record<string, AuthDecision> {
        return AuthStore._loadAll();
    }

    // ── 内部方法 ──

    private static _loadAll(): Record<string, AuthDecision> {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    }

    private static _saveAll(decisions: Record<string, AuthDecision>): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(decisions));
        } catch {
            // localStorage 写入失败（如隐私模式），静默降级
        }
    }
}
