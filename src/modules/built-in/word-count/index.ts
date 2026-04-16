import { IPlugin, IPluginContext, PluginCategory } from '@/kernel/system/plugin/types';
import { WordCountStatusItem } from './WordCountStatusItem';
import { UISlotId } from '@/kernel/core/Constants';
import { ServiceId } from '@/kernel/core/ServiceId';
import { LoggerService } from '@/kernel/services/LoggerService';

/**
 * WordCountPlugin - 字数统计插件
 * 
 * 迁移至统一日志系统
 * 
 * 职责：
 * 在状态栏显示字数和字符数统计
 */
export default class WordCountPlugin implements IPlugin {
    id = 'word-count';
    name = 'Word Count';
    version = '1.0.0';
    category = PluginCategory.UI;
    internal = true;
    essential = true;
    description = 'Displays word and character count in the status bar.';

    private _logger?: any;

    activate(context: IPluginContext) {
        // 使用 LoggerService
        const loggerService = context.kernel.getService<LoggerService>(ServiceId.LOGGER, false);
        this._logger = loggerService?.createLogger('WordCountPlugin');
        this._logger?.info('Activating WordCountPlugin...');

        // 注册到状态栏左侧
        context.registerUI(UISlotId.STATUS_BAR_LEFT, {
            id: 'word-count-display',
            component: WordCountStatusItem,
            order: 10
        });

        this._logger?.info('WordCountPlugin activated successfully');
    }

    deactivate() {
        this._logger?.info('WordCountPlugin deactivated');
    }
}

