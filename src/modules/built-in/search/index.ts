import { IPlugin, IPluginContext, PluginCategory } from '@/kernel/system/plugin/types';
import { SearchSidebar } from './components/SearchSidebar';
import { Search } from 'lucide-react';
import { ServiceId } from '@/kernel/core/ServiceId';
import { LoggerService } from '@/kernel/services/LoggerService';

/**
 * SearchPlugin - 全局搜索插件
 * 
 * 职责:
 * 1. 注册搜索侧边栏到 LEFT_SIDEBAR
 * 2. 提供工作区全文搜索功能
 * 
 * 遵循原则:
 * - Plugin-First: 作为标准侧边栏插件注册
 * - 0 硬编码: 搜索逻辑封装在 SearchService 中
 * - 沙箱兼容: 不直接访问 Kernel，使用 IPluginContext 提供的 API
 */
export default class SearchPlugin implements IPlugin {
    id = 'search';
    name = '搜索';
    version = '1.0.0';
    category = PluginCategory.CORE;
    description = '在工作区中搜索文件内容';
    internal = true; // 标记为内置插件
    essential = true; // 核心插件，确保始终激活
    order = 16; // Explorer(10) -> Outline(15) -> Search(16) -> Extension Center
    // 使用 LoggerService

    private _cleanup?: () => void;
    private _logger?: any;

    activate(context: IPluginContext) {
        // 使用 LoggerService
        const kernel = context.kernel;
        const loggerService = kernel.getService<LoggerService>(ServiceId.LOGGER, false);
        this._logger = loggerService?.createLogger('SearchPlugin');
        this._logger?.info('Activating SearchPlugin...');

        // 注册搜索侧边栏
        this._cleanup = context.registerSidebarItem(
            'search',
            SearchSidebar,
            '搜索',
            Search,
            20 // 排在 Explorer (10) 和 Outline (15) 之后
        );

        this._logger?.info('SearchPlugin activated successfully');
    }

    deactivate() {
        this._cleanup?.();
        this._logger?.info('SearchPlugin deactivated');
    }
}


