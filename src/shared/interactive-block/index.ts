/**
 * 交互式块基础设施 - 统一导出入口
 *
 * 提供三态管理、操控面板、复制按钮的统一 API。
 * 内置插件和第三方扩展插件均可使用。
 */

// 类型定义
export type { BlockMode, ICockpitConfig, ICopyButtonConfig } from './types';

// 三态管理器
export { BlockModeManager } from './BlockModeManager';

// 操控面板 UI（支持 IFrame 和 Widget 两种模式）
export {
    getCockpitHtmlForIFrame,
    createCockpitDom,
    COCKPIT_STYLES
} from './CockpitOverlay';

// 复制按钮 Widget
export { CopyButtonWidget, COPY_BUTTON_STYLES } from './CopyButtonWidget';
