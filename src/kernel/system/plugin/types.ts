import type { EditorEngineExtension } from '@/kernel/interfaces/IEditorEngine';
import { Kernel, IUIComponent } from "@/kernel/core/Kernel";
import { IMarkdownPlugin } from "@/kernel/registries/MarkdownPluginRegistry";
import { IDecorationProvider, IEditorToolbarItem, IShortcutItem } from "@/kernel/interfaces/editor-types";
import { UISlotId } from "@/kernel/core/Constants";

// 导出能力接口供外部使用
export * from './capabilities';

import { IExtensionContext, IFullPluginCapabilities } from './capabilities';
import { ILogger } from '@/kernel/services/LoggerService';
import type { AICapability } from '@/kernel/interfaces/IAICapabilityPolicyService';

/**
 * 插件上下文 (暴露给内置插件的完整 API 集合)
 * 
 * 此接口包含所有能力，仅供 internal=true 的插件使用
 * 扩展插件应使用 IExtensionContext (见 capabilities.ts)
 */
export interface IPluginContext extends IFullPluginCapabilities {
    /** 注册 Markdown 语法扩展 (用于导出/解析) */
    registerMarkdownUsage: (plugin: IMarkdownPlugin) => () => void;
    /** 注册 UI 组件到指定插槽 (通用方法) */
    registerUI: (slotId: UISlotId, component: IUIComponent) => () => void;
    /** 注册侧边栏视图 (便捷方法) */
    registerSidebarItem: (id: string, component: React.ComponentType, label?: string, icon?: React.ElementType, order?: number) => () => void;
    /** 注册编辑器头部右侧项目 */
    registerEditorHeaderRightItem: (id: string, component: React.ComponentType, props?: any, order?: number) => () => void;
    /** 注册编辑器模态层项目 */
    registerEditorModal: (id: string, component: React.ComponentType, props?: any, order?: number) => () => void;
    /** 注册编辑器扩展 */
    registerEditorExtension: (extension: EditorEngineExtension) => () => void;
    /** 注册编辑器顶部栏项目 (如全屏、分屏按钮) */
    registerEditorHeaderItem: (id: string, component: React.ComponentType, props?: any, order?: number) => () => void;
    /** 注册 Markdown 实时预览装饰 (Math, Image, Table 等) */
    registerMarkdownDecorationProvider: (provider: IDecorationProvider) => () => void;
    /** 注册编辑器工具栏项目 (如粗体、列表等) */
    registerEditorToolbarItem: (item: IEditorToolbarItem) => () => void;
    /** 注册全局命令 */
    registerCommand: (command: ICommandDefinition) => () => void;
    /** 注册/重写系统服务 (仅内置插件) */
    registerService: (id: string, service: any) => () => void;
    /** 注册插件专属 CSS 样式 */
    registerStyle: (id: string, css: string) => () => void;
    /** 注册插件专属编辑器按键映射 */
    registerEditorKeymap: (extension: EditorEngineExtension) => () => void;
    /** 注册快捷键元数据到 ShortcutRegistry */
    registerShortcut: (item: IShortcutItem) => () => void;
    /** 批量注册快捷键元数据 */
    registerShortcuts: (items: IShortcutItem[]) => () => void;
    /** 注册 IFrame 桥接信号处理器 */
    registerIFrameSignal: (type: string, handler: (iframe: HTMLIFrameElement, data: any) => void) => () => void;
    /** 核心 Kernel 实例 (仅内置插件可访问) */
    kernel: Kernel;
}

/**
 * 插件类别
 */
export enum PluginCategory {
    CORE = 'core',         // 核心功能 (Explorer, Outline 等)
    EDITOR = 'editor',     // 编辑器增强 (Markdown 扩展, 装饰等)
    UI = 'ui',             // UI 界面扩展 (状态栏信息, 自定义按钮等)
    SYSTEM = 'system',     // 系统级插件 (插件管理, 主题管理等)
    OTHER = 'other'
}

/**
 * 插件激活触发器类型
 * 定义插件延迟激活的条件类型
 */
export type PluginActivationTrigger =
    | { type: 'syntax'; pattern: RegExp }                   // 当文档内容匹配特定语法时激活
    | { type: 'event'; eventName?: string; eventNames?: string[] } // 当特定事件发生时激活 (支持单个或多个)
    | { type: 'manual' };                                   // 仅手动激活

