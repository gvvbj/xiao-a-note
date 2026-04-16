import { List } from 'lucide-react';
import { UISlotId } from '@/kernel/core/Constants';
import { IPlugin, IPluginContext, PluginCategory } from '@/kernel/system/plugin/types';
import { OutlineSidebar } from './components/OutlineSidebar';
import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import { LoggerService } from '@/kernel/services/LoggerService';
import { parseOutline } from './utils/parser';
import { OutlineService } from '@/kernel/services/OutlineService';

/**
 * OutlinePlugin - 大纲插件
 * 
 * 职责：
 * 1. 注册大纲侧边栏 UI
 * 2. 监听文档变更事件并更新大纲数据
 */
export default class OutlinePlugin implements IPlugin {
  id = 'outline';
  name = '大纲';
  version = '1.0.0';
  category = PluginCategory.CORE;
  internal = true;
  essential = true;
  order = 5;


  private _logger?: any;
  private _dispose?: () => void;

  activate(context: IPluginContext) {
    const kernel = context.kernel;

    // 使用 LoggerService
    const loggerService = kernel.getService<LoggerService>(ServiceId.LOGGER, false);
    this._logger = loggerService?.createLogger('OutlinePlugin');
    this._logger?.info('Activating OutlinePlugin...');

    const outlineService = kernel.getService<OutlineService>(ServiceId.OUTLINE, false);

    // 1. 注册到侧边栏
    context.registerUI(UISlotId.LEFT_SIDEBAR, {
      id: 'outline-sidebar',
      icon: List,
      label: '大纲',
      component: OutlineSidebar,
      order: 2
    });

    // 2. 监听内容变更同步大纲
    const handleDocChange = (payload: { content: string, path: string | null }) => {
      if (!payload.content || !outlineService) return;
      try {
        const outline = parseOutline(payload.content);
        outlineService.setHeaders(outline);
      } catch (err) {
        this._logger?.error('解析大纲失败', err);
      }
    };

    kernel.on(CoreEvents.DOCUMENT_CHANGED, handleDocChange);
    this._dispose = () => {
      kernel.off(CoreEvents.DOCUMENT_CHANGED, handleDocChange);
    };

    this._logger?.info('OutlinePlugin activated successfully');
  }

  deactivate() {
    this._dispose?.();
    this._logger?.info('OutlinePlugin deactivated');
  }
}

