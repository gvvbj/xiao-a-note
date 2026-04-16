/**
 * PluginContext - 插件上下文实现
 * 
 * 插件沙箱与权限控制
 * 
 * 设计目标:
 * 1. 实现 IPluginContext 接口，与现有插件兼容
 * 2. 自动追踪插件注册的资源以便清理
 * 3. 为未来沙箱限制提供基础
 * 
 * 使用方式:
 * - 由 PluginManager 为每个插件创建独立实例
 * - 插件通过此上下文与系统交互
 */

import { Kernel, type KernelEvents, IUIComponent } from '@/kernel/core/Kernel';
import { UISlotId } from '@/kernel/core/Constants';
import { ServiceId } from '@/kernel/core/ServiceId';
import { IPluginContext, ICommandDefinition, IIsolatedRenderer } from './types';
import { IDecorationProvider, IEditorToolbarItem, IShortcutItem, IIsolatedProvider } from '@/kernel/interfaces/editor-types';
import { IMarkdownPlugin } from '@/kernel/registries/MarkdownPluginRegistry';
import type { EditorEngineExtension } from '@/kernel/interfaces/IEditorEngine';
import { EditorExtensionRegistry } from '@/kernel/registries/EditorExtensionRegistry';
import { MarkdownDecorationRegistry } from '@/kernel/registries/MarkdownDecorationRegistry';
import { CommandRegistry } from '@/kernel/registries/CommandRegistry';
import { ShortcutRegistry } from '@/kernel/registries/ShortcutRegistry';
import { v4 as uuidv4 } from 'uuid';
import { ToolbarItem } from './views/ToolbarItem';
import { loggerService, ILogger } from '@/kernel/services/LoggerService';
import { IFrameBridge } from '@/kernel/services/IFrameBridge';

type ToolbarRenderProps = Parameters<NonNullable<IEditorToolbarItem['render']>>[0];

/**
 * PluginContext 实现
 * 实现 IPluginContext 接口，与 PluginManager 内联创建的上下文保持一致
 */
export class PluginContext implements IPluginContext {
    private _kernel: Kernel;
    private _pluginId: string;
    private _disposables: (() => void)[] = [];
    private _editorRegistry: EditorExtensionRegistry;
    private _decorationRegistry: MarkdownDecorationRegistry;
    private _logger: ILogger;

    constructor(
        kernel: Kernel,
        pluginId: string,
        editorRegistry: EditorExtensionRegistry,
        decorationRegistry: MarkdownDecorationRegistry
    ) {
        this._kernel = kernel;
        this._pluginId = pluginId;
        this._editorRegistry = editorRegistry;
        this._decorationRegistry = decorationRegistry;
        this._logger = loggerService.createLogger(pluginId);
    }

    // === IPluginContext 必需属性 ===
    get kernel(): Kernel {
        return this._kernel;
    }

    get logger(): ILogger {
        return this._logger;
    }

    get extensionId(): string {
        return this._pluginId;
    }

    private _toKernelEventName(event: string): keyof KernelEvents {
        return event as keyof KernelEvents;
    }

    private _toIsolatedProvider(renderer: IIsolatedRenderer): IIsolatedProvider {
        return {
            nodeTypes: renderer.nodeTypes,
            ownerPluginID: renderer.ownerPluginID,
            getPayload: (node, context) => renderer.getPayload(node, context),
        };
    }

    private _createToolbarRenderComponent(render: NonNullable<IEditorToolbarItem['render']>): React.ComponentType<ToolbarRenderProps> {
        return (props: ToolbarRenderProps) => (render(props) ?? null) as React.ReactElement | null;
    }

    // === 事件与服务访问 (直接委托 Kernel) ===
    on(event: string, handler: (...args: any[]) => void): () => void {
        const eventName = this._toKernelEventName(event);
        this._kernel.on(eventName, handler as never);
        const dispose = () => this._kernel.off(eventName, handler as never);
        this._disposables.push(dispose);
        return dispose;
    }

    emit(event: string, ...args: any[]): void {
        this._kernel.emit(this._toKernelEventName(event), ...args);
    }

    getService<T = any>(id: string): T | undefined {
        return this._kernel.getService<T>(id, false);
    }

    // === UI 注册 ===
    registerUI(slotId: UISlotId, component: IUIComponent): () => void {
        const dispose = this._kernel.registerUI(slotId, component);
        this._disposables.push(dispose);
        return dispose;
    }

    registerSidebarItem(
        id: string,
        component: React.ComponentType,
        label?: string,
        icon?: React.ElementType,
        order?: number
    ): () => void {
        const dispose = this._kernel.registerUI(UISlotId.LEFT_SIDEBAR, {
            id,
            component,
            label,
            icon,
            order
        });
        this._disposables.push(dispose);
        return dispose;
    }

    registerEditorHeaderRightItem(id: string, component: React.ComponentType, props?: any, order?: number): () => void {
        return this.registerUI(UISlotId.EDITOR_HEADER_RIGHT, {
            id,
            component,
            props,
            order,
        });
    }

    registerEditorModal(id: string, component: React.ComponentType, props?: any, order?: number): () => void {
        return this.registerUI(UISlotId.EDITOR_MODALS, {
            id,
            component,
            props,
            order,
        });
    }