/**
 * 插件隔离级别
 */
export enum IsolationLevel {
    /** Tier 0: 无隔离 (内置核心插件) */
    NONE = 'none',
    /** Tier 1: 样式隔离 (Shadow DOM) */
    SHADOW = 'shadow',
    /** Tier 2: 硬隔离 (IFrame) */
    IFRAME = 'iframe'
}

/**
 * 隔离渲染载荷
 * Tier 2 插件不直接绘制 DOM，而是提供此载荷由内核渲染进 IFrame
 */
export interface IIsolatedRenderPayload {
    /** 渲染出的 HTML 字符串 */
    html: string;
    /** 组件专属样式 (CSS 字符串) */
    css?: string;
    /** 脚本载荷 (可选，安全沙箱内执行) */
    scripts?: string[];
}

/**
 * 隔离渲染提供者
 */
export interface IIsolatedRenderer {
    /** 响应的语法节点类型 */
    nodeTypes: string[];
    /** 所属插件 ID (用于诊断与生命周期追踪) */
    ownerPluginID?: string;
    /** 获取渲染载荷 (如果返回 null 则跳过隔离渲染) */
    getPayload: (node: any, context: any) => IIsolatedRenderPayload | null | Promise<IIsolatedRenderPayload | null>;
}

/**
 * 插件定义接口
 */
export interface IPlugin {
    id: string;
    name: string;
    version: string;
    description?: string;
    author?: string;
    /** 插件类别 */
    category?: PluginCategory;
    /** 是否为内置插件 (在 UI 中默认隐藏) */
    internal?: boolean;
    /** 依赖的其他插件 ID 列表 */
    dependencies?: string[];
    /** 互斥的插件 ID 列表 (激活此插件会自动禁用互斥插件) */
    conflicts?: string[];
    /** 冲突组 ID (New in Architect 2.0)。属于同一组的插件同一时间只能有一个激活。 */
    conflictGroup?: string;
    /** 兼容的引擎 ID 列表（如 ['codemirror', 'prosemirror']）。未声明时按治理策略兜底。 */
    supportedEngines?: string[];
    /** 是否为核心必要插件 (不可禁用，启动失败将尝试重试或阻断流程) */
    essential?: boolean;
    /** 是否在扩展中心隐藏 (如公共库、系统插件) */
    hidden?: boolean;
    /** 加载优先级（越小越早加载，默认为 100） */
    order?: number;
    /** 是否延迟激活 (启动时仅注册，不立即 activate) */
    lazy?: boolean;
    /** 延迟激活的触发条件 */
    activationTrigger?: PluginActivationTrigger;
    /** 静态工具栏项 (允许懒加载插件在未激活时显示按钮) */
    staticToolbarItems?: IEditorToolbarItem[];
    /** 静态命令 (允许懒加载插件在未激活时注册命令) */
    staticCommands?: ICommandDefinition[];
    /** 自动休眠超时时间 (毫秒)，超时后插件将释放内存并返回懒加载状态 */
    hibernationTimeout?: number;
    /** 强制隔离级别 (由内核审计决定) */
    isolationLevel?: IsolationLevel;
    /** 运行时模块导出（供插件沙箱按需注入） */
    getRuntimeModules?: () => Record<string, unknown>;
    /** 插件激活回调 */
    aiCapabilities?: AICapability[];
    activate: (context: IPluginContext) => void;
    /** 插件停用回调 */
    deactivate?: () => void;
}

/**
 * 通用命令定义 (Phase 5)
 */
export interface ICommandDefinition {
    /** 唯一标识符 */
    id: string;
    /** 用户可见的标题 */
    title: string;
    /** 分类 (用于分组，如 'Editor', 'Explorer') */
    category?: string;
    /** 处理函数 */
    handler: (...args: any[]) => void;
    /** 图标 (Luicide Icon 类型) */
    icon?: any;
    /** 描述 */
    description?: string;
    /** (可选) 快捷键 */
    keybinding?: string;
    /** (可选) 是否显示在命令面板 */
    showInPalette?: boolean;
}

/**
 * 插件元数据（清单）
 */
export interface IPluginManifest {
    id: string;
    name: string;
    main: string; // 入口文件路径
    version: string;
}
