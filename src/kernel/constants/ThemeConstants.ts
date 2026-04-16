/**
 * ThemeConstants - 主题系统常量定义
 * 
 * 零硬编码：所有 CSS 变量名和主题配置集中管理
 * 
 * 职责:
 * 1. 定义所有 CSS 变量名常量
 * 2. 定义主题类型枚举
 * 3. 提供默认主题配置
 */

/**
 * 主题类型枚举
 */
export enum ThemeType {
    LIGHT = 'light',
    DARK = 'dark'
}

/**
 * CSS 变量命名空间
 */
export const CSS_VAR_PREFIX = '--' as const;

/**
 * 核心颜色变量名 (遵循 Tailwind/Shadcn 规范)
 */
export const CSS_VARS = {
    // 基础颜色
    BACKGROUND: 'background',
    FOREGROUND: 'foreground',

    // 卡片
    CARD: 'card',
    CARD_FOREGROUND: 'card-foreground',

    // 弹出层
    POPOVER: 'popover',
    POPOVER_FOREGROUND: 'popover-foreground',

    // 主色调
    PRIMARY: 'primary',
    PRIMARY_FOREGROUND: 'primary-foreground',

    // 次要色
    SECONDARY: 'secondary',
    SECONDARY_FOREGROUND: 'secondary-foreground',

    // 静音色
    MUTED: 'muted',
    MUTED_FOREGROUND: 'muted-foreground',

    // 强调色
    ACCENT: 'accent',
    ACCENT_FOREGROUND: 'accent-foreground',

    // 危险色
    DESTRUCTIVE: 'destructive',
    DESTRUCTIVE_FOREGROUND: 'destructive-foreground',

    // 边框/输入
    BORDER: 'border',
    INPUT: 'input',
    RING: 'ring',

    // 圆角
    RADIUS: 'radius',

    // 自定义 UI 区域
    SIDEBAR_BACKGROUND: 'sidebar-background',
    SIDEBAR_FOREGROUND: 'sidebar-foreground',
    SIDEBAR_ACTIVE: 'sidebar-active',
    SIDEBAR_HOVER: 'sidebar-hover',

    HEADER_BACKGROUND: 'header-background',
    HEADER_FOREGROUND: 'header-foreground',

    EDITOR_BACKGROUND: 'editor-background',

    // 表格专用
    TABLE_BORDER: 'table-border',
    TABLE_HEADER_BG: 'table-header-bg',
    TABLE_HEADER_FG: 'table-header-fg',
    TABLE_ROW_HOVER: 'table-row-hover',

    // 代码块专用
    CODE_INLINE_BG: 'code-inline-bg',
    CODE_INLINE_FG: 'code-inline-fg'
} as const;

/**
 * 获取完整 CSS 变量名 (带 -- 前缀)
 */
export function getCSSVarName(varName: string): string {
    return `${CSS_VAR_PREFIX}${varName}`;
}

/**
 * 获取 CSS 变量引用 (var(--xxx))
 */
export function getCSSVarRef(varName: string): string {
    return `var(${CSS_VAR_PREFIX}${varName})`;
}

/**
 * 默认主题 ID 常量
 */
export const DEFAULT_THEME_IDS = {
    LIGHT: 'default-light',
    DARK: 'default-dark'
} as const;

/**
 * 设置命名空间
 */
export const THEME_SETTINGS_NAMESPACE = 'theme' as const;

/**
 * 浅色主题默认 HSL 值
 */
