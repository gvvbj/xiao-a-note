import React from 'react';
import { IPlugin, IPluginContext, PluginCategory } from '@/kernel/system/plugin/types';
import { UISlotId } from '@/kernel/core/Constants';
import { ServiceId } from '@/kernel/core/ServiceId';
import { LoggerService } from '@/kernel/services/LoggerService';
import { Settings } from 'lucide-react';
import { SettingsDialog } from './components/SettingsDialog';
import { SettingsController } from './services/SettingsController';
import { useKernelEvent } from '@/kernel/hooks/useKernelEvent';
import { CoreEvents } from '@/kernel/core/Events';
import { registerSettingsUIActions } from './services/registerSettingsUIActions';

/**
 * SettingsButton - 设置按钮组件
 */
function SettingsButton() {
    const [isOpen, setIsOpen] = React.useState(false);
    useKernelEvent(CoreEvents.APP_SHOW_SETTINGS_DIALOG, () => {
        setIsOpen(true);
    });

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="p-2.5 rounded-lg text-sidebar-foreground hover:text-foreground hover:bg-sidebar-hover transition-all"
                title="设置"
            >
                <Settings className="w-5 h-5" />
            </button>
            < SettingsDialog isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </>
    );
}

/**
 * SettingsPlugin - 统一设置插件
 * 
 * 重构后的纯 wiring 入口
 * 
 * 职责:
 * 1. 注册设置按钮到侧边栏底部
 * 2. 初始化 SettingsController
 * 
 * 遵循原则:
 * - Plugin-First: 业务逻辑在 SettingsController
 * - 0 硬编码: 配置项通过 Controller 注册
 */
export default class SettingsPlugin implements IPlugin {
    id = 'settings';
    name = '设置';
    version = '1.0.0';
    category = PluginCategory.SYSTEM;
    internal = true;
    essential = true; // 设置入口必须可用，避免因持久化禁用状态导致无法恢复
    order = 999; // 最后加载，确保其他插件已注册配置

    private _cleanups: (() => void)[] = [];
    private _logger?: any;
    private _controller?: SettingsController;

    activate(context: IPluginContext) {
        const { kernel } = context;

        // 使用 LoggerService
        const loggerService = kernel.getService<LoggerService>(ServiceId.LOGGER, false);
        this._logger = loggerService?.createLogger('SettingsPlugin');
        this._logger?.info('Activating SettingsPlugin...');

        // 1. 初始化控制器 (所有业务逻辑在 SettingsController)
        this._controller = new SettingsController(
            kernel,
            this.id,
            (id, service) => context.registerService(id, service),
            this._logger
        );
        this._controller.init();

        // 2. 注册设置按钮到侧边栏底部
        const unregisterUI = context.registerUI(UISlotId.SIDEBAR_BOTTOM, {
            id: 'settings-button',
            component: SettingsButton,
            order: 100
        });
        this._cleanups.push(unregisterUI);
        this._cleanups.push(...registerSettingsUIActions(kernel));

        this._logger?.info('SettingsPlugin activated successfully');
    }

    deactivate() {
        this._controller?.dispose();
        this._cleanups.forEach(fn => fn());
        this._cleanups = [];
        this._logger?.info('SettingsPlugin deactivated');
    }
}

