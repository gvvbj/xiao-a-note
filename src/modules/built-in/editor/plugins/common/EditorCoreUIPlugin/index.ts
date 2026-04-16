import { IPlugin, IPluginContext, PluginCategory } from '@/kernel/system/plugin/types';
import { UISlotId } from '@/kernel/core/Constants';
import { ServiceId } from '@/kernel/core/ServiceId';
import { LoggerService } from '@/kernel/services/LoggerService';
import { HeaderSlot, ToolbarSlot, MainViewSlot } from './widgets/SlotWrappers';

/**
 * EditorCoreUIPlugin - 负责将核心编辑器组件注册到插槽
 * 
 * 迁移至统一日志系统
 * 
 * 遵循原则:
 * - Plugin-First: 所有 UI 通过插件注册
 * - 目录化: index.ts 仅注册，组件在 widgets/
 */
export default class EditorCoreUIPlugin implements IPlugin {
    id = 'editor-core-ui';
    name = '编辑器核心 UI';
    version = '1.0.0';
    category = PluginCategory.SYSTEM;
    internal = true;

    private _logger?: any;

    async activate(context: IPluginContext) {
        // 使用 LoggerService
        const loggerService = context.kernel.getService<LoggerService>(ServiceId.LOGGER, false);
        this._logger = loggerService?.createLogger('EditorCoreUIPlugin');
        this._logger?.info('Activating EditorCoreUIPlugin...');

        context.registerUI(UISlotId.EDITOR_HEADER, { id: 'core-header', component: HeaderSlot, order: 10 });
        context.registerUI(UISlotId.EDITOR_TOOLBAR, { id: 'core-toolbar', component: ToolbarSlot, order: 20 });
        context.registerUI(UISlotId.MAIN_EDITOR, { id: 'core-main', component: MainViewSlot, order: 30 });

        this._logger?.info('EditorCoreUIPlugin activated successfully');
    }

    deactivate() {
        this._logger?.info('EditorCoreUIPlugin deactivated');
    }
}

