import { EventEmitter } from 'eventemitter3';
import { isUISlotId, UISlotId } from './Constants';
import { CoreEvents } from './Events';
import { ServiceId } from './ServiceId';
import { MarkdownPluginRegistry } from '../registries/MarkdownPluginRegistry';
import { LayoutService } from '../services/LayoutService';
import { SettingsService } from '../services/SettingsService';
import { MenuService } from '../services/MenuService';
import { loggerService } from '../services/LoggerService';


export interface IUIComponent {
  id: string;
  component: React.ComponentType<any>;
  props?: any;
  icon?: React.ElementType;
  label?: string;
  /** 排序权重，小的在前 */
  order?: number;
  /** 对齐方式 (由 Slot 组件决定如何使用) */
  align?: 'start' | 'center' | 'end';
  /** 附加元数据 */
  meta?: Record<string, any>;
  /** 是否来自扩展插件（用于 UI 渲染隔离，防止 useKernel() 绕过沙箱） */
  isExtension?: boolean;
}

/**
 * KernelEvents — 内核事件总线类型签名
 *
 * 所有事件必须使用 CoreEvents 常量作为键，禁止使用字符串字面量。
 * 这确保了事件类型的唯一性和编译期安全。
 */
export interface KernelEvents {
  // ─── 系统事件 ─────────────────────────────────────────
  [CoreEvents.READY]: void;
  [CoreEvents.UI_UPDATED]: (slotId: UISlotId) => void;

  // ─── 插件/扩展自定义事件（命名空间格式） ───────────────
  [pluginScopedEvent: `${string}:${string}`]: (...args: any[]) => void;

  // ─── 编辑器核心事件 ───────────────────────────────────
  [CoreEvents.OPEN_FILE]: (path: string | null) => void;
  [CoreEvents.EDITOR_FOCUS]: () => void;
  [CoreEvents.CREATE_UNTITLED_TAB]: () => void;
  [CoreEvents.EDITOR_STATE_CHANGED]: (payload: any) => void;
  [CoreEvents.DOCUMENT_CHANGED]: (payload: any) => void;
  [CoreEvents.EDITOR_SCROLL_TO_LINE]: (line: number) => void;
  [CoreEvents.EDITOR_INSERT_TEXT]: (text: string) => void;
  [CoreEvents.EDITOR_SELECT_MATCH]: (payload: { line: number, matchIndex: number, matchLength: number }) => void;
  [CoreEvents.CURSOR_ACTIVITY]: (line: number) => void;
  [CoreEvents.EDITOR_CONTENT_INPUT]: (payload: any) => void;
  [CoreEvents.EDITOR_REQUEST_REFRESH]: () => void;
  [CoreEvents.TOOLBAR_STATE_CHANGED]: (payload: Record<string, boolean>) => void;

  // ─── 编辑器生命周期 ──────────────────────────────────
  [CoreEvents.MAIN_VIEW_READY]: (view: any) => void;
  [CoreEvents.LIFECYCLE_SWITCHING_START]: (payload: any) => void;
  [CoreEvents.LIFECYCLE_FILE_LOADED]: (payload: any) => void;
  [CoreEvents.LIFECYCLE_SWITCHING_FAILED]: (payload: any) => void;

  // ─── 文件操作 ────────────────────────────────────────
  [CoreEvents.REQUEST_SAVE]: (path?: string) => void;
  [CoreEvents.REQUEST_SAVE_CURSOR]: (path?: string) => void;
  [CoreEvents.REQUEST_SAVE_CONTENT]: (pathOrId: string) => void;
  [CoreEvents.SAVE_FILE_REQUEST]: (payload: { path?: string, content?: string, silent?: boolean }) => void;
  [CoreEvents.SAVE_CURSOR_BEFORE_SWITCH]: (prevPath: string) => void;
  [CoreEvents.SYNC_EDITOR_CONTENT]: (payload: any) => void;
  [CoreEvents.SYNC_EDITOR_CONTENT_INTERNAL]: (payload: any) => void;
  [CoreEvents.FILE_SAVED]: (path: string) => void;
  [CoreEvents.SAVE_ALL_FILES]: () => void;

