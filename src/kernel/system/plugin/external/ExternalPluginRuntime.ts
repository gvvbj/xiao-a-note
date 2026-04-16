import type { IPlugin } from '../types';
import { IsolationLevel } from '../types';
import { SystemModuleRegistry } from '../SystemModuleRegistry';
import { loggerService, type ILogger } from '@/kernel/services/LoggerService';
import type { CommonJsModule, IExternalPluginManifest, PluginConstructor } from './ExternalPluginTypes';

export class ExternalPluginRuntime {
    private pluginModuleCache = new Map<string, Map<string, unknown>>();

    constructor(
        private readonly logger: ILogger = loggerService.createLogger('ExternalPluginRuntime'),
    ) { }

    loadPlugin(
        manifest: IExternalPluginManifest,
        pluginFiles: Record<string, string>,
    ): IPlugin | null {
        const pluginId = manifest.id;
        const moduleCache = new Map<string, unknown>();
        this.pluginModuleCache.set(pluginId, moduleCache);

        const requireInSandbox = (relativePath: string, contextDir: string = ''): unknown => {
            const systemModule = SystemModuleRegistry.getModule(relativePath);
            if (systemModule) {
                return systemModule;
            }

            let targetPath = this.normalizePluginPath(contextDir, relativePath);
            if (!targetPath.endsWith('.js')) {
                targetPath += '.js';
            }

            if (moduleCache.has(targetPath)) {
                return moduleCache.get(targetPath);
            }

            const code = pluginFiles[targetPath];
            if (code === undefined) {
                throw new Error(`[ExtensionLoader] Module not found: ${relativePath} (looked for ${targetPath})`);
            }

            const module: CommonJsModule = { exports: {} };
            const currentModuleDir = targetPath.includes('/')
                ? targetPath.substring(0, targetPath.lastIndexOf('/'))
                : '';

            const pluginLogger = loggerService.createLogger(pluginId);
            const sandboxConsole = {
                log: (message: string, ...args: unknown[]) => pluginLogger.info(message, args.length > 0 ? args : undefined),
                info: (message: string, ...args: unknown[]) => pluginLogger.info(message, args.length > 0 ? args : undefined),
                warn: (message: string, ...args: unknown[]) => pluginLogger.warn(message, args.length > 0 ? args : undefined),
                error: (message: string, ...args: unknown[]) => pluginLogger.error(message, args.length > 0 ? args : undefined),
                debug: (message: string, ...args: unknown[]) => pluginLogger.debug(message, args.length > 0 ? args : undefined),
            };
            const factory = new Function('exports', 'require', 'module', 'console', code);
            factory(module.exports, (path: string) => requireInSandbox(path, currentModuleDir), module, sandboxConsole);

            const finalExports = module.exports;
            moduleCache.set(targetPath, finalExports);
            return finalExports;
        };

        try {
            const mainFile = manifest.main.replace(/\.tsx?$/, '.js');
            const entryCode = pluginFiles[mainFile];
            if (!entryCode) {
                this.logger.error(`Entry file ${mainFile} not found for plugin ${pluginId}`);
                this.pluginModuleCache.delete(pluginId);
                return null;
            }

            const plugin = this.executeEntryCode(entryCode, requireInSandbox, manifest);
            if (!plugin) {
                this.pluginModuleCache.delete(pluginId);
                return null;
            }

            plugin.internal = false;
            plugin.isolationLevel = IsolationLevel.IFRAME;
            plugin.hidden = manifest.hidden === true;
            return plugin;
        } catch (error) {
            this.logger.error(`Failed to execute plugin code for ${pluginId}`, error);
            this.pluginModuleCache.delete(pluginId);
            return null;
        }
    }

    unloadPlugin(pluginId: string): void {
        this.pluginModuleCache.delete(pluginId);
    }

    private normalizePluginPath(baseDir: string, relativePath: string): string {
        if (!relativePath.startsWith('.')) {
            return relativePath;
        }

        const parts = baseDir.split('/').filter((part) => part && part !== '.');
        const relParts = relativePath.split('/').filter((part) => part && part !== '.');

        for (const part of relParts) {
            if (part === '..') {
                parts.pop();
            } else {
                parts.push(part);
            }
        }

        return parts.join('/');
    }

    private executeEntryCode(
        code: string,
        requireFn: (path: string, dir?: string) => unknown,
        manifest: IExternalPluginManifest,
    ): IPlugin | null {
        const module: CommonJsModule = { exports: {} };
        const pluginLogger = loggerService.createLogger(manifest.id);
        const sandboxConsole = {
            log: (message: string, ...args: unknown[]) => pluginLogger.info(message, args.length > 0 ? args : undefined),
            info: (message: string, ...args: unknown[]) => pluginLogger.info(message, args.length > 0 ? args : undefined),
            warn: (message: string, ...args: unknown[]) => pluginLogger.warn(message, args.length > 0 ? args : undefined),
            error: (message: string, ...args: unknown[]) => pluginLogger.error(message, args.length > 0 ? args : undefined),
            debug: (message: string, ...args: unknown[]) => pluginLogger.debug(message, args.length > 0 ? args : undefined),
        };
        const factory = new Function('exports', 'require', 'module', 'console', code);
        factory(module.exports, (path: string) => requireFn(path, ''), module, sandboxConsole);

        const moduleExports = module.exports;
        const exportObject = (typeof moduleExports === 'object' && moduleExports !== null)
            ? (moduleExports as { default?: unknown })
            : undefined;
        const pluginClassOrInstance = exportObject?.default || moduleExports;

        let instance: IPlugin | null = null;
        if (typeof pluginClassOrInstance === 'function') {
            const pluginCtor = pluginClassOrInstance as PluginConstructor;
            const candidate = new pluginCtor();
            if (typeof candidate === 'object' && candidate !== null) {
                instance = candidate as IPlugin;
            }
        } else if (typeof pluginClassOrInstance === 'object' && pluginClassOrInstance !== null) {
            instance = pluginClassOrInstance as IPlugin;
        }

        if (!instance) {
            this.logger.error(`Plugin ${manifest.id} has no valid export (expected default class or function)`);
            return null;
        }

        if (typeof instance.activate !== 'function') {
            this.logger.error(`Plugin ${manifest.id} missing activate method`);
            return null;
        }

        instance.id = manifest.id;
        instance.name = manifest.name;
        instance.version = manifest.version;
        return instance;
    }
}
