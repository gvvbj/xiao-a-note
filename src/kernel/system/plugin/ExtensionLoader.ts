/**
 * ExtensionLoader - 外部插件加载器
 *
 * 外部插件入口编排器。
 *
 * 职责:
 * 1. 调用发现器读取外部插件清单
 * 2. 读取插件目录源码
 * 3. 委托转译缓存组件准备可执行模块
 * 4. 委托运行时组件执行入口并返回 IPlugin
 *
 * 边界:
 * - 只负责“如何加载”
 * - 不负责“是否信任”
 * - 不承载安全规则定义
 */

import type { IPlugin } from './types';
import type { IFileSystem } from '@/kernel/interfaces/IFileSystem';
import { loggerService, type ILogger } from '@/kernel/services/LoggerService';
import { ExternalPluginDiscovery } from './external/ExternalPluginDiscovery';
import { ExternalPluginSourceReader } from './external/ExternalPluginSourceReader';
import { ExternalPluginTranspileCache } from './external/ExternalPluginTranspileCache';
import { ExternalPluginRuntime } from './external/ExternalPluginRuntime';
import type { IExternalPluginManifest } from './external/ExternalPluginTypes';

export type { IExternalPluginManifest } from './external/ExternalPluginTypes';

export class ExtensionLoader {
    private loadedPlugins = new Map<string, IPlugin>();
    private logger: ILogger;
    private discovery: ExternalPluginDiscovery;
    private sourceReader: ExternalPluginSourceReader;
    private transpileCache: ExternalPluginTranspileCache;
    private runtime: ExternalPluginRuntime;

    constructor(fileSystem: IFileSystem) {
        this.logger = loggerService.createLogger('ExtensionLoader');
        this.discovery = new ExternalPluginDiscovery(fileSystem);
        this.sourceReader = new ExternalPluginSourceReader(fileSystem);
        this.transpileCache = new ExternalPluginTranspileCache(fileSystem);
        this.runtime = new ExternalPluginRuntime();
    }

    async discoverPlugins(): Promise<IExternalPluginManifest[]> {
        return this.discovery.discoverPlugins();
    }

    async loadPlugin(manifest: IExternalPluginManifest, retryCount: number = 0): Promise<IPlugin | null> {
        const pluginId = manifest.id;

        if (this.loadedPlugins.has(pluginId)) {
            this.logger.warn(`Plugin ${pluginId} already loaded`);
            return this.loadedPlugins.get(pluginId)!;
        }

        this.logger.info(`Loading multi-file plugin: ${pluginId}`);
        const pluginFilesRaw = await this.sourceReader.readPluginDirectory(pluginId, manifest.path);
        if (!pluginFilesRaw) {
            return null;
        }

        const pluginFiles = await this.transpileCache.preparePluginFiles(manifest, pluginFilesRaw, retryCount);
        if (!pluginFiles) {
            if (retryCount < 1) {
                return this.loadPlugin(manifest, retryCount + 1);
            }
            return null;
        }

        const plugin = this.runtime.loadPlugin(manifest, pluginFiles);
        if (!plugin) {
            return null;
        }

        this.loadedPlugins.set(pluginId, plugin);
        this.logger.info(`Successfully loaded dynamic plugin: ${pluginId}`);
        return plugin;
    }

    async loadAllPlugins(): Promise<IPlugin[]> {
        const manifests = await this.discoverPlugins();
        const plugins: IPlugin[] = [];

        for (const manifest of manifests) {
            const plugin = await this.loadPlugin(manifest);
            if (plugin) {
                plugins.push(plugin);
            }
        }

        this.logger.info(`Successfully loaded ${plugins.length}/${manifests.length} external plugins`);
        return plugins;
    }

    getLoadedPlugins(): IPlugin[] {
        return Array.from(this.loadedPlugins.values());
    }

    unloadPlugin(pluginId: string): boolean {
        if (!this.loadedPlugins.has(pluginId)) {
            return false;
        }

        this.loadedPlugins.delete(pluginId);
        this.runtime.unloadPlugin(pluginId);
        this.logger.info(`Unloaded plugin: ${pluginId}`);
        return true;
    }
}
