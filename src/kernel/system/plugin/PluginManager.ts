import { Kernel } from "@/kernel/core/Kernel";
import { CoreEvents } from "@/kernel/core/Events";
import { ServiceId } from "@/kernel/core/ServiceId";
import { EditorExtensionRegistry } from "@/kernel/registries/EditorExtensionRegistry";
import { MarkdownDecorationRegistry } from "@/kernel/registries/MarkdownDecorationRegistry";
import { IPlugin, IPluginContext, ICommandDefinition, PluginCategory } from "./types";
import { PluginContext } from "./PluginContext";
import { RestrictedPluginContext } from "./RestrictedPluginContext";
import { UISlotId } from "@/kernel/core/Constants";
import { SettingsService } from "@/kernel/services/SettingsService";
import { v4 as uuidv4 } from 'uuid';
import { CIRCUIT_BREAKER_CONFIG } from './security/constants/CircuitBreakerConstants';
import { ExtensionLoader } from './ExtensionLoader';
import { IFileSystem } from '@/kernel/interfaces/IFileSystem';
import { loggerService, ILogger } from '@/kernel/services/LoggerService';
import { SystemModuleRegistry } from './SystemModuleRegistry';
import { resolvePluginSecurityProfile, shouldRequestPluginElevation } from './security/guards/PluginSecurityGuard';
import { PluginStateStore } from './governance/PluginStateStore';
import { PluginCircuitBreaker } from './governance/PluginCircuitBreaker';
import { PluginLazyActivationCoordinator } from './governance/PluginLazyActivationCoordinator';
import { PluginHibernationController } from './governance/PluginHibernationController';

interface ILegacyApplyPluginLike {
    apply?: (...args: unknown[]) => unknown;
}

interface IElevationPluginMeta {
    requestElevation?: boolean;
    replaces?: string;
    elevationReason?: string;
}

interface IBufferedLogger {
    error(message: string, error?: unknown): void;
}

/**
 * 插件管理器
 * 负责插件的生命周期管理（加载、激活、卸载）
 */
export class PluginManager {
    private static readonly ENGINE_PLUGIN_ID_PREFIX = 'engine-';
    private static readonly ENGINE_CONFLICT_GROUP = 'editor-engine';
    private static readonly DEFAULT_EDITOR_ENGINE_ID = 'codemirror';
    private static readonly LEGACY_PLUGIN_STATES_NAMESPACE = 'plugin-states';
    private static readonly ENGINE_SCOPED_PLUGIN_STATES_NAMESPACE = 'plugin-states-by-engine';

    private kernel: Kernel;
    private editorRegistry: EditorExtensionRegistry;
    private decorationRegistry: MarkdownDecorationRegistry;
    private plugins = new Map<string, IPlugin>();
    private activePlugins = new Set<string>();
    private pluginDisposables = new Map<string, (() => void)[]>();
    private listeners: (() => void)[] = []; // For UI updates
    private bootstrapErrorBuffer: { message: string, error?: any }[] = [];

    // 外部插件加载器
    private extensionLoader: ExtensionLoader | null = null;
    private logger: ILogger;
    private stateStore: PluginStateStore;
    private circuitBreaker: PluginCircuitBreaker;
    private lazyActivationCoordinator: PluginLazyActivationCoordinator;
    private hibernationController: PluginHibernationController;

