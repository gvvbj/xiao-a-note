/**
 * EditorPlugin - 编辑器核心插件
 * 
 * 重构后的纯 wiring 入口
 * 
 * 职责:
 * 1. 注册编辑器相关 Registries 和 Services
 * 2. 初始化 EditorController (业务逻辑)
 * 3. 加载 EditorCoreUIPlugin
 * 
 * 遵循原则:
 * - Plugin-First: 业务逻辑在 EditorController
 * - 0 硬编码: 使用常量和服务
 */

import { EditorToolbarRegistry } from './registries/EditorToolbarRegistry';
import { EditorPanelRegistry } from './registries/EditorPanelRegistry';
import { EditorExportService } from './plugins/common/ExportPlugin/services/EditorExportService';
import { EditorExtensionRegistry } from './registries/EditorExtensionRegistry';
import { CommandRegistry } from './registries/CommandRegistry';
import { MarkdownDecorationRegistry } from './registries/MarkdownDecorationRegistry';
import { EditorController } from './services/EditorController';
import { EditorActionService } from './services/EditorActionService';
import { SplitPreviewHostService } from './services/SplitPreviewHostService';
import { EditorEngineSwitchService, EDITOR_ENGINE_SWITCH_SERVICE_ID } from './services/EditorEngineSwitchService';
import { registerEditorUIActions } from './services/registerEditorUIActions';

import { IPlugin, IPluginContext, PluginCategory } from '@/kernel/system/plugin/types';
import { ServiceId } from '@/kernel/core/ServiceId';
import { LoggerService } from '@/kernel/services/LoggerService';
import { SPLIT_PREVIEW_HOST_SERVICE_ID } from '@/modules/interfaces';

export default class EditorPlugin implements IPlugin {
  id = "editor";
  name = "Editor Core";
  version = "1.0.0";
  category = PluginCategory.EDITOR;
  essential = true;

  private _logger?: any;
  private _controller?: EditorController;
  private _engineSwitchService?: EditorEngineSwitchService;
  private _cleanups: Array<() => void> = [];

  activate(context: IPluginContext) {
    const kernel = context.kernel;

    // 使用 LoggerService
    const loggerService = kernel.getService<LoggerService>(ServiceId.LOGGER, false);
    this._logger = loggerService?.createLogger('EditorPlugin');
    this._logger?.info('Activating EditorPlugin...');

    // 1. 注册 Registries (按需创建)
    const toolbarRegistry = kernel.getService<EditorToolbarRegistry>(ServiceId.EDITOR_TOOLBAR_REGISTRY, false) || new EditorToolbarRegistry();
    if (!kernel.hasService(ServiceId.EDITOR_TOOLBAR_REGISTRY)) context.registerService(ServiceId.EDITOR_TOOLBAR_REGISTRY, toolbarRegistry);

    const panelRegistry = kernel.getService<EditorPanelRegistry>(ServiceId.EDITOR_PANEL_REGISTRY, false) || new EditorPanelRegistry();
    if (!kernel.hasService(ServiceId.EDITOR_PANEL_REGISTRY)) context.registerService(ServiceId.EDITOR_PANEL_REGISTRY, panelRegistry);

    const commandRegistry = kernel.getService<CommandRegistry>(ServiceId.COMMAND_REGISTRY, false) || new CommandRegistry();
    if (!kernel.hasService(ServiceId.COMMAND_REGISTRY)) context.registerService(ServiceId.COMMAND_REGISTRY, commandRegistry);

    const extensionRegistry = kernel.getService<EditorExtensionRegistry>(ServiceId.EDITOR_EXTENSION_REGISTRY, false) || new EditorExtensionRegistry();
    if (!kernel.hasService(ServiceId.EDITOR_EXTENSION_REGISTRY)) context.registerService(ServiceId.EDITOR_EXTENSION_REGISTRY, extensionRegistry);

    const splitPreviewHostService =
      kernel.getService<SplitPreviewHostService>(SPLIT_PREVIEW_HOST_SERVICE_ID, false) || new SplitPreviewHostService();
    if (!kernel.hasService(SPLIT_PREVIEW_HOST_SERVICE_ID)) context.registerService(SPLIT_PREVIEW_HOST_SERVICE_ID, splitPreviewHostService);

    const editorActionService =
      kernel.getService<EditorActionService>(ServiceId.EDITOR_ACTIONS, false) || new EditorActionService(kernel);
    if (!kernel.hasService(ServiceId.EDITOR_ACTIONS)) context.registerService(ServiceId.EDITOR_ACTIONS, editorActionService);

    const decorationRegistry = kernel.getService<MarkdownDecorationRegistry>(ServiceId.MARKDOWN_DECORATION_REGISTRY, false);
    if (!decorationRegistry) {
      this._logger?.warn('markdownDecorationRegistry not found, should be registered by PluginManager.');
    }

    const engineSwitchService =
      kernel.getService<EditorEngineSwitchService>(EDITOR_ENGINE_SWITCH_SERVICE_ID, false) || new EditorEngineSwitchService(kernel);
    if (!kernel.hasService(EDITOR_ENGINE_SWITCH_SERVICE_ID)) context.registerService(EDITOR_ENGINE_SWITCH_SERVICE_ID, engineSwitchService);
    this._engineSwitchService = engineSwitchService;
    this._engineSwitchService.init();

    // 3. (Optional) 架构心跳检查
    this._logger?.info('Editor Core Framework activated');

    // 4. 初始化 Controller (架构编排逻辑)
    this._controller = new EditorController(kernel, this._logger);
    this._controller.init();
    this._cleanups = registerEditorUIActions(kernel);

    this._logger?.info('EditorPlugin activated');
  }

  deactivate() {
    this._cleanups.forEach((cleanup) => cleanup());
    this._cleanups = [];
    this._controller?.dispose();
    this._engineSwitchService = undefined;
    this._logger?.info('EditorPlugin deactivated');
  }
}

