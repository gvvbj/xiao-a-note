import { IPlugin, PluginCategory, IPluginContext } from '@/kernel/system/plugin/types';
import { HistoryService } from './services/HistoryService';

/**
 * EditorHistoryPlugin - 编辑器历史管理插件
 * 
 * 职责：
 * - 拦截并隔离撤销记录
 * - 确保内核组件不包含历史处理逻辑
 */
export default class EditorHistoryPlugin implements IPlugin {
    id = 'editor-history';
    name = 'Editor History Manager';
    category = PluginCategory.CORE;
    internal = true;
    essential = true;
    version = '1.0.0';
    order = 100; // 确保在 EditorPlugin (Registry) 初始化后加载

    private service?: HistoryService;

    activate(context: IPluginContext) {
        this.service = new HistoryService(context.kernel);
        this.service.start();

        context.logger.info('Activated - History tracking isolated.');
    }

    deactivate() {
        this.service?.dispose();
    }
}
