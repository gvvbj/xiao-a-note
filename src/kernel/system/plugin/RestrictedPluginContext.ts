/**
 * RestrictedPluginContext - 受限的第三方插件上下文
 * 
 * 插件沙箱与权限控制
 * 
 * 设计目标:
 * 1. 为非内部插件 (internal: false) 提供受限访问
 * 2. 不暴露 Kernel 实例，仅提供安全的注册方法
 * 3. 通过运行时检查实现访问控制
 * 
 * 使用场景:
 * - src/modules/extensions/ 下的第三方插件
 * - 任何 internal !== true 的插件
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
import {
    createSandboxKernelProxy,
    emitSandboxedEvent,
    getSandboxedService,
} from './security/sandbox/SandboxProxyFactory';

type ToolbarRenderProps = Parameters<NonNullable<IEditorToolbarItem['render']>>[0];

interface IPluginErrorRecorder {
    recordPluginError(pluginId: string, error: unknown): void;
}

/**
 * 错误消息常量
 */
const SANDBOX_ERROR_MESSAGES = {
    KERNEL_ACCESS_DENIED: 'Direct kernel access is not allowed for third-party plugins. Use the provided API methods instead.',
    SERVICE_REGISTRATION_DENIED: 'Service registration is not allowed for third-party plugins.',
    SERVICE_ACCESS_DENIED: 'Service access denied for third-party plugin.',
} as const;

/**
 * RestrictedPluginContext - 受限的插件上下文
 * 
 * 实现 IPluginContext 但限制某些高权限操作
 * 用于非内部插件 (internal !== true)
 */
export class RestrictedPluginContext implements IPluginContext {
    private _kernel: Kernel;
    private _pluginId: string;
    private _disposables: (() => void)[] = [];
    private _editorRegistry: EditorExtensionRegistry;
    private _decorationRegistry: MarkdownDecorationRegistry;
    private _logger: ILogger;
    /** 缓存的 Kernel 受限代理（惰性创建，避免重复实例化） */
    private _kernelProxy: Kernel | null = null;
    /** 是否已发出 kernel 访问警告（仅首次警告） */
    private _kernelAccessWarned: boolean = false;
    /** 是否已发出 on() 审计日志（仅首次） */
    private _onAuditLogged: boolean = false;

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