    constructor(kernel: Kernel) {
        this.kernel = kernel;
        this.logger = loggerService.createLogger('PluginManager');
        this.stateStore = new PluginStateStore(
            () => this.kernel.getService<SettingsService>(ServiceId.SETTINGS, false),
            {
                legacy: PluginManager.LEGACY_PLUGIN_STATES_NAMESPACE,
                byEngine: PluginManager.ENGINE_SCOPED_PLUGIN_STATES_NAMESPACE,
            },
        );
        this.circuitBreaker = new PluginCircuitBreaker(this.logger, {
            errorWindowMs: CIRCUIT_BREAKER_CONFIG.ERROR_WINDOW_MS,
            errorThreshold: CIRCUIT_BREAKER_CONFIG.ERROR_THRESHOLD,
            cooldownMs: CIRCUIT_BREAKER_CONFIG.COOLDOWN_MS,
        });
        this.lazyActivationCoordinator = new PluginLazyActivationCoordinator(
            this.kernel,
            this.logger,
            {
                getPlugin: (pluginId) => this.plugins.get(pluginId),
                activatePlugin: (pluginId) => {
                    void this.activatePlugin(pluginId);
                },
                registerStaticCapabilities: (plugin) => this.registerStaticCapabilities(plugin),
            },
        );
        this.hibernationController = new PluginHibernationController(
            this.logger,
            {
                getActivePluginIds: () => this.activePlugins.values(),
                getPlugin: (pluginId) => this.plugins.get(pluginId),
                deactivatePlugin: (pluginId) => this.deactivatePlugin(pluginId),
                requeuePlugin: (plugin) => this.lazyActivationCoordinator.requeuePlugin(plugin),
            },
        );

        // Try to retrieve existing registries first to avoid overwrite (Bug 2 Fix)
        if (this.kernel.hasService(ServiceId.EDITOR_EXTENSION_REGISTRY)) {
            this.editorRegistry = this.kernel.getService<EditorExtensionRegistry>(ServiceId.EDITOR_EXTENSION_REGISTRY);
        } else {
            this.editorRegistry = new EditorExtensionRegistry();
            this.kernel.registerService(ServiceId.EDITOR_EXTENSION_REGISTRY, this.editorRegistry);
        }

        if (this.kernel.hasService(ServiceId.MARKDOWN_DECORATION_REGISTRY)) {
            this.decorationRegistry = this.kernel.getService<MarkdownDecorationRegistry>(ServiceId.MARKDOWN_DECORATION_REGISTRY);
        } else {
            this.decorationRegistry = new MarkdownDecorationRegistry();
            this.kernel.registerService(ServiceId.MARKDOWN_DECORATION_REGISTRY, this.decorationRegistry);
        }
    }

    /**
     * 加载插件 (Register only, potentially activate if enabled by default)
     * 支持懒加载：如果 plugin.lazy 为 true，则仅注册但不激活
     */
    loadPlugin(plugin: IPlugin) {
        if (this.plugins.has(plugin.id)) {
            this.logger.warn(`Plugin ${plugin.id} already loaded.`);
            return;
        }

        this.plugins.set(plugin.id, plugin);

        if (plugin.lazy === true && !plugin.essential) {
            this.logger.info(`Plugin ${plugin.id} is lazy. Deferring activation.`);
            this.lazyActivationCoordinator.deferPlugin(plugin);
            this.lazyActivationCoordinator.refreshTriggerListeners();
            return;
        }

        // Check stored state to see if it should be active
        const states = this.stateStore.loadLegacyStates() || {};

        const shouldActivate = states[plugin.id] !== false || !!plugin.essential;

        if (shouldActivate) {
            this.activatePlugin(plugin.id);
        }
    }

