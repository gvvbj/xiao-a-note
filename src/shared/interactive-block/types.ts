/**
 * 交互式块基础设施 - 共享类型定义
 *
 * 为所有需要三态管理（auto/source/preview）的编辑器块提供统一接口。
 * 支持两种渲染模式：
 *   - Widget 模式：适用于可信库输出（Mermaid SVG、KaTeX 等）
 *   - IFrame 模式：适用于用户原始 HTML/JS（需要隔离）
 */

/**
 * 块的显示模式
 * - auto: 光标离开时渲染预览，进入时回退为源码
 * - preview: 锁定预览态，无论光标是否进入都保持渲染
 * - source: 锁定源码态，无论光标是否离开都显示源码
 */
export type BlockMode = 'auto' | 'source' | 'preview';

/**
 * Cockpit 操控面板配置
 */
export interface ICockpitConfig {
    /** 块起始位置（用于标识） */
    from: number;
    /** 当前模式 */
    mode: BlockMode;
    /** 显示标签（如 'Mermaid'、'HTML Preview'） */
    badge: string;
    /** 模式切换回调（IFrame 渲染模式使用信号，Widget 渲染模式使用此回调） */
    onSetMode?: (pos: number, mode: BlockMode) => void;
}

/**
 * 复制按钮配置
 */
export interface ICopyButtonConfig {
    /** 要复制的源码内容 */
    code: string;
    /** 块起始位置 */
    pos: number;
    /** 切回预览的回调 */
    onSetMode?: (pos: number, mode: BlockMode) => void;
}
