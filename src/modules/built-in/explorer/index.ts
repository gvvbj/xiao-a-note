/**
 * ExplorerPlugin - 资源管理器插件
 * 
 * 重构后的纯 wiring 入口
 * 
 * 职责:
 * 1. 注册 UI 到侧边栏
 * 2. 初始化 ExplorerController (业务逻辑)
 * 
 * 遵循原则:
 * - Plugin-First: index.ts 只负责 wiring，业务逻辑在 ExplorerController
 * - 0 硬编码: 使用常量和服务
 */

import { FileTreeSidebar } from './components/FileTreeSidebar';
import { FolderOpen } from 'lucide-react';
import { WorkspaceService } from '@/kernel/services/WorkspaceService';
import { UISlotId } from '@/kernel/core/Constants';
import { IPlugin, IPluginContext, PluginCategory } from '@/kernel/system/plugin/types';
import { ServiceId } from '@/kernel/core/ServiceId';
import { LoggerService } from '@/kernel/services/LoggerService';
import { ExplorerController } from './services/ExplorerController';
import { WorkspaceActionService } from './services/WorkspaceActionService';
import { registerExplorerUIActions } from './services/registerExplorerUIActions';

export default class ExplorerPlugin implements IPlugin {
  id = 'explorer';
  name = '资源管理器';
  version = '1.0.0';
  category = PluginCategory.CORE;
  internal = true;
  essential = true;
  order = 5;

  private _logger?: any;
  private _controller?: ExplorerController;
  private _cleanups: Array<() => void> = [];

  activate(context: IPluginContext) {
    const kernel = context.kernel;

    // 使用 LoggerService
    const loggerService = kernel.getService<LoggerService>(ServiceId.LOGGER, false);
    this._logger = loggerService?.createLogger('ExplorerPlugin');
    this._logger?.info('Activating ExplorerPlugin...');

    // 1. 注册 workspace 门面服务 (保持向后兼容)
    const workspaceService = kernel.getService<WorkspaceService>(ServiceId.WORKSPACE, false);
    context.registerService(ServiceId.WORKSPACE_FACADE, {
      setProjectRoot: (path: string | null) => workspaceService?.setProjectRoot(path),
      getProjectRoot: () => workspaceService?.getProjectRoot() || null,
    });

    const workspaceActionService =
      kernel.getService<WorkspaceActionService>(ServiceId.WORKSPACE_ACTIONS, false) || new WorkspaceActionService(kernel);
    if (!kernel.hasService(ServiceId.WORKSPACE_ACTIONS)) {
      context.registerService(ServiceId.WORKSPACE_ACTIONS, workspaceActionService);
    }
    this._cleanups = registerExplorerUIActions(kernel);

    // 2. 初始化控制器 (所有业务逻辑在 ExplorerController)
    this._controller = new ExplorerController(kernel, this._logger);
    this._controller.init();

    // 3. 注册 UI
    context.registerUI(UISlotId.LEFT_SIDEBAR, {
      id: 'explorer-sidebar',
      icon: FolderOpen,
      label: '资源管理器',
      component: FileTreeSidebar,
      order: 1
    });

    this._logger?.info('ExplorerPlugin activated successfully');
  }

  deactivate() {
    this._cleanups.forEach((cleanup) => cleanup());
    this._cleanups = [];
    this._controller?.dispose();
    this._logger?.info('ExplorerPlugin deactivated');
  }
}