  // ─── UI 触发事件 ─────────────────────────────────────
  [CoreEvents.TRIGGER_IMAGE_UPLOAD]: () => void;
  [CoreEvents.TRIGGER_LINK_MODAL]: () => void;
  [CoreEvents.PREVIEW_IMAGE]: (payload: any) => void;

  // ─── 分屏/视图 ───────────────────────────────────────
  [CoreEvents.SPLIT_VIEW_TAB]: (tabId: string) => void;
  [CoreEvents.CLOSE_SPLIT_VIEW]: () => void;
  [CoreEvents.TOGGLE_SPLIT_VIEW]: () => void;
  [CoreEvents.SPLIT_VIEW_CHANGED]: (isSplit: boolean) => void;
  [CoreEvents.SPLIT_VIEW_TRANSITION_START]: () => void;
  [CoreEvents.EDITOR_SYNC_CONTENT]: (payload: { content: string | (() => string); cursorLine: number; changes?: any }) => void;
  [CoreEvents.PREVIEW_VIEW_READY]: (view: any) => void;

  // ─── 应用命令 ────────────────────────────────────────
  [CoreEvents.APP_CMD_NEW_FILE]: () => void;
  [CoreEvents.APP_CMD_OPEN_FILE]: () => void;
  [CoreEvents.APP_CMD_SAVE]: () => void;
  [CoreEvents.APP_CMD_SAVE_AS]: () => void;
  [CoreEvents.APP_CMD_EXPORT_PDF]: (paths?: string[]) => void;
  [CoreEvents.APP_CMD_EXPORT_WORD]: (paths?: string[]) => void;
  [CoreEvents.APP_CMD_TOGGLE_THEME]: () => void;
  [CoreEvents.APP_CLEAR_STATE]: () => void;

  // ─── 设置 ──────────────────────────────────────────
  [CoreEvents.SETTING_CHANGED]: (payload: { id: string; value: any }) => void;

  // ─── 文件系统 ────────────────────────────────────────
  [CoreEvents.FS_FILE_CHANGED]: (path: string) => void;
  [CoreEvents.FILE_MOVED]: (payload: { oldPath: string, newPath: string }) => void;
  [CoreEvents.FILE_OVERWRITTEN]: (overwrittenPath: string) => void;
  [CoreEvents.FS_FILE_CREATED]: (path: string) => void;
  [CoreEvents.FS_FILE_DELETED]: (path: string) => void;

  // ─── 标签页 ──────────────────────────────────────────
  [CoreEvents.CHECK_TABS_EXISTENCE]: () => void;

  // ─── 资源管理器 ──────────────────────────────────────
  [CoreEvents.REVEAL_IN_EXPLORER]: (path: string) => void;
  [CoreEvents.EXPLORER_SELECT_PATH]: (path: string) => void;
  [CoreEvents.EXPLORER_CREATE_FILE]: (payload?: any) => void;
  [CoreEvents.EXPLORER_CREATE_FOLDER]: (payload?: any) => void;
  [CoreEvents.EXPLORER_SET_FILE_TREE]: (tree: any) => void;

  // ─── 工作区 ──────────────────────────────────────────
  [CoreEvents.WORKSPACE_CHANGED]: (payload: any) => void;

  // ─── 插件系统 ────────────────────────────────────────
  [CoreEvents.PLUGIN_TRIPPED]: (payload: { pluginId: string; message: string; cooldownMs: number }) => void;
  [CoreEvents.PLUGIN_REQUEST_AUTH]: (payload: { pluginId: string; pluginName: string; pluginVersion: string; reason?: string }) => void;
  [CoreEvents.PLUGIN_AUTH_RESPONSE]: (payload: { pluginId: string; decision: 'allow' | 'deny' | 'always-allow' }) => void;

  // ─── 对话框 ──────────────────────────────────────────
  [CoreEvents.APP_SHOW_AUTO_SAVE_DIALOG]: (payload?: any) => void;
  [CoreEvents.APP_SHOW_SHORTCUT_DIALOG]: (payload?: any) => void;
  [CoreEvents.APP_SHOW_MESSAGE_DIALOG]: (payload?: any) => void;
  [CoreEvents.APP_SHOW_SAVE_CONFIRM_DIALOG]: (payload?: any) => void;
  [CoreEvents.APP_SHOW_SETTINGS_DIALOG]: () => void;
}