    /**
     * 自动加载所有插件 (Core + User)
     * 利用 Vite import.meta.glob 实现编译期静态扫描，运行时异步加载
     */
    async loadAutoPlugins() {
        this.logger.info('Starting auto-discovery...');

        // 扫描所有插件目录
        // 采用分类目录结构：built-in (内置), extensions (扩展), syntax (语法)
        // 路径规则：从 kernel/system/plugin 向上三级到 modules
        const modules = import.meta.glob([
            // === 系统核心插件 ===
            './PluginSystemPlugin.ts',

            // === 分类目录下的插件 ===
            '../../../modules/built-in/*/index.{ts,tsx}',
            '../../../modules/built-in/*/plugins/*.{ts,tsx}',
            '../../../modules/built-in/*/plugins/*/index.{ts,tsx}',  // 支持模块化插件目录
            '../../../modules/built-in/*/plugins/common/*.{ts,tsx}',
            '../../../modules/built-in/*/plugins/common/*/index.{ts,tsx}',
            '../../../modules/built-in/*/plugins/engine-controls/*.{ts,tsx}',
            '../../../modules/built-in/*/plugins/engine-controls/*/index.{ts,tsx}',
            '../../../modules/built-in/*/plugins/engines/*/*.{ts,tsx}',
            '../../../modules/built-in/*/plugins/engines/*/*/index.{ts,tsx}',
            '../../../modules/syntax/*/index.{ts,tsx}',
            '../../../modules/syntax/*/*.{ts,tsx}',

            // === 第三方扩展插件 ===
            '../../../modules/extensions/*/index.{ts,tsx}'
        ], { eager: false });

        const pendingPlugins: IPlugin[] = [];

        // --- 处理通过 Vite 编译扫描到的内置插件 ---
        for (const path in modules) {
            try {
                // 异步加载每个插件模块
                // 如果某个模块文件路径错误或包含语法错误，这里会抛出异常
                const moduleImport = await modules[path]();
                const module: any = moduleImport;
                let plugin: IPlugin | null = null;

                // 1. 尝试获取 Default Export
                if (module.default) {
                    if (typeof module.default === 'function') {
                        // Case A: Class (needs instantiation)
                        try {
                            const PluginClass = module.default;
                            plugin = new PluginClass();
                        } catch (e) {
                            this.logger.error(`Failed to instantiate plugin at ${path}`, e);
                        }
                    } else if (typeof module.default === 'object') {
                        // Case B: Object Instance (Legacy Plugins)
                        plugin = module.default;
                    }
                }

                // 2. 验证插件有效性
                const legacyPlugin = plugin as ILegacyApplyPluginLike;
                if (plugin && plugin.id && (typeof plugin.activate === 'function' || typeof legacyPlugin.apply === 'function')) {
                    // 统一处理插件元数据与安全标记
                    this.preparePlugin(plugin, path);
                    // 在加载外部插件前，先让内部插件完成运行时模块注入（如 @codemirror/*）
                    this.registerPluginRuntimeModules(plugin);
                    pendingPlugins.push(plugin);
                }
            } catch (e) {
                // 单个插件加载失败不应阻塞整个应用 (例如：语法错误导致编译/Fetch失败)
                const logMsg = `Failed to load plugin module at ${path}. This plugin will be skipped.`;
                this.logger.error(logMsg, e);

                // 尝试记录日志。如果日志服务还没好（冷启动阶段），先存入缓冲区。
                this.logToBootstrapBuffer(logMsg, e);
            }
        }

        // 加载外部便携式插件（依赖上一步注入后的 SystemModuleRegistry）
        let externalPlugins: IPlugin[] = [];
        const fileSystem = this.kernel.getService<IFileSystem>(ServiceId.FILE_SYSTEM, false);
        if (fileSystem) {
            if (!this.extensionLoader) {
                this.extensionLoader = new ExtensionLoader(fileSystem);
            }
            try {
                externalPlugins = await this.extensionLoader.loadAllPlugins();
                this.logger.info(`Discovered ${externalPlugins.length} external dynamic plugins.`);
            } catch (e) {
                this.logger.error('Failed to load external plugins:', e);
            }
        }

        // 将外部插件并入待加载列表
        externalPlugins.forEach(p => this.preparePlugin(p));
        pendingPlugins.push(...externalPlugins);

        // 3. 排序 (Sort by Order ASC)
        // 0 (Core/Theme) -> 10 (Markdown) -> 20 (Sync) -> 50 (Toolbar) -> 100 (General)
        pendingPlugins.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));

        this.logger.info(`Discovered ${pendingPlugins.length} plugins. Loading sequence:`, pendingPlugins.map(p => `${p.id}(${p.order})`));

        // 4. 依次加载与激活
        for (const plugin of pendingPlugins) {
            this.loadPlugin(plugin);
        }

        // 设置懒加载插件的触发器监听
        this.lazyActivationCoordinator.refreshTriggerListeners();

        // 启动插件休眠监视器
        this.hibernationController.start();

        this.notify();
    }

    /**
     * 插件加载前的预处理
     * 处理安全标记、隐藏规则、默认顺序等
     * @param plugin 插件实例
     * @param path 可选的物理路径（用于内置插件鉴权）
     */
    private preparePlugin(plugin: IPlugin, path?: string) {
        // 1. 设置默认优先级
        if (plugin.order === undefined) {
            plugin.order = 100;
        }

        // 2. 根据物理路径强制设置权限
        const securityProfile = resolvePluginSecurityProfile(plugin, path);
        if (securityProfile.pathSpoofingMessage) {
            this.logger.warn(`${securityProfile.pathSpoofingMessage} Plugin: ${plugin.id}`);
        }
        plugin.internal = securityProfile.isInternal;

        // 3. 自动隐藏公共库和系统插件
        if (securityProfile.shouldHide) {
            plugin.hidden = true;
        }

        // 4. 统一注入 ID 映射规则 (如果缺失)
        if (!plugin.id) {
            this.logger.error(`preparePlugin: Missing ID for plugin`, plugin);
        }
    }

    /**
     * 从内部插件注入运行时模块到沙箱模块注册表。
     * 典型场景：引擎插件注入 @codemirror/*，供外部插件同步 require。
     */
    private registerPluginRuntimeModules(plugin: IPlugin) {
        if (plugin.internal !== true || typeof plugin.getRuntimeModules !== 'function') {
            return;
        }

        try {
            const runtimeModules = plugin.getRuntimeModules();
            if (!runtimeModules || Object.keys(runtimeModules).length === 0) {
                return;
            }

            SystemModuleRegistry.registerRuntimeModules(runtimeModules);
            this.logger.info(`Registered ${Object.keys(runtimeModules).length} runtime modules from plugin ${plugin.id}.`);
        } catch (e) {
            this.logger.error(`Failed to register runtime modules from plugin ${plugin.id}`, e);
        }
    }

    /**
     * 激活插件
     * 支持异步授权流程：当第三方插件声明 requestElevation 时，
     * 等待用户通过授权弹窗决定是否给予完整权限。
     */
    async activatePlugin(pluginId: string) {
        if (this.activePlugins.has(pluginId)) return;

        // 熔断检查：冷却期内的插件禁止激活
        if (this.circuitBreaker.isTripped(pluginId)) {
            this.logger.warn(`Plugin ${pluginId} is tripped (circuit breaker). Activation blocked.`);
            return;
        }

        const plugin = this.plugins.get(pluginId);
        if (!plugin) {
            this.logger.error(`Plugin ${pluginId} not found.`);
            return;
        }

        // Check dependencies (New in Phase 4)
        const missingDeps = this.checkDependencies(plugin);
        if (missingDeps.length > 0) {
            this.logger.warn(`Cannot activate ${pluginId}, missing dependencies: ${missingDeps.join(', ')}`);
            return;
        }

        // Check conflicts (Phase 7 - Conflict Management)
        if (plugin.conflicts && plugin.conflicts.length > 0) {
            plugin.conflicts.forEach(conflictId => {
                if (this.activePlugins.has(conflictId)) {
                    this.logger.info(`Deactivating conflicting plugin ${conflictId} for ${pluginId}`);
                    this.deactivatePlugin(conflictId);
                }
            });
        }

        // Check Conflict Groups (New in Architect 2.0)
        // 如果新激活的插件属于某个 conflictGroup，则必须关闭该组内现有的其他插件
        if (plugin.conflictGroup) {
            this.activePlugins.forEach(activeId => {
                const activePlugin = this.plugins.get(activeId);
                if (activePlugin && activePlugin.id !== pluginId && activePlugin.conflictGroup === plugin.conflictGroup) {
                    this.logger.info(`Deactivating sibling plugin ${activeId} because of conflict group '${plugin.conflictGroup}'`);
                    this.deactivatePlugin(activeId);
                }
            });
        }

        this.logger.info(`Activating plugin ${pluginId}...`);
        this.hibernationController.recordActivity(pluginId);

        // 使用 PluginContext 或 RestrictedPluginContext
        // 根据插件的 internal 标志决定使用哪种上下文
        // internal: true  -> PluginContext (完整访问)
        // internal: false -> RestrictedPluginContext (受限访问，禁止直接访问 Kernel)
        const isInternalPlugin = plugin.internal === true;

        // 权限提升检查
        // 当扩展插件声明 requestElevation 时，通过授权弹窗让用户决定
        let useFullContext = isInternalPlugin;
        const elevationMeta = plugin as IPlugin & IElevationPluginMeta;
        if (shouldRequestPluginElevation(elevationMeta)) {
            useFullContext = await this._requestElevation(pluginId, plugin);
        }

        // 使用联合类型以支持 dispose() 和 getDisposables() 方法
        const context: PluginContext | RestrictedPluginContext = useFullContext
            ? new PluginContext(
                this.kernel,
                pluginId,
                this.editorRegistry,
                this.decorationRegistry
            )
            : new RestrictedPluginContext(
                this.kernel,
                pluginId,
                this.editorRegistry,
                this.decorationRegistry
            );

        // 记录上下文类型用于调试
        if (!isInternalPlugin) {
            const modeLabel = useFullContext ? 'PluginContext (elevated)' : 'RestrictedPluginContext (sandbox mode)';
            this.logger.info(`Plugin ${pluginId} using ${modeLabel}`);
        }

        try {
            plugin.activate(context);

            // 关键改进：必须在 activate 执行后捕获 disposables
            // 否则插件在 activate 期间动态注册的新资源（如 IsolatedRenderer）不会被持久化，
            // 导致插件停用时无法被正确卸载（造成“僵尸”渲染器抢占管线）。
            this.pluginDisposables.set(pluginId, context.getDisposables());

            this.activePlugins.add(pluginId);
            this.stateStore.saveLegacyStates(this.collectCurrentPluginStates());
            this.logger.info(`Plugin ${pluginId} activated successfully.`);
            this.notify();

            // 关键改进：每激活一个插件，都尝试探测并冲刷缓冲区。
            // 这样一旦 'common-utils.logger' 插件激活并注册，之前的语法错误就会被补录。
            this.tryFlushBufferedErrors();
        } catch (e) {
            const errorMsg = `Error activating plugin ${pluginId}`;
            this.logger.error(errorMsg, e);
            this.logToBootstrapBuffer(errorMsg, e);

            // Cleanup on failure - 使用 context.dispose() 清理所有注册资源
            context.dispose();
            this.deactivatePlugin(pluginId);
        }
    }

    /**
     * 请求用户授权 — 通过事件驱动的弹窗流程
     *
     * 流程：
     * 1. 先检查 localStorage 是否有 "始终允许" 的持久化决定
     * 2. 如果没有，emit PLUGIN_REQUEST_AUTH 触发弹窗
     * 3. 等待 PLUGIN_AUTH_RESPONSE 事件回复
     * 4. 超时 30 秒自动拒绝
     *
     * @returns true = 给予完整权限, false = 保持沙箱
     */
    private async _requestElevation(pluginId: string, plugin: IPlugin): Promise<boolean> {
        const elevationMeta = plugin as IPlugin & IElevationPluginMeta;
        this.logger.info(
            `Plugin ${pluginId} requests elevation (replaces: ${elevationMeta.replaces || 'none'}). ` +
            `Requesting user authorization...`
        );

        return new Promise<boolean>((resolve) => {
            let settled = false;

            // 一次性监听授权响应
            const onResponse = (payload: { pluginId: string; decision: string }) => {
                if (payload.pluginId !== pluginId || settled) return;
                settled = true;
                this.kernel.off(CoreEvents.PLUGIN_AUTH_RESPONSE, onResponse);
                clearTimeout(timer);

                const allowed = payload.decision === 'allow' || payload.decision === 'always-allow';
                this.logger.info(
                    `Plugin ${pluginId} authorization result: ${payload.decision} → ${allowed ? 'PluginContext' : 'RestrictedPluginContext'}`
                );
                resolve(allowed);
            };

            // 超时 30 秒 → 自动拒绝（安全默认值）
            const timer = setTimeout(() => {
                if (settled) return;
                settled = true;
                this.kernel.off(CoreEvents.PLUGIN_AUTH_RESPONSE, onResponse);
                this.logger.warn(`Plugin ${pluginId} authorization timed out (30s). Defaulting to sandbox mode.`);
                resolve(false);
            }, 30000);

            this.kernel.on(CoreEvents.PLUGIN_AUTH_RESPONSE, onResponse);

            // 发射授权请求 → 触发 plugin-auth-dialog 弹窗
            this.kernel.emit(CoreEvents.PLUGIN_REQUEST_AUTH, {
                pluginId,
                pluginName: plugin.name || pluginId,
                pluginVersion: plugin.version || 'unknown',
                reason: elevationMeta.elevationReason
            });
        });
    }

    /**
     * 停用插件
     */
    deactivatePlugin(pluginId: string) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin || !this.activePlugins.has(pluginId)) return;

        if (plugin.deactivate) {
            try {
                plugin.deactivate();
            } catch (e) {
                this.logger.error(`Error deactivating plugin ${pluginId}:`, e);
            }
        }

        const disposables = this.pluginDisposables.get(pluginId) || [];
        disposables.forEach(dispose => dispose());
        this.pluginDisposables.delete(pluginId);

        this.activePlugins.delete(pluginId);
        this.hibernationController.clearActivity(pluginId);
        this.stateStore.saveLegacyStates(this.collectCurrentPluginStates());
        this.logger.info(`Plugin ${pluginId} deactivated.`);
        this.notify();
    }

    /**
     * 切换插件状态
     */
    togglePlugin(pluginId: string) {
        if (this.activePlugins.has(pluginId)) {
            this.deactivatePlugin(pluginId);
        } else {
            this.activatePlugin(pluginId);
        }
    }

    isPluginActive(pluginId: string): boolean {
        return this.activePlugins.has(pluginId);
    }

    subscribe(listener: () => void) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notify() {
        this.listeners.forEach(l => l());
    }

    /**
     * 获取已加载的插件列表
     */
    getPlugins(): IPlugin[] {
        return Array.from(this.plugins.values());
    }

    /**
     * 判定插件是否兼容指定引擎。
     * 治理策略：
     * 1. 插件显式声明 supportedEngines 时，以声明为准。
     * 2. 引擎插件（conflictGroup=editor-engine）默认兼容其自身引擎。
     * 3. EDITOR 类插件未声明时，默认仅兼容 codemirror（保守策略）。
     * 4. 其他类别插件未声明时，默认兼容全部。
     */
    isPluginCompatibleWithEngine(pluginOrId: string | IPlugin, engineId: string): boolean {
        const plugin = this.resolvePlugin(pluginOrId);
        if (!plugin) {
            return false;
        }

        const normalizedEngineId = this.normalizeEngineId(engineId);
        if (!normalizedEngineId) {
            return true;
        }

        const supportedEngines = this.resolveSupportedEngines(plugin);
        if (!supportedEngines || supportedEngines.length === 0) {
            return true;
        }

        return supportedEngines.includes(normalizedEngineId);
    }

    /**
     * 读取指定引擎的插件状态快照。
     * 若目标引擎尚无分层数据，且为 codemirror，则回退到历史 plugin-states。
     */
    getPluginStatesForEngine(engineId: string): Record<string, boolean> {
        const normalizedEngineId = this.normalizeEngineId(engineId);
        if (!normalizedEngineId) {
            return {};
        }

        const byEngineStates = this.stateStore.loadStatesByEngine();
        const scopedStates = byEngineStates[normalizedEngineId];
        if (scopedStates) {
            return { ...scopedStates };
        }

        if (normalizedEngineId === PluginManager.DEFAULT_EDITOR_ENGINE_ID) {
            return this.stateStore.loadLegacyStates();
        }

        return {};
    }

    /**
     * 覆盖写入指定引擎的插件状态快照。
     */
    savePluginStatesForEngine(engineId: string, states: Record<string, boolean>): void {
        const normalizedEngineId = this.normalizeEngineId(engineId);
        if (!normalizedEngineId) {
            return;
        }

        this.stateStore.saveStatesForEngine(normalizedEngineId, states);
    }

    /**
     * 更新指定引擎下单个插件的启用状态。
     */
    updatePluginStateForEngine(engineId: string, pluginId: string, enabled: boolean): void {
        const scopedStates = this.getPluginStatesForEngine(engineId);
        scopedStates[pluginId] = enabled;
        this.savePluginStatesForEngine(engineId, scopedStates);
    }

    /**
     * 按当前 activePlugins 快照写入指定引擎状态。
     */
    saveCurrentActiveStatesForEngine(engineId: string): void {
        this.savePluginStatesForEngine(engineId, this.collectCurrentPluginStates());
    }

    private resolvePlugin(pluginOrId: string | IPlugin): IPlugin | undefined {
        if (typeof pluginOrId === 'string') {
            return this.plugins.get(pluginOrId);
        }
        return pluginOrId;
    }

    private resolveSupportedEngines(plugin: IPlugin): string[] | null {
        if (plugin.supportedEngines && plugin.supportedEngines.length > 0) {
            return plugin.supportedEngines
                .map(engineId => this.normalizeEngineId(engineId))
                .filter((engineId): engineId is string => engineId.length > 0);
        }

        if (plugin.conflictGroup === PluginManager.ENGINE_CONFLICT_GROUP) {
            const inferredEngineId = this.extractEngineIdFromPluginId(plugin.id);
            if (inferredEngineId) {
                return [inferredEngineId];
            }
        }

        if (plugin.category === PluginCategory.EDITOR) {
            return [PluginManager.DEFAULT_EDITOR_ENGINE_ID];
        }

        return null;
    }

    private extractEngineIdFromPluginId(pluginId: string): string | null {
        if (!pluginId.startsWith(PluginManager.ENGINE_PLUGIN_ID_PREFIX)) {
            return null;
        }
        const engineId = pluginId.slice(PluginManager.ENGINE_PLUGIN_ID_PREFIX.length);
        return this.normalizeEngineId(engineId) || null;
    }

    private normalizeEngineId(engineId: string): string {
        return engineId.trim().toLowerCase();
    }

    /**
     * 检查插件依赖
     * @returns 缺失的依赖 ID 列表
     */
    checkDependencies(plugin: IPlugin): string[] {
        if (!plugin.dependencies || plugin.dependencies.length === 0) return [];

        return plugin.dependencies.filter(depId => !this.activePlugins.has(depId));
    }

    getEditorRegistry(): EditorExtensionRegistry {
        return this.editorRegistry;
    }

    private collectCurrentPluginStates(): Record<string, boolean> {
        const states: Record<string, boolean> = {};
        this.getPlugins().forEach(p => {
            states[p.id] = this.activePlugins.has(p.id);
        });
        return states;
    }

    /**
     * 将错误记录到缓冲区。
     * 如果 LoggerService 已就绪，则立即刷入；否则暂存，待首个 Logger 激活后补录。
     */
    private logToBootstrapBuffer(message: string, error?: any) {
        const logger = this.kernel.getService<IBufferedLogger>(ServiceId.COMMON_UTILS_LOGGER, false);
        if (logger) {
            logger.error(message, error);
            // 顺便冲刷可能积压的旧账
            this.flushBootstrapErrors(logger);
        } else {
            this.logger.warn(`Logger not ready. Buffering error: ${message}`);
            this.bootstrapErrorBuffer.push({ message, error });
        }
    }

    /**
     * 探测日志服务是否已就绪，若已就绪则执行冲刷
     */
    private tryFlushBufferedErrors() {
        const logger = this.kernel.getService<IBufferedLogger>(ServiceId.COMMON_UTILS_LOGGER, false);
        if (logger) {
            this.flushBootstrapErrors(logger);
        }
    }

    /**
     * 将积压的错误冲刷到指定日志服务
     */
    private flushBootstrapErrors(logger: IBufferedLogger) {
        if (this.bootstrapErrorBuffer.length === 0) return;

        this.logger.info(`Found ${this.bootstrapErrorBuffer.length} buffered errors. Flushing to LoggerService...`);
        this.bootstrapErrorBuffer.forEach(item => {
            logger.error(`[Buffered] ${item.message}`, item.error);
        });
        this.bootstrapErrorBuffer = [];
    }

    // =====================================================
    // 熔断机制 (Circuit Breaker)
    // =====================================================

    /**
     * 记录插件运行时错误
     * 如果错误频率超过阈值，将触发熔断
     * @param pluginId 插件 ID
     * @param error 错误对象
     */
    recordPluginError(pluginId: string, error: any) {
        const plugin = this.plugins.get(pluginId);
        this.circuitBreaker.recordError(pluginId, {
            essential: plugin?.essential === true,
            error,
            onTrip: () => this.tripPlugin(pluginId),
        });
    }

    /**
     * 检查插件是否处于熔断状态
     * 保留 PluginManager 对外兼容口径，内部委托给治理组件。
     */
    isPluginTripped(pluginId: string): boolean {
        return this.circuitBreaker.isTripped(pluginId);
    }

    /**
     * 触发插件熔断
     * 禁用插件并记录熔断时间
     */
    private tripPlugin(pluginId: string) {
        this.logger.error(`[CircuitBreaker] Plugin ${pluginId} has exceeded error threshold. Tripping circuit breaker!`);

        // 强制禁用插件
        this.deactivatePlugin(pluginId);

        // 持久化禁用状态，防止重启后复活
        this.stateStore.saveLegacyStates(this.collectCurrentPluginStates());

        // 通知内核，让 UI 可以显示提示
        this.kernel.emit(CoreEvents.PLUGIN_TRIPPED, {
            pluginId,
            message: `插件 "${this.plugins.get(pluginId)?.name || pluginId}" 因频繁报错已被自动禁用。`,
            cooldownMs: CIRCUIT_BREAKER_CONFIG.COOLDOWN_MS
        });
    }

    /**
     * 手动触发懒加载插件激活 (供外部调用)
     */
    activateLazyPlugin(pluginId: string) {
        if (!this.lazyActivationCoordinator.hasPendingPlugin(pluginId)) {
            // 已被语法触发器激活过的插件会再次收到触发请求，属正常行为
            if (!this.activePlugins.has(pluginId)) {
                this.logger.warn(`Plugin ${pluginId} is not a pending lazy plugin.`);
            }
            return;
        }
        this.lazyActivationCoordinator.activatePendingPlugin(pluginId, false);
    }

    /**
     * 更新插件活跃时间
     */
    public updateActivity(pluginId: string) {
        if (this.activePlugins.has(pluginId)) {
            this.hibernationController.recordActivity(pluginId);
        }
    }

    /**
     * 注册静态 UI / 命令映射
     * 允许懒加载插件在未激活前预留 UI 占位
     */
    private registerStaticCapabilities(plugin: IPlugin) {
        if (!plugin.staticToolbarItems && !plugin.staticCommands) return;

        // 创建临时上下文用于注册，区分 Internal/Public
        const isInternalPlugin = plugin.internal === true;
        const context: IPluginContext = isInternalPlugin
            ? new PluginContext(this.kernel, plugin.id, this.editorRegistry, this.decorationRegistry)
            : new RestrictedPluginContext(this.kernel, plugin.id, this.editorRegistry, this.decorationRegistry);

        if (plugin.staticToolbarItems) {
            plugin.staticToolbarItems.forEach(item => {
                const proxyItem = {
                    ...item,
                    onClick: (ref: any) => {
                        this.logger.info(`Static UI '${item.id}' clicked for lazy plugin: ${plugin.id}. Waking up...`);
                        this.activateLazyPlugin(plugin.id);
                        // 激活后逻辑会通过真正的 context 重新注册一遍覆盖，此处转发执行
                        item.onClick?.(ref);
                    }
                };
                context.registerEditorToolbarItem(proxyItem);
            });
        }

        if (plugin.staticCommands) {
            plugin.staticCommands.forEach(cmd => {
                const proxyCmd = {
                    ...cmd,
                    handler: (...args: any[]) => {
                        this.logger.info(`Static command '${cmd.id}' triggered for lazy plugin: ${plugin.id}. Waking up...`);
                        this.activateLazyPlugin(plugin.id);
                        cmd.handler(...args);
                    }
                };
                context.registerCommand(proxyCmd);
            });
        }
    }
}
