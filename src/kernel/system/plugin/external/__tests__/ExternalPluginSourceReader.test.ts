/**
 * 测试范围：ExternalPluginSourceReader 外部插件目录读取组件
 * 测试类型：单元 / 回归
 * 测试目的：守住空目录与读取失败时的安全降级行为
 * 防回归问题：目录读取异常直接抛出、空插件目录被当作有效插件继续执行
 * 关键不变量：
 * - 有文件时返回目录内容
 * - 空目录或读取失败时返回 null 并记录错误
 * 边界说明：
 * - 不覆盖目录内容转译
 * - 不覆盖运行时模块执行
 */
import { describe, expect, it, vi } from 'vitest';
import type { IFileSystem } from '@/kernel/interfaces/IFileSystem';
import type { ILogger } from '@/kernel/services/LoggerService';
import { ExternalPluginSourceReader } from '../ExternalPluginSourceReader';

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

describe('Phase 7 ExternalPluginSourceReader', () => {
    it('目录读取成功时应返回插件文件集', async () => {
        const logger = createLoggerStub();
        const pluginFiles = { 'index.ts': 'export default {}' };
        const fileSystem = createFileSystemStub({
            readPluginDirectory: vi.fn(async () => pluginFiles),
        });

        const reader = new ExternalPluginSourceReader(fileSystem, logger);
        await expect(reader.readPluginDirectory('demo', '/plugins/demo')).resolves.toEqual(pluginFiles);
    });

    it('空目录时应返回 null 并记录错误', async () => {
        const logger = createLoggerStub();
        const fileSystem = createFileSystemStub({
            readPluginDirectory: vi.fn(async () => ({})),
        });

        const reader = new ExternalPluginSourceReader(fileSystem, logger);
        await expect(reader.readPluginDirectory('demo', '/plugins/demo')).resolves.toBeNull();
        expect(logger.error).toHaveBeenCalledTimes(1);
    });
});
