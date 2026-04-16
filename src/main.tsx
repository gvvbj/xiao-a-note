import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

// 引入样式
import '@/shared/styles/index.css';
import '@/shared/styles/cm-live-preview.css';

import { Kernel } from '@/kernel/core/Kernel';
import { ServiceId } from '@/kernel/core/ServiceId';
import { KernelProvider } from '@/kernel/core/KernelContext';
import { ElectronAdapter } from '@/kernel/adapters/ElectronAdapter';
import { ElectronWindowAdapter } from '@/kernel/adapters/ElectronWindowAdapter';
import { PluginManager } from '@/kernel/system/plugin';
import { SettingsService } from '@/kernel/services/SettingsService';
import { LayoutService } from '@/kernel/services/LayoutService';
import { MenuService } from '@/kernel/services/MenuService';
import { CommandRegistry } from '@/kernel/registries/CommandRegistry';
import { EditorExtensionRegistry } from '@/kernel/registries/EditorExtensionRegistry';
import { EditorPanelRegistry } from '@/kernel/registries/EditorPanelRegistry';
import { ShortcutRegistry } from '@/kernel/registries/ShortcutRegistry';
import { MarkedMarkdownService } from '@/kernel/services/MarkedMarkdownService';
import { ThemeService } from '@/kernel/services/ThemeService';
import { TabService } from '@/kernel/services/TabService';
import { ExplorerService } from '@/kernel/services/ExplorerService';
import { EditorService } from '@/kernel/services/EditorService';
import { OutlineService } from '@/kernel/services/OutlineService';
import { WorkspaceService } from '@/kernel/services/WorkspaceService';
import { AICapabilityPolicyService } from '@/kernel/services/AICapabilityPolicyService';
import { UIActionService } from '@/kernel/services/UIActionService';
import { registerCoreUIActions } from '@/kernel/services/registerCoreUIActions';

declare global {
  interface Window {
    Kernel?: Kernel;
  }
}

const kernel = new Kernel();

// 1. 注册底层服务
kernel.registerService(ServiceId.FILE_SYSTEM, new ElectronAdapter());
kernel.registerService(ServiceId.WINDOW, new ElectronWindowAdapter());
kernel.registerService(ServiceId.SETTINGS, new SettingsService());
kernel.registerService(ServiceId.LAYOUT, new LayoutService());
kernel.registerService(ServiceId.MENU, new MenuService());
kernel.registerService(ServiceId.THEME, new ThemeService());
kernel.registerService(ServiceId.TAB, new TabService());
kernel.registerService(ServiceId.EXPLORER, new ExplorerService());
kernel.registerService(ServiceId.EDITOR, new EditorService());
kernel.registerService(ServiceId.OUTLINE, new OutlineService());

// 2. 注册并初始化核心服务
kernel.registerService(ServiceId.WORKSPACE, new WorkspaceService());
const workspaceService = kernel.getService<WorkspaceService>(ServiceId.WORKSPACE);
workspaceService.init(kernel);

kernel.getService<ThemeService>(ServiceId.THEME).init(kernel);
kernel.getService<TabService>(ServiceId.TAB).init(kernel);
kernel.getService<ExplorerService>(ServiceId.EXPLORER).init(kernel);
kernel.getService<EditorService>(ServiceId.EDITOR).init(kernel);
kernel.getService<OutlineService>(ServiceId.OUTLINE).init(kernel);

// 3. 注册编辑器相关基础设施
kernel.registerService(ServiceId.COMMAND_REGISTRY, new CommandRegistry());
kernel.registerService(ServiceId.EDITOR_EXTENSION_REGISTRY, new EditorExtensionRegistry());
kernel.registerService(ServiceId.EDITOR_PANEL_REGISTRY, new EditorPanelRegistry());
kernel.registerService(ServiceId.SHORTCUT_REGISTRY, new ShortcutRegistry());

const mdService = new MarkedMarkdownService();
mdService.setKernel(kernel);
kernel.registerService(ServiceId.MARKDOWN, mdService);

// 4. 初始化插件系统
const pluginManager = new PluginManager(kernel);
kernel.registerService(ServiceId.PLUGIN_MANAGER, pluginManager);
kernel.registerService(ServiceId.AI_CAPABILITY_POLICY, new AICapabilityPolicyService(kernel));
kernel.registerService(ServiceId.UI_ACTIONS, new UIActionService());
registerCoreUIActions(kernel);

(async () => {
  try {
    // [Bootstrap] 引导阶段允许
    console.log('[Bootstrap] Starting async plugin discovery...');
    await pluginManager.loadAutoPlugins();
    console.log('[Bootstrap] Plugins loaded.');
  } catch (e) {
    // [Bootstrap] 引导阶段允许
    console.error('[Bootstrap] Critical error during plugin loading:', e);
  }

  kernel.bootstrap();
  window.Kernel = kernel;

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <KernelProvider kernel={kernel}>
        <App />
      </KernelProvider>
    </React.StrictMode>,
  );
})();
