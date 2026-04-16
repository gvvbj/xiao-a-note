import { IPlugin, IPluginContext, PluginCategory } from '@/kernel/system/plugin/types';
import { ServiceId } from '@/kernel/core/ServiceId';
import { LoggerService } from '@/kernel/services/LoggerService';
import { ThemeController } from './services/ThemeController';


/**
 * ThemePlugin - 主题管理插件
 * 
 * 重构版 - 纯 Wiring 入口
 * 
 * 职责:
 * 1. 初始化 ThemeController
 * 2. 在停用时销毁 Controller
 * 
 * 遵循原则:
 * - Plugin-First: index.tsx 只负责 wiring，业务逻辑在 ThemeController
 * - 0 硬编码: 使用 ThemeConstants 中的常量
 */
export default class ThemePlugin implements IPlugin {
    id = 'theme';
    name = '主题管理';
    version = '1.2.0'; // Phase 11 P4 版本升级
    category = PluginCategory.SYSTEM;
    internal = true;
    essential = true;
    order = 5;

    private _controller?: ThemeController;
    private _logger?: any;

    async activate(context: IPluginContext) {
        const { kernel } = context;

        // 使用 LoggerService
        const loggerService = kernel.getService<LoggerService>(ServiceId.LOGGER, false);
        this._logger = loggerService?.createLogger('ThemePlugin');
        this._logger?.info('Activating ThemePlugin...');

        // 初始化控制器（所有业务逻辑在 Controller 中）
        this._controller = new ThemeController(kernel, this._logger);
        await this._controller.init();

        this._logger?.info('ThemePlugin activated successfully');
    }

    deactivate() {
        this._controller?.dispose();
        this._logger?.info('ThemePlugin deactivated');
    }
}

