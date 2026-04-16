import { IPlugin, IPluginContext, PluginCategory } from "@/kernel/system/plugin/types";
import { UISlotId } from "@/kernel/core/Constants";
import { ServiceId } from '@/kernel/core/ServiceId';
import { LoggerService } from '@/kernel/services/LoggerService';
import { EditorTabs } from "../../../components/EditorTabs";
import { TabManagerController } from './services/TabManagerController';

/**
 * 标签页管理器插件
 * 
 * 重构后的纯 wiring 入口
 * 
 * 职责:
 * 1. 注册 EditorTabs 到 UI 插槽
 * 2. 初始化 TabManagerController
 * 
 * 遵循原则:
 * - Plugin-First: 业务逻辑在 TabManagerController
 * - 0 硬编码: 同步逻辑在 TabSyncService
 */
export default class TabManagerPlugin implements IPlugin {
    id = "tab-manager";
    name = "标签页管理器";
    version = "1.0.0";
    category = PluginCategory.EDITOR;
    internal = true;
    essential = true;
    order = 10;

    private controller: TabManagerController | null = null;
    private logger: any = null;

    activate(context: IPluginContext) {
        const kernel = context.kernel;

        // 使用 LoggerService
        const loggerService = kernel.getService<LoggerService>(ServiceId.LOGGER, false);
        this.logger = loggerService?.createLogger('TabManagerPlugin');

        // 1. 注册到标签页插槽 (通过 context 注册，确保 dispose 追踪)
        context.registerUI(UISlotId.EDITOR_TABS, {
            id: 'editor-tabs-view',
            component: EditorTabs,
            order: 1
        });

        // 2. 初始化控制器 (所有业务逻辑)
        this.controller = new TabManagerController(kernel, this.logger);
        this.controller.init();

        this.logger?.info('TabManagerPlugin activated');
    }

    deactivate() {
        this.controller?.dispose();
        this.controller = null;
        this.logger?.info('TabManagerPlugin deactivated');
    }
}