    registerEditorHeaderItem(id: string, component: React.ComponentType, props?: any, order?: number): () => void {
        const dispose = this._kernel.registerUI(UISlotId.EDITOR_HEADER, {
            id,
            component,
            props,
            order
        });
        this._disposables.push(dispose);
        return dispose;
    }

    // === 编辑器扩展 ===
    registerEditorExtension(extension: EditorEngineExtension): () => void {
        const id = uuidv4();
        const dispose = this._editorRegistry.register(id, extension);
        this._disposables.push(dispose);
        return dispose;
    }

    registerEditorKeymap(extension: EditorEngineExtension): () => void {
        // Keymaps are just extensions in CM6
        const id = uuidv4();
        const dispose = this._editorRegistry.register(id, extension);
        this._disposables.push(dispose);
        return dispose;
    }

    // === Markdown 装饰 ===
    registerMarkdownDecorationProvider(provider: IDecorationProvider): () => void {
        const dispose = this._decorationRegistry.registerProvider(provider);
        this._disposables.push(dispose);
        return dispose;
    }

    registerIsolatedRenderer(renderer: IIsolatedRenderer): () => void {
        // 自动注入插件 ID，用于身份追踪
        renderer.ownerPluginID = this._pluginId;
        const dispose = this._decorationRegistry.registerIsolatedProvider(this._toIsolatedProvider(renderer));
        this._disposables.push(dispose);
        return dispose;
    }

    // === 工具栏 ===
    registerEditorToolbarItem(item: IEditorToolbarItem): () => void {
        // Support custom render components (e.g. InternalToolbarPlugin buttons)
        if (item.type === 'custom' && item.render) {
            const dispose = this._kernel.registerUI(UISlotId.EDITOR_TOOLBAR_ITEMS, {
                id: item.id,
                component: this._createToolbarRenderComponent(item.render),
                order: item.order,
                meta: { group: item.group }
            });
            this._disposables.push(dispose);
            return dispose;
        }

        const dispose = this._kernel.registerUI(UISlotId.EDITOR_TOOLBAR_ITEMS, {
            id: item.id,
            component: ToolbarItem,
            props: {
                id: item.id,
                label: item.label,
                icon: item.icon,
                onClick: item.onClick
            },
            order: item.order,
            meta: { group: item.group }
        });
        this._disposables.push(dispose);
        return dispose;
    }

    // === 命令注册 ===
    registerCommand(command: ICommandDefinition): () => void {
        const commandRegistry = this._kernel.getService<CommandRegistry>(ServiceId.COMMAND_REGISTRY, false);
        if (commandRegistry) {
            const dispose = commandRegistry.registerCommand(command);
            this._disposables.push(dispose);
            return dispose;
        } else {
            // Fallback to kernel event if registry not available
            const eventName = this._toKernelEventName(command.id);
            this._kernel.on(eventName, command.handler as never);
            const dispose = () => this._kernel.off(eventName, command.handler as never);
            this._disposables.push(dispose);
            return dispose;
        }
    }

    // === 服务注册 ===
    registerService(id: string, service: any): () => void {
        this._kernel.registerService(id, service, true);
        const dispose = () => {
            // services are usually persistent or replaced
            this._logger.warn(`Service ${id} unregistration not supported`);
        };
        this._disposables.push(dispose);
        return dispose;
    }

    // === Markdown 渲染插件 ===
    registerMarkdownUsage(plugin: IMarkdownPlugin): () => void {
        const dispose = this._kernel.markdownPlugins.register(plugin);
        this._disposables.push(dispose);
        return dispose;
    }

    // === 信号注册 ===
    registerIFrameSignal(type: string, handler: (iframe: HTMLIFrameElement, data: any) => void): () => void {
        const dispose = IFrameBridge.registerSignalHandler(type, handler);
        this._disposables.push(dispose);
        return dispose;
    }

    // === 样式注册 ===
    registerStyle(id: string, css: string): () => void {
        const styleId = `plugin-style-${id}`;
        if (document.getElementById(styleId)) {
            return () => { };
        }

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = css;
        document.head.appendChild(style);

        const dispose = () => {
            const el = document.getElementById(styleId);
            if (el) el.remove();
        };
        this._disposables.push(dispose);
        return dispose;
    }

    // === 快捷键注册 ===
    registerShortcut(item: IShortcutItem): () => void {
        const registry = this._kernel.getService<ShortcutRegistry>(ServiceId.SHORTCUT_REGISTRY, false);
        if (registry) {
            const dispose = registry.registerItem(item);
            this._disposables.push(dispose);
            return dispose;
        }
        return () => { };
    }

    registerShortcuts(items: IShortcutItem[]): () => void {
        const registry = this._kernel.getService<ShortcutRegistry>(ServiceId.SHORTCUT_REGISTRY, false);
        if (registry) {
            const dispose = registry.registerItems(items);
            this._disposables.push(dispose);
            return dispose;
        }
        return () => { };
    }

    // === 清理 ===

    /**
     * 清理所有注册的资源
     * 由 PluginManager 在停用插件时调用
     */
    dispose(): void {
        this._disposables.forEach(fn => fn());
        this._disposables = [];
    }

    /**
     * 获取所有 disposables (供 PluginManager 使用)
     */
    getDisposables(): (() => void)[] {
        return [...this._disposables];
    }
}
