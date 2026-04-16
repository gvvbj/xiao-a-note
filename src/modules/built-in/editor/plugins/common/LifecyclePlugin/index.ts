/**
 * LifecyclePlugin - 文件生命周期管理插件
 * 
 * 核心职责:
 * - 注册 LifecycleService 到内核
 * - 监听文件切换事件并委托给 Service 处理
 * 
 * 注意：本文件仅负责注册，所有业务逻辑在 services/LifecycleService.ts
 */

import { IPlugin, IPluginContext, PluginCategory } from '@/kernel/system/plugin/types';
import { ServiceId } from '@/kernel/core/ServiceId';
import { LoggerService } from '@/kernel/services/LoggerService';
import { LifecycleService } from './services/LifecycleService';
import { EDITOR_CONSTANTS } from '../../../constants/EditorConstants';

export default class LifecyclePlugin implements IPlugin {
    id = 'editor-lifecycle';
    name = 'Editor Lifecycle Manager';
    version = '1.0.0';
    category = PluginCategory.CORE;
    internal = true;
    essential = true;
    order = 5; // 优先加载，确保其他插件能订阅生命周期事件

    private service: LifecycleService | null = null;
    private _logger?: any;

    activate(context: IPluginContext) {
        const kernel = context.kernel;
        // 使用 LoggerService
        const loggerService = kernel.getService<LoggerService>(ServiceId.LOGGER, false);
        this._logger = loggerService?.createLogger('LifecyclePlugin');

        // 1. 创建并注册服务 (遵循无硬编码原则)
        this.service = new LifecycleService(kernel);
        context.registerService(EDITOR_CONSTANTS.SERVICE_NAMES.LIFECYCLE, this.service);

        this._logger?.info('Activated - LifecycleService registered');
    }

    deactivate() {
        this.service?.dispose();
        this.service = null;
        this._logger?.info('Deactivated');
    }
}

