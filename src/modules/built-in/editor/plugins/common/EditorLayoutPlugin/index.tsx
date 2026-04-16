import { IPlugin, IPluginContext, PluginCategory } from '@/kernel/system/plugin/types';
import { UISlotId } from '@/kernel/core/Constants';
import { ServiceId } from '@/kernel/core/ServiceId';
import { LoggerService } from '@/kernel/services/LoggerService';
import { SourceToggle, ZenToggle } from '../../../components/sub/EditorLayoutControls';

/**
 * EditorLayoutPlugin - 布局控制插件
 * 
 * 迁移至统一日志系统
 * 
 * 职责: 将布局控制按钮（源码模式、禅模式）注册到编辑器顶部
 */
export default class EditorLayoutPlugin implements IPlugin {
    id = 'editor-layout-controls';
    name = 'Editor Layout Controls';
    version = '1.0.0';
    category = PluginCategory.CORE;
    internal = true;
    essential = true;

    private _logger?: any;

    activate(context: IPluginContext) {
        // 使用 LoggerService
        const loggerService = context.kernel.getService<LoggerService>(ServiceId.LOGGER, false);
        this._logger = loggerService?.createLogger('EditorLayoutPlugin');
        this._logger?.info('Activating EditorLayoutPlugin...');

        // 源码切换 (权重 10)
        context.registerUI(UISlotId.EDITOR_HEADER_RIGHT, {
            id: 'source-toggle',
            component: SourceToggle,
            order: 10
        });

        // 禅模式 (权重 100)
        context.registerUI(UISlotId.EDITOR_HEADER_RIGHT, {
            id: 'zen-toggle',
            component: ZenToggle,
            order: 100
        });

        this._logger?.info('EditorLayoutPlugin activated successfully (Granular controls registered)');
    }

    deactivate() {
        this._logger?.info('EditorLayoutPlugin deactivated');
    }
}