    // === RESTRICTED: Kernel 受限代理 ===
    /**
     * 返回受限的 Kernel 代理（不再抛异常）
     * 所有通过 kernel 的调用自动路由到沙箱过滤后的方法：
     * - kernel.emit()       → this.emit() (带事件过滤)
     * - kernel.getService() → this.getService() (带三级过滤)
     * - kernel.on()         → this.on()
     * - 其他属性/方法       → undefined + 警告
     */
    get kernel(): Kernel {
        if (!this._kernelAccessWarned) {
            this._logger.warn(
                `[Sandbox] 插件 "${this._pluginId}" 访问了 context.kernel。` +
                `建议使用 context.emit() / context.getService() / context.on() 等安全方法代替。`
            );
            this._kernelAccessWarned = true;
        }
        if (!this._kernelProxy) {
            this._kernelProxy = this._createKernelProxy();
        }
        return this._kernelProxy!;
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

    // === 事件与服务访问 (安全代理) ===
    /**
     * 监听全局事件
     * 安全性: 纯监听，不修改任何状态
     */
    on(event: string, handler: (...args: any[]) => void): () => void {
        // S3: 审计日志 — 记录第三方插件监听的事件（仅首次记录提示，后续仅记录事件名）
        if (!this._onAuditLogged) {
            this._logger.info(
                `[Sandbox-Audit] 插件 "${this._pluginId}" 开始监听事件，首个事件: "${event}"`
            );
            this._onAuditLogged = true;
        }
        const eventName = this._toKernelEventName(event);
        this._kernel.on(eventName, handler as never);
        const dispose = () => this._kernel.off(eventName, handler as never);
        this._disposables.push(dispose);
        return dispose;
    }

    /**
     * 发射全局事件（受限）
     * 仅允许发射白名单中的事件，防止扩展插件触发系统核心命令
     */
    emit(event: string, ...args: any[]): void {
        emitSandboxedEvent(this._kernel, event, args, {
            actorId: this._pluginId,
            actorType: 'plugin',
            logger: this._logger,
        });
    }

    /**
 * 获取已注册的系统服务（受限）
 * 
 * 三级访问控制:
 * 1. 白名单 (SANDBOX_ALLOWED_SERVICES): 直接返回原始引用
 * 2. 受限代理 (SANDBOX_PROXIED_SERVICES): 返回 Proxy 包装版本，限制危险操作
 * 3. 禁止 (SANDBOX_DENIED_SERVICES): 返回 undefined 并记录警告
 * 4. 未知服务: 返回 undefined 并记录警告
 */
    getService<T = any>(id: string): T | undefined {
        return getSandboxedService<T>(this._kernel, id, {
            actorId: this._pluginId,
            actorType: 'plugin',
            logger: this._logger,
        });
    }

    /**
     * 创建受限的 Kernel 代理
     * 将 emit / getService / on 路由到本实例的沙箱方法
     * 其他属性/方法返回 undefined
     */
    private _createKernelProxy(): Kernel {
        return createSandboxKernelProxy({
            kernel: this._kernel,
            actorId: this._pluginId,
            actorType: 'plugin',
            logger: this._logger,
            on: (event, handler) => this.on(event, handler as (...args: any[]) => void),
            off: (event, handler) => {
                const eventName = this._toKernelEventName(event);
                this._kernel.off(eventName, handler as never);
            },
        });
    }

    // === UI 注册 (IPluginContext - 允许) ===
    registerUI(slotId: UISlotId, component: IUIComponent): () => void {
        // 自动标记来自扩展插件的 UI 组件
        // UISlot 会根据此标记将组件包裹在 RestrictedKernelProvider 中
        // 防止扩展组件通过 useKernel() 绕过沙箱
        const safeComponent: IUIComponent = { ...component, isExtension: true };
        const dispose = this._kernel.registerUI(slotId, safeComponent);
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

    // === 编辑器扩展 (允许) ===
    /**
     * 增强版注册：捕获扩展运行时错误并转发到熔断机制
     */
    registerEditorExtension(extension: EditorEngineExtension): () => void {
        const id = uuidv4();
        const pluginId = this._pluginId;
        const kernel = this._kernel;

        // 尝试包装扩展以捕获运行时错误
        // 注意：CodeMirror 扩展是声明式的，无法直接包装
        // 但我们可以在全局错误边界中处理，这里主要是记录来源
        const dispose = this._editorRegistry.register(id, extension);
        this._disposables.push(dispose);

        // 注册一个全局错误监听器，用于追踪插件来源
        // 这个监听器会在 window.onerror 中被调用
        const errorHandler = (event: ErrorEvent) => {
            // 检查错误堆栈中是否包含此插件的标识
            // 这是一个保守的启发式方法，可能有误报
            if (event.error?.stack?.includes(pluginId) || event.message?.includes(pluginId)) {
                const pluginManager = kernel.getService<IPluginErrorRecorder>(ServiceId.PLUGIN_MANAGER, false);
                if (pluginManager?.recordPluginError) {
                    pluginManager.recordPluginError(pluginId, event.error);
                }
            }
        };

        window.addEventListener('error', errorHandler);
        this._disposables.push(() => window.removeEventListener('error', errorHandler));

        return dispose;
    }

    registerEditorKeymap(extension: EditorEngineExtension): () => void {
        const id = uuidv4();
        const dispose = this._editorRegistry.register(id, extension);
        this._disposables.push(dispose);
        return dispose;
    }

    // === Markdown 装饰 (允许) ===
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

    // === 工具栏 (允许) ===
    registerEditorToolbarItem(item: IEditorToolbarItem): () => void {
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

    // === 命令注册 (允许，带命名空间强制) ===
    /**
     * S1: 强制命名空间前缀，防止命令 ID 劫持
     * 第三方插件注册的命令 ID 自动加上 ext:{pluginId}: 前缀
     */
    registerCommand(command: ICommandDefinition): () => void {
        const prefix = `ext:${this._pluginId}:`;
        const safeCommand: ICommandDefinition = {
            ...command,
            id: command.id.startsWith(prefix) ? command.id : `${prefix}${command.id}`,
        };

        if (safeCommand.id !== command.id) {
            this._logger.info(
                `[Sandbox] 命令 "${command.id}" 已重命名为 "${safeCommand.id}"（命名空间隔离）`
            );
        }

        const commandRegistry = this._kernel.getService<CommandRegistry>(ServiceId.COMMAND_REGISTRY, false);
        if (commandRegistry) {
            const dispose = commandRegistry.registerCommand(safeCommand);
            this._disposables.push(dispose);
            return dispose;
        } else {
            const eventName = this._toKernelEventName(safeCommand.id);
            this._kernel.on(eventName, safeCommand.handler as never);
            const dispose = () => this._kernel.off(eventName, safeCommand.handler as never);
            this._disposables.push(dispose);
            return dispose;
        }
    }

    // === RESTRICTED: 服务注册 - 禁止 ===
    registerService(_id: string, _service: any): () => void {
        this._logger.warn(SANDBOX_ERROR_MESSAGES.SERVICE_REGISTRATION_DENIED);
        return () => { };
    }

    // === Markdown 语法扩展 (允许，带安全包裹) ===
    registerMarkdownUsage(plugin: IMarkdownPlugin): () => void {
        // 安全措施 1: 自动添加插件 ID 前缀，防止 ID 冲突
        const safePlugin: IMarkdownPlugin = {
            ...plugin,
            id: `ext:${this._pluginId}:${plugin.id}`,
            // 安全措施 2: 包裹 apply 方法，捕获异常防止单插件崩溃影响全局渲染
            apply: (md: any) => {
                try {
                    plugin.apply(md);
                } catch (e) {
                    this._logger.error(`[Sandbox] Markdown plugin "${plugin.id}" apply() failed:`, e);
                }
            },
            // 安全措施 3: 包裹 postProcess，捕获异常并降级返回原始 HTML
            postProcess: plugin.postProcess
                ? async (html: string) => {
                    try {
                        return await plugin.postProcess!(html);
                    } catch (e) {
                        this._logger.error(`[Sandbox] Markdown plugin "${plugin.id}" postProcess() failed:`, e);
                        return html; // 降级：返回未处理的 HTML
                    }
                }
                : undefined,
        };

        const dispose = this._kernel.markdownPlugins.register(safePlugin);
        this._disposables.push(dispose);

        this._logger.info(`Markdown plugin "${plugin.id}" registered (owner: ${this._pluginId})`);
        return dispose;
    }

    // === 信号注册 ===
    registerIFrameSignal(type: string, handler: (iframe: HTMLIFrameElement, data: any) => void): () => void {
        const dispose = IFrameBridge.registerSignalHandler(type, handler);
        this._disposables.push(dispose);
        return dispose;
    }

    // === 样式注册 (允许，带安全过滤) ===
    /**
     * S2: CSS 安全过滤
     * 过滤危险的 CSS 模式，防止 XSS 和外部资源加载
     */
    registerStyle(id: string, css: string): () => void {
        const styleId = `plugin-style-${this._pluginId}-${id}`;
        if (document.getElementById(styleId)) {
            return () => { };
        }

        // 安全过滤：移除危险 CSS 模式
        const dangerousPatterns = [
            /@import\b/gi,           // 禁止加载外部资源
            /expression\s*\(/gi,     // 禁止 IE CSS 表达式（XSS 向量）
            /javascript\s*:/gi,      // 禁止 javascript: 协议
            /\burl\s*\(\s*["']?data\s*:/gi, // 禁止 data: URI（潜在 XSS）
        ];

        let safeCss = css;
        for (const pattern of dangerousPatterns) {
            if (pattern.test(safeCss)) {
                this._logger.warn(
                    `[Sandbox] 插件 "${this._pluginId}" 的 CSS 包含危险模式 ${pattern.source}，已过滤`
                );
                safeCss = safeCss.replace(pattern, '/* [Sandbox-Filtered] */');
            }
        }

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = safeCss;
        document.head.appendChild(style);

        const dispose = () => {
            const el = document.getElementById(styleId);
            if (el) el.remove();
        };
        this._disposables.push(dispose);
        return dispose;
    }

    // === 快捷键注册 (允许) ===
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
    dispose(): void {
        this._disposables.forEach(fn => fn());
        this._disposables = [];
    }

    getDisposables(): (() => void)[] {
        return [...this._disposables];
    }
}
