import { IPlugin, IPluginContext, PluginCategory } from '@/kernel/system/plugin/types';
import { UISlotId } from '@/kernel/core/Constants';
import { ServiceId } from '@/kernel/core/ServiceId';
import { LoggerService } from '@/kernel/services/LoggerService';
import { TitleBar } from '@/shared/components/layout/TitleBar';
import { MenuService } from '@/kernel/services/MenuService';
import { registerMenuItems } from './services/MenuRegistrations';

/**
 * TitleBarPlugin - 标题栏插件
 * 
 * 迁移至统一日志系统
 * 
 * 职责:
 * 1. 将 TitleBar 组件注册到 TITLE_BAR 插槽
 * 2. 通过 services/MenuRegistrations 注册核心菜单项
 * 
 * 遵循原则:
 * - Plugin-First: 所有功能通过插件注册
 * - 零硬编码: 菜单项通过 MenuService 动态注册
 * - 目录化: index.ts 仅注册，逻辑在 services/
 */
export default class TitleBarPlugin implements IPlugin {
    id = 'titlebar';
    name = '标题栏';
    version = '1.0.0';
    category = PluginCategory.CORE;
    internal = true;
    essential = true;
    order = 1; // 优先加载

    private _cleanups: (() => void)[] = [];
    private _logger?: any;

    activate(context: IPluginContext) {
        const { kernel } = context;

        // 使用 LoggerService
        const loggerService = kernel.getService<LoggerService>(ServiceId.LOGGER, false);
        this._logger = loggerService?.createLogger('TitleBarPlugin');
        this._logger?.info('Activating TitleBarPlugin...');

        // 1. 注册 TitleBar 组件到插槽
        const unregisterUI = context.registerUI(UISlotId.TITLE_BAR, {
            id: 'titlebar-main',
            component: TitleBar,
            order: 0
        });
        this._cleanups.push(unregisterUI);

        // 2. 确保 MenuService 存在
        if (!kernel.hasService(ServiceId.MENU)) {
            context.registerService(ServiceId.MENU, new MenuService());
        }
        const menuService = kernel.getService<MenuService>(ServiceId.MENU);

        // 3. 注册所有菜单项 (逻辑已抽离到 services/)
        const menuCleanups = registerMenuItems(kernel, menuService);
        this._cleanups.push(...menuCleanups);

        this._logger?.info('TitleBarPlugin activated successfully (Dynamic Menu)');
    }

    deactivate() {
        this._cleanups.forEach(fn => fn());
        this._cleanups = [];
        this._logger?.info('TitleBarPlugin deactivated');
    }
}

