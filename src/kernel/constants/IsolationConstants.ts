import { CSS_VARS, getCSSVarName } from "./ThemeConstants";
// @ts-ignore - Vite raw import
import bridgeScript from "../assets/isolation/bridge.js?raw";
// @ts-ignore - Vite raw import
import baseStyles from "../assets/isolation/base.css?raw";

/**
 * 隔离渲染系统常量
 * 
 * 零硬编码专项加固 (Logic as Asset 版)
 * 
 * 职责：
 * 1. 管理从资产文件加载的“桥接逻辑”与“重置样式”
 * 2. 自动派生需要同步的主题变量名
 */
export const ISOLATION_CONSTANTS = {
    /**
     * 桥接脚本 (从 assets/isolation/bridge.js 动态载入)
     */
    BRIDGE_SCRIPT: bridgeScript,

    /**
     * 基础重置样式 (从 assets/isolation/base.css 动态载入)
     */
    BASE_STYLES: baseStyles,

    /**
     * 主题变量同步白名单 (0 硬编码，全量派生自 ThemeConstants)
     */
    SYNC_VARS: Object.values(CSS_VARS).map(v => getCSSVarName(v)),

    /**
     * 交互脉冲持续时间 (毫秒)
     * 延长至 1000ms 以确保异步消息在宿主选区更新前稳定到达
     */
    INTERACTION_PULSE_MS: 1000
} as const;
