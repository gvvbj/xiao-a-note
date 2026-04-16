import * as esbuild from 'esbuild-wasm';
import type { IFileSystem } from '@/kernel/interfaces/IFileSystem';
import { loggerService, type ILogger } from '@/kernel/services/LoggerService';
import type { IExternalPluginManifest } from './ExternalPluginTypes';

interface IPluginSourceEntry {
    relPath: string;
    content: string;
    hash: string;
}

export class ExternalPluginTranspileCache {
    private static isEsbuildInitialized = false;

    constructor(
        private readonly fileSystem: IFileSystem,
        private readonly logger: ILogger = loggerService.createLogger('ExternalPluginTranspileCache'),
    ) { }

    async preparePluginFiles(
        manifest: IExternalPluginManifest,
        pluginFilesRaw: Record<string, string>,
        retryCount: number = 0,
    ): Promise<Record<string, string> | null> {
        const tsFilesToProcess = await this.collectTranspileTargets(pluginFilesRaw);
        const pluginFiles: Record<string, string> = {};

        if (tsFilesToProcess.length > 0) {
            const cacheMetadata = this.readCacheMetadata(pluginFilesRaw);
            const needsRebuild = tsFilesToProcess.some((file) => cacheMetadata[file.relPath] !== file.hash);

            if (needsRebuild) {
                const rebuiltFiles = await this.rebuildCache(manifest, tsFilesToProcess);
                if (!rebuiltFiles) {
                    return null;
                }
                Object.assign(pluginFiles, rebuiltFiles);
            } else {
                const cachedFiles = await this.loadCachedFiles(manifest, pluginFilesRaw, tsFilesToProcess, retryCount);
                if (!cachedFiles) {
                    return null;
                }
                Object.assign(pluginFiles, cachedFiles);
            }
        }

        for (const [relPath, content] of Object.entries(pluginFilesRaw)) {
            if (!relPath.endsWith('.ts') && !relPath.endsWith('.tsx') && !relPath.startsWith('.cache/')) {
                pluginFiles[relPath] = content;
            }
        }

        return pluginFiles;
    }

    private async initEsbuild(): Promise<void> {
        if (ExternalPluginTranspileCache.isEsbuildInitialized) {
            return;
        }

        this.logger.info('Initializing esbuild-wasm...');
        const wasmBuffer = await this.fileSystem.loadWasm('esbuild.wasm');
        if (!wasmBuffer) {
            throw new Error('Failed to load esbuild.wasm binary');
        }

        const wasmModule = await WebAssembly.compile(wasmBuffer as BufferSource);
        await esbuild.initialize({
            wasmModule,
            worker: false,
        });
        ExternalPluginTranspileCache.isEsbuildInitialized = true;
        this.logger.info('esbuild-wasm initialized successfully');
    }

    private async computeHash(content: string): Promise<string> {
        const encoder = new TextEncoder();
        const data = encoder.encode(content);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((value) => value.toString(16).padStart(2, '0')).join('');
    }

    private async collectTranspileTargets(pluginFilesRaw: Record<string, string>): Promise<IPluginSourceEntry[]> {
        const entries: IPluginSourceEntry[] = [];

        for (const [relPath, content] of Object.entries(pluginFilesRaw)) {
            if (!relPath.endsWith('.ts') && !relPath.endsWith('.tsx')) {
                continue;
            }

            entries.push({
                relPath,
                content,
                hash: await this.computeHash(content),
            });
        }

        return entries;
    }

    private readCacheMetadata(pluginFilesRaw: Record<string, string>): Record<string, string> {
        try {
            const metadataRaw = pluginFilesRaw['.cache/metadata.json'];
            return metadataRaw ? JSON.parse(metadataRaw) : {};
        } catch {
            return {};
        }
    }

    private async rebuildCache(
        manifest: IExternalPluginManifest,
        tsFilesToProcess: IPluginSourceEntry[],
    ): Promise<Record<string, string> | null> {
        await this.initEsbuild();
        this.logger.info(`Cache miss for ${manifest.id}. Re-transforming...`);

        const pluginFiles: Record<string, string> = {};
        const newMetadata: Record<string, string> = {};
        const cacheDir = await this.fileSystem.pathJoin(manifest.path, '.cache');
        await this.fileSystem.createDirectory(cacheDir);

        for (const { relPath, content, hash } of tsFilesToProcess) {
            try {
                const result = await esbuild.transform(content, {
                    loader: relPath.endsWith('x') ? 'tsx' : 'ts',
                    format: 'cjs',
                    target: 'esnext',
                });
                const jsPath = relPath.replace(/\.tsx?$/, '.js');
                const cacheJsPath = `.cache/${jsPath}`;
                pluginFiles[jsPath] = result.code;
                newMetadata[relPath] = hash;

                const fullCachePath = await this.fileSystem.pathJoin(manifest.path, cacheJsPath);
                const cacheFileDir = await this.fileSystem.getDirname(fullCachePath);
                await this.fileSystem.createDirectory(cacheFileDir);
                await this.fileSystem.saveFile(fullCachePath, result.code);
            } catch (error) {
                this.logger.error(`Failed to transform ${relPath}:`, error);
                return null;
            }
        }

        const fullMetaPath = await this.fileSystem.pathJoin(manifest.path, '.cache/metadata.json');
        await this.fileSystem.saveFile(fullMetaPath, JSON.stringify(newMetadata));
        return pluginFiles;
    }

    private async loadCachedFiles(
        manifest: IExternalPluginManifest,
        pluginFilesRaw: Record<string, string>,
        tsFilesToProcess: IPluginSourceEntry[],
        retryCount: number,
    ): Promise<Record<string, string> | null> {
        this.logger.info(`Cache hit for ${manifest.id}. Loading from memory/cache.`);

        const pluginFiles: Record<string, string> = {};
        for (const { relPath } of tsFilesToProcess) {
            const jsPath = relPath.replace(/\.tsx?$/, '.js');
            const cacheJsPath = `.cache/${jsPath}`;
            const cachedCode = pluginFilesRaw[cacheJsPath];
            if (cachedCode) {
                pluginFiles[jsPath] = cachedCode;
                continue;
            }

            if (retryCount < 1) {
                this.logger.warn(`Cache sync error for ${jsPath}, invalidating cache and retrying...`);
                const metaPath = await this.fileSystem.pathJoin(manifest.path, '.cache/metadata.json');
                await this.fileSystem.saveFile(metaPath, '{}');
                return null;
            }

            this.logger.error(`Cache permanently broken for ${jsPath} in plugin ${manifest.id}, skipping.`);
            return null;
        }

        return pluginFiles;
    }
}
