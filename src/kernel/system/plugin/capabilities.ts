/**
 * Plugin Capability Interfaces (能力接口)
 * 
 * 标准扩展接口定义
 * 
 * 设计原则:
 * 1. 能力分层 (Capability-Based): 按功能将 API 分组为独立接口
 * 2. 显式契约 (Explicit Contract): 扩展只能使用明确暴露的能力
 * 3. 零硬编码 (Zero Hardcoding): 使用常量/枚举，不硬编码字符串
 * 
 * 使用方:
 * - IPluginContext (内置插件): 拥有所有能力 + Kernel 访问
 * - IExtensionContext (扩展插件): 拥有安全能力，无 Kernel 访问
 */

import type { EditorEngineExtension } from '@/kernel/interfaces/IEditorEngine';
import { IUIComponent } from '@/kernel/core/Kernel';
import { UISlotId } from '@/kernel/core/Constants';
import { IMarkdownPlugin } from '@/kernel/registries/MarkdownPluginRegistry';
import { IDecorationProvider, IEditorToolbarItem, IShortcutItem } from '@/kernel/interfaces/editor-types';
import { ICommandDefinition, IIsolatedRenderer } from './types';
import { ILogger } from '@/kernel/services/LoggerService';

// ============================================================================
// UI 注册能力 (UI Registration Capability)
// ============================================================================
/**
 * UI 注册能力接口
 * 允许插件向系统注册 UI 组件
 */
export interface IUIRegistrationCapability {
    /** 注册 UI 组件到指定插槽 */
    registerUI: (slotId: UISlotId, component: IUIComponent) => () => void;
    /** 注册侧边栏视图 (便捷方法) */
    registerSidebarItem: (
        id: string,
        component: React.ComponentType,
        label?: string,
        icon?: React.ElementType,
        order?: number
    ) => () => void;
    /** 注册编辑器头部右侧项目 */
    registerEditorHeaderRightItem: (
        id: string,
        component: React.ComponentType,
        props?: any,
        order?: number
    ) => () => void;
    /** 注册编辑器模态层项目 */
    registerEditorModal: (
        id: string,
        component: React.ComponentType,
        props?: any,
        order?: number
    ) => () => void;
}

// ============================================================================
// 编辑器扩展能力 (Editor Extension Capability)
// ============================================================================
/**
 * 编辑器扩展能力接口
 * 允许插件扩展 CodeMirror 编辑器
 */
export interface IEditorCapability {
    /** 注册 CodeMirror 扩展 */
    registerEditorExtension: (extension: EditorEngineExtension) => () => void;
    /** 注册编辑器工具栏项目 */
    registerEditorToolbarItem: (item: IEditorToolbarItem) => () => void;
    /** 注册编辑器按键映射 */
    registerEditorKeymap: (extension: EditorEngineExtension) => () => void;
    /** 注册编辑器顶部栏项目 */
    registerEditorHeaderItem: (
        id: string,
        component: React.ComponentType,
        props?: any,
        order?: number
    ) => () => void;
}

// ============================================================================
// Markdown 增强能力 (Markdown Enhancement Capability)
// ============================================================================
/**
 * Markdown 增强能力接口
 * 允许插件增强 Markdown 渲染和解析
 */
export interface IMarkdownCapability {
    /** 注册 Markdown 实时预览装饰器 (非隔离模式) */
    registerMarkdownDecorationProvider: (provider: IDecorationProvider) => () => void;
    /** 注册 Markdown 隔离渲染提供者 (IFrame 模式) */
    registerIsolatedRenderer: (renderer: IIsolatedRenderer) => () => void;
}

/**
 * Markdown 语法能力接口 (仅内置插件)
 * 允许注册自定义 Markdown 语法扩展
 */
export interface IMarkdownSyntaxCapability {
    /** 注册 Markdown 语法扩展 (用于导出/解析) */
    registerMarkdownUsage: (plugin: IMarkdownPlugin) => () => void;
}

// ============================================================================
// 命令能力 (Command Capability)
// ============================================================================
/**
 * 命令能力接口
 * 允许插件注册全局命令
 */
export interface ICommandCapability {
    /** 注册全局命令 */
    registerCommand: (command: ICommandDefinition) => () => void;
}

// ============================================================================
// 样式能力 (Style Capability)
// ============================================================================
/**
 * 样式能力接口
 * 允许插件注册自定义 CSS 样式
 */
export interface IStyleCapability {
    /** 注册插件专属 CSS 样式 */
    registerStyle: (id: string, css: string) => () => void;
}

// ============================================================================
// 快捷键注册能力 (Shortcut Registration Capability)
// ============================================================================
/**
 * 快捷键注册能力接口
 * 允许插件注册快捷键元数据到 ShortcutRegistry
 */
export interface IShortcutCapability {
    /** 注册单个快捷键 */
    registerShortcut: (item: IShortcutItem) => () => void;
    /** 批量注册快捷键 */
    registerShortcuts: (items: IShortcutItem[]) => () => void;
}

// ============================================================================
// 日志能力 (Logging Capability)
// ============================================================================
/**
 * 日志能力接口
 * 允许插件访问统一日志系统
 */
export interface ILoggingCapability {
    /** 日志实例 */
    readonly logger: ILogger;
}

// ============================================================================
// 事件与服务访问能力 (Event & Service Access Capability)
// ============================================================================
/**
 * 事件与服务访问能力接口
 * 允许插件监听/发射事件和获取服务引用（只读）
 * 
 * 安全性：
 * - on/emit: 标准事件通信，无副作用
 * - getService: 只读获取已注册服务，不能注册/覆盖服务
 */
export interface IEventCapability {
    /** 监听全局事件 */
    on: (event: string, handler: (...args: any[]) => void) => () => void;
    /** 发射全局事件 */
    emit: (event: string, ...args: any[]) => void;
    /** 获取已注册的系统服务（只读） */
    getService: <T = any>(id: string) => T | undefined;
}

// ============================================================================
// 服务能力 (Service Capability) - 仅内置插件
// ============================================================================
/**
 * 服务能力接口 (仅内置插件)
 * 允许注册/重写系统服务
 */
export interface IServiceCapability {
    /** 注册/重写系统服务 */
    registerService: (id: string, service: any) => () => void;
}

// ============================================================================
// 组合接口 (Composite Interfaces)
// ============================================================================

/**
 * 扩展上下文接口 (Extension Context)
 * 
 * 用于扩展插件 (src/modules/extensions/)
 * 包含所有安全能力，但不暴露 Kernel 和服务注册
 */
export interface IExtensionContext extends
    IUIRegistrationCapability,
    IEditorCapability,
    IMarkdownCapability,
    IMarkdownSyntaxCapability,
    ICommandCapability,
    IStyleCapability,
    IShortcutCapability,
    ILoggingCapability,
    IEventCapability {
    /** 扩展 ID (只读) */
    readonly extensionId: string;
}

/**
 * 完整插件上下文能力集
 * 
 * 用于内置插件 (src/modules/built-in/)
 * 包含所有能力 + Kernel 访问 + 服务注册
 */
export interface IFullPluginCapabilities extends
    IExtensionContext,
    IMarkdownSyntaxCapability,
    IServiceCapability {
    // Kernel 访问权限由 IPluginContext 单独定义
}