// Kernel 继承自 EventEmitter3，作为全局事件总线和 IoC 容器
export class Kernel extends EventEmitter<KernelEvents> {
  private services = new Map<string, any>();
  private uiSlots = new Map<UISlotId, IUIComponent[]>();
  private plugins = new Map<string, any>();
  public readonly markdownPlugins = new MarkdownPluginRegistry();
  private isBootstrapped = false;

  constructor() {
    super();
    loggerService.createLogger('Kernel').info('Instance created.');
    this.registerService(ServiceId.LOGGER, loggerService, false);
    loggerService.createLogger('Kernel').info('LoggerService registered.');
  }

  // --- 服务容器 (Service Container) ---
  registerService(id: string, service: any, overwrite: boolean = false) {
    if (this.services.has(id)) {
      if (!overwrite) {
        loggerService.createLogger('Kernel').warn(`Service '${id}' already exists. Use 'overwrite' option to replace it.`);
        throw new Error(`[Kernel] Service '${id}' already exists.`);
      }
      loggerService.createLogger('Kernel').info(`Service '${id}' overwritten.`);
    }
    this.services.set(id, service);
  }

  getService<T>(id: string, required: boolean = true): T {
    const service = this.services.get(id);
    if (!service && required) {
      loggerService.createLogger('Kernel').error(`Service '${id}' not found.`);
      throw new Error(`[Kernel] Service '${id}' not found.`);
    }
    return service as T;
  }

  hasService(id: string): boolean {
    return this.services.has(id);
  }

  // --- UI 插槽系统 (UI Slots) ---
  registerUI(slotId: UISlotId, component: IUIComponent) {
    this.assertValidUISlotId(slotId);
    const components = this.uiSlots.get(slotId) || [];

    const newItem = { order: 100, ...component };

    const index = components.findIndex(c => c.id === component.id);
    if (index >= 0) {
      components[index] = newItem;
    } else {
      components.push(newItem);
    }

    components.sort((a, b) => (a.order || 0) - (b.order || 0));

    this.uiSlots.set(slotId, components);

    // 广播事件通知 React 组件更新
    this.emit(CoreEvents.UI_UPDATED, slotId);

    // 返回销毁函数
    return () => this.unregisterUI(slotId, component.id);
  }

  unregisterUI(slotId: UISlotId, componentId: string) {
    this.assertValidUISlotId(slotId);
    const components = this.uiSlots.get(slotId);
    if (!components) return;

    const initialLength = components.length;
    const newComponents = components.filter(c => c.id !== componentId);

    if (newComponents.length !== initialLength) {
      this.uiSlots.set(slotId, newComponents);
      this.emit(CoreEvents.UI_UPDATED, slotId);
    }
  }

  getUI(slotId: UISlotId): IUIComponent[] {
    this.assertValidUISlotId(slotId);
    return this.uiSlots.get(slotId) || [];
  }

  private assertValidUISlotId(slotId: UISlotId): void {
    if (!isUISlotId(slotId)) {
      loggerService.createLogger('Kernel').error(`Invalid UI slot id: ${slotId}`);
      throw new Error(`[Kernel] Invalid UI slot id: ${slotId}`);
    }
  }

  // --- 插件管理 (Plugin Manager) ---
  loadPlugin(plugin: any) {
    const logger = loggerService.createLogger('Kernel');
    logger.info(`Loading plugin: ${plugin.id}`);
    try {
      plugin.activate(this);
      this.plugins.set(plugin.id, plugin);
    } catch (e) {
      logger.error(`Failed to load plugin ${plugin.id}:`, e);
    }
  }

  /**
   * 启动内核
   * 标记系统初始化完成，并广播 READY 事件
   */
  bootstrap(): void {
    if (this.isBootstrapped) return;

    const logger = loggerService.createLogger('Kernel');
    logger.info('Bootstrapping...');

    this.isBootstrapped = true;

    this.emit(CoreEvents.READY);
    logger.info('Bootstrapped successfully.');
  }
}
