import { IPlugin, PluginCategory, IPluginContext } from '@/kernel/system/plugin/types';
import { ScrollPositionService } from './services/ScrollPositionService';

/**
 * ScrollPositionPlugin
 *
 * 职责：
 * 标签页切换时保存和恢复编辑器的光标/滚动位置。
 *
 * 保存端：LIFECYCLE_SWITCHING_START → 从 EditorView 读取 → Tab Store
 * 恢复端：LIFECYCLE_FILE_LOADED → 从 payload 读取 → EditorView.requestMeasure
 *
 * 遵循原则：
 * - Plugin-First：零核心修改
 * - 单一职责：只管位置保存/恢复
 * - 所有逻辑在 ScrollPositionService 中实现
 */
export default class ScrollPositionPlugin implements IPlugin {
    id = 'scroll-position-plugin';
    name = '滚动位置恢复';
    version = '1.0.0';
    category = 'editor' as PluginCategory;
    description = '标签页切换时自动保存和恢复光标及滚动位置';

    private service: ScrollPositionService | null = null;

    activate(context: IPluginContext): void {
        this.service = new ScrollPositionService(context.kernel);
        this.service.start();
    }

    deactivate(): void {
        this.service?.dispose();
        this.service = null;
    }
}
