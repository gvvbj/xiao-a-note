export const CIRCUIT_BREAKER_CONFIG = {
    /** 错误计数阈值：超过此数量将触发熔断 */
    ERROR_THRESHOLD: 5,
    /** 错误计数时间窗口（毫秒）：在此时间内累计错误 */
    ERROR_WINDOW_MS: 60000,
    /** 熔断后的冷却时间（毫秒）：冷却期间插件无法重新激活 */
    COOLDOWN_MS: 300000
} as const;
