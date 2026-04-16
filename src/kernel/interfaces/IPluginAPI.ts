/**
 * IPluginAPI - 受限的插件 API 接口 (Facade Pattern)
 * 
 * 核心契约
 * 用于限制第三方扩展插件对 Kernel 的直接访问。
 * 
 * 设计原则:
 * 1. 仅暴露必要的注册方法
 * 2. 隐藏 Kernel 内部实现
 * 3. 提供类型安全的服务获取
 * 
 * 使用场景:
 * - src/modules/extensions/ 下的第三方插件
 * - 需要安全隔离的插件
 */

import { IEditorTab, ITabService } from './ITabService';
import { IFileSystem } from './IFileSystem';
import { UISlotId } from '@/kernel/core/Constants';

/**
 * UI 注册选项
 */
export interface IUIRegistrationOptions {
    slotId: UISlotId;
    component: React.ComponentType<any>;
    order?: number;
}

/**
 * 命令注册选项
 */
export interface ICommandRegistrationOptions {
    id: string;
    label: string;
    handler: () => void | Promise<void>;
    shortcut?: string;
}

/**
 * 菜单注册选项
 */
export interface IMenuRegistrationOptions {
    menuId: string;
    itemId: string;
    label: string;
    action: () => void | Promise<void>;
    shortcut?: string;
    order?: number;
}

/**
 * IPluginAPI - 受限的插件 API
 */
export interface IPluginAPI {
    // === 服务获取 (受限) ===

    /**
     * 获取文件系统服务
     */
    getFileSystem(): IFileSystem;

    /**
     * 获取标签页服务 (只读子集)
     */
    getTabService(): Pick<ITabService, 'getTabs' | 'getActiveTabId' | 'getTab'>;

    // === 注册方法 ===

    /**
     * 注册 UI 组件到插槽
     */
    registerUI(options: IUIRegistrationOptions): () => void;

    /**
     * 注册命令
     */
    registerCommand(options: ICommandRegistrationOptions): () => void;

    /**
     * 注册菜单项
     */
    registerMenuItem(options: IMenuRegistrationOptions): () => void;

    // === 事件系统 ===

    /**
     * 订阅事件
     */
    on(event: string, handler: (...args: any[]) => void): () => void;

    /**
     * 发射事件
     */
    emit(event: string, payload?: any): void;

    // === 生命周期 ===

    /**
     * 插件上下文 ID
     */
    readonly pluginId: string;

    /**
     * 日志输出 (带插件前缀)
     */
    log(message: string, ...args: any[]): void;
}
