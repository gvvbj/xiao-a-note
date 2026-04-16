/**
 * ExportPlugin
 *
 * 全局导出功能插件
 * 处理 APP_CMD_EXPORT_PDF / APP_CMD_EXPORT_WORD / APP_CMD_SAVE_AS 相关导出与另存为弹窗挂载
 *
 * 遵循 Plugin-First 原则:
 * - 所有导出逻辑集中在 services/ExportService
 * - 通过事件与其他模块通信
 * - 完全可插拔，禁用后不影响核心功能
 * - index.ts 仅注册，逻辑在 services/
 */

import { IPlugin, IPluginContext, PluginCategory } from '@/kernel/system/plugin/types';
import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import { LoggerService } from '@/kernel/services/LoggerService';
import { handleGlobalExport } from './services/ExportService';
import { EditorExportService } from './services/EditorExportService';
import { ExportModals } from './components/ExportModals';
import { UISlotId } from '@/kernel/core/Constants';

export default class ExportPlugin implements IPlugin {
    id = 'export';
    name = '导出功能';
    version = '1.0.0';
    category = PluginCategory.EDITOR;
    internal = true;
    essential = false;
    order = 100;

    // 懒加载配置：在触发导出或另存为指令时激活
    // 说明：SaveAsDialog 由 ExportModals 挂载在 EDITOR_MODALS 插槽，因此必须保证首次另存为也能激活本插件。
    lazy = true;
    activationTrigger = {
        type: 'event' as const,
        eventNames: [CoreEvents.APP_CMD_EXPORT_PDF, CoreEvents.APP_CMD_EXPORT_WORD, CoreEvents.APP_CMD_SAVE_AS]
    };

    private cleanups: (() => void)[] = [];

    activate(context: IPluginContext) {
        const kernel = context.kernel;
        const logger = kernel.getService<LoggerService>(ServiceId.LOGGER, false)?.createLogger('ExportPlugin');

        // 1. 注册弹窗 UI
        context.registerUI(UISlotId.EDITOR_MODALS, { id: 'export-modals', component: ExportModals });

        // 2. 注册事件监听 (逻辑已抽离到 services/)
        const handlePdf = (paths?: string[]) => handleGlobalExport(kernel, 'pdf', paths || []);
        const handleWord = (paths?: string[]) => handleGlobalExport(kernel, 'word', paths || []);

        kernel.on(CoreEvents.APP_CMD_EXPORT_PDF, handlePdf);
        kernel.on(CoreEvents.APP_CMD_EXPORT_WORD, handleWord);

        this.cleanups.push(
            () => kernel.off(CoreEvents.APP_CMD_EXPORT_PDF, handlePdf),
            () => kernel.off(CoreEvents.APP_CMD_EXPORT_WORD, handleWord)
        );

        // 3. 注册核心服务 (通过 context 注册，确保 dispose 追踪)
        const exportService = new EditorExportService(kernel);
        context.registerService(ServiceId.EDITOR_EXPORT, exportService);

        logger?.info('Activated - export handlers and service registered');
    }

    deactivate() {
        this.cleanups.forEach(fn => fn());
        this.cleanups = [];
    }
}