export const LIGHT_THEME_VALUES: Record<string, string> = {
    [CSS_VARS.BACKGROUND]: '0 0% 100%',
    [CSS_VARS.FOREGROUND]: '240 10% 3.9%',
    [CSS_VARS.PRIMARY]: '212 100% 50%',
    [CSS_VARS.PRIMARY_FOREGROUND]: '0 0% 98%',
    [CSS_VARS.SECONDARY]: '210 40% 96.1%',
    [CSS_VARS.SECONDARY_FOREGROUND]: '222 47% 11%',
    [CSS_VARS.MUTED]: '240 5% 96%',
    [CSS_VARS.MUTED_FOREGROUND]: '240 4% 46%',
    [CSS_VARS.ACCENT]: '220 14% 96%',
    [CSS_VARS.ACCENT_FOREGROUND]: '222 47% 11%',
    [CSS_VARS.DESTRUCTIVE]: '0 84.2% 60.2%',
    [CSS_VARS.DESTRUCTIVE_FOREGROUND]: '210 40% 98%',
    [CSS_VARS.BORDER]: '240 6% 90%',
    [CSS_VARS.INPUT]: '220 13% 91%',
    [CSS_VARS.RING]: '222.2 84% 4.9%',
    [CSS_VARS.RADIUS]: '0.5rem',
    [CSS_VARS.CARD]: '0 0% 100%',
    [CSS_VARS.CARD_FOREGROUND]: '222 47% 11%',
    [CSS_VARS.POPOVER]: '0 0% 100%',
    [CSS_VARS.POPOVER_FOREGROUND]: '222 47% 11%',
    [CSS_VARS.SIDEBAR_BACKGROUND]: '240 5% 98%',
    [CSS_VARS.SIDEBAR_FOREGROUND]: '215 20% 40%',
    [CSS_VARS.SIDEBAR_ACTIVE]: '0 0% 100%',
    [CSS_VARS.SIDEBAR_HOVER]: '220 14% 95%',
    [CSS_VARS.HEADER_BACKGROUND]: '0 0% 100%',
    [CSS_VARS.HEADER_FOREGROUND]: '222 47% 11%',
    [CSS_VARS.EDITOR_BACKGROUND]: '0 0% 100%',
    [CSS_VARS.TABLE_BORDER]: '220 13% 91%',
    [CSS_VARS.TABLE_HEADER_BG]: '220 14% 96%',
    [CSS_VARS.TABLE_HEADER_FG]: '220 9% 46%',
    [CSS_VARS.TABLE_ROW_HOVER]: '220 14% 98%',
    [CSS_VARS.CODE_INLINE_BG]: '220 14% 96%',
    [CSS_VARS.CODE_INLINE_FG]: '0 84% 60%'
};

/**
 * 深色主题默认 HSL 值
 */
export const DARK_THEME_VALUES: Record<string, string> = {
    [CSS_VARS.BACKGROUND]: '222.2 84% 4.9%',
    [CSS_VARS.FOREGROUND]: '210 40% 98%',
    [CSS_VARS.PRIMARY]: '212 100% 50%',
    [CSS_VARS.PRIMARY_FOREGROUND]: '222.2 47.4% 11.2%',
    [CSS_VARS.SECONDARY]: '217.2 32.6% 17.5%',
    [CSS_VARS.SECONDARY_FOREGROUND]: '210 40% 98%',
    [CSS_VARS.MUTED]: '217.2 32.6% 17.5%',
    [CSS_VARS.MUTED_FOREGROUND]: '215 20.2% 65.1%',
    [CSS_VARS.ACCENT]: '217.2 32.6% 17.5%',
    [CSS_VARS.ACCENT_FOREGROUND]: '210 40% 98%',
    [CSS_VARS.DESTRUCTIVE]: '0 62.8% 30.6%',
    [CSS_VARS.DESTRUCTIVE_FOREGROUND]: '210 40% 98%',
    [CSS_VARS.BORDER]: '217.2 32.6% 17.5%',
    [CSS_VARS.INPUT]: '217.2 32.6% 17.5%',
    [CSS_VARS.RING]: '212.7 26.8% 83.9%',
    [CSS_VARS.RADIUS]: '0.5rem',
    [CSS_VARS.CARD]: '222.2 84% 4.9%',
    [CSS_VARS.CARD_FOREGROUND]: '210 40% 98%',
    [CSS_VARS.POPOVER]: '222.2 84% 4.9%',
    [CSS_VARS.POPOVER_FOREGROUND]: '210 40% 98%',
    [CSS_VARS.SIDEBAR_BACKGROUND]: '222.2 84% 4.9%',
    [CSS_VARS.SIDEBAR_FOREGROUND]: '215 20.2% 65.1%',
    [CSS_VARS.SIDEBAR_ACTIVE]: '217.2 32.6% 17.5%',
    [CSS_VARS.SIDEBAR_HOVER]: '217.2 32.6% 12%',
    [CSS_VARS.HEADER_BACKGROUND]: '222.2 84% 4.9%',
    [CSS_VARS.HEADER_FOREGROUND]: '210 40% 98%',
    [CSS_VARS.EDITOR_BACKGROUND]: '222.2 84% 4.9%',
    [CSS_VARS.TABLE_BORDER]: '217.2 32.6% 17.5%',
    [CSS_VARS.TABLE_HEADER_BG]: '217.2 32.6% 17.5%',
    [CSS_VARS.TABLE_HEADER_FG]: '210 40% 98%',
    [CSS_VARS.TABLE_ROW_HOVER]: '217.2 32.6% 12%',
    [CSS_VARS.CODE_INLINE_BG]: '217.2 32.6% 17.5%',
    [CSS_VARS.CODE_INLINE_FG]: '0 72% 65%'
};
