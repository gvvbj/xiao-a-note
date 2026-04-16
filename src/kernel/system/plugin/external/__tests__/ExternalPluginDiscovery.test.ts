/**
 * 测试范围：ExternalPluginDiscovery 外部插件发现组件
 * 测试类型：单元 / 回归
 * 测试目的：守住外部插件清单发现与错误降级行为
 * 防回归问题：发现异常导致外部插件全链路中断、加载器直接抛错
 * 关键不变量：
 * - 发现成功时返回原始清单
 * - 发现失败时返回空数组并记录错误
 * 边界说明：
 * - 不覆盖 ExtensionLoader 编排
 * - 不覆盖实际文件系统目录扫描
 */
import { describe, expect, it, vi } from 'vitest';
import type { IFileSystem } from '@/kernel/interfaces/IFileSystem';
import type { ILogger } from '@/kernel/services/LoggerService';
import { ExternalPluginDiscovery } from '../ExternalPluginDiscovery';

function createLoggerStub(): ILogger {
    return {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    };
}

function createFileSystemStub(overrides: Partial<IFileSystem> = {}): IFileSystem {
    return {
        saveFile: vi.fn(),
        readFile: vi.fn(),
        deleteFile: vi.fn(),
        exists: vi.fn(),
        readDir: vi.fn(),
        moveFile: vi.fn(),
        copyFile: vi.fn(),
        getFileStats: vi.fn(),
        createDirectory: vi.fn(),
        watchFile: vi.fn(),
        unwatchFile: vi.fn(),
        readTextAsset: vi.fn(),
        getBasename: vi.fn(),
        getPathSeparator: vi.fn(),
        pathJoin: vi.fn(),
        normalizePath: vi.fn(),
        getDirname: vi.fn(),
        getExternalPluginList: vi.fn(),
        readPluginManifest: vi.fn(),
        readPluginDirectory: vi.fn(),
        loadWasm: vi.fn(),
        ...overrides,
    } as unknown as IFileSystem;
}

describe('Phase 7 ExternalPluginDiscovery', () => {
    it('发现成功时应返回插件清单', async () => {
        const logger = createLoggerStub();
        const manifests = [{ id: 'demo', name: 'Demo', version: '1.0.0', path: '/plugins/demo', main: 'index.ts' }];
        const fileSystem = createFileSystemStub({
            getExternalPluginList: vi.fn(async () => manifests),
        });

        const discovery = new ExternalPluginDiscovery(fileSystem, logger);
        await expect(discovery.discoverPlugins()).resolves.toEqual(manifests);
        expect(logger.info).toHaveBeenCalledTimes(1);
    });

    it('发现失败时应返回空数组并记录错误', async () => {
        const logger = createLoggerStub();
        const fileSystem = createFileSystemStub({
            getExternalPluginList: vi.fn(async () => {
                throw new Error('boom');
            }),
        });

        const discovery = new ExternalPluginDiscovery(fileSystem, logger);
        await expect(discovery.discoverPlugins()).resolves.toEqual([]);
        expect(logger.error).toHaveBeenCalledTimes(1);
    });
});
