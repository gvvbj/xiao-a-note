/**
 * 测试范围：ExternalPluginTranspileCache 外部插件转译缓存组件
 * 测试类型：单元 / 回归
 * 测试目的：守住缓存命中与缓存重建路径
 * 防回归问题：缓存命中时仍重复转译、缓存失配时不重建、缓存产物不落盘
 * 关键不变量：
 * - 指纹命中时直接读取缓存 JS
 * - 指纹失配时调用 esbuild 重建并写入缓存
 * 边界说明：
 * - 不覆盖入口执行
 * - 不覆盖 ExtensionLoader 编排
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IFileSystem } from '@/kernel/interfaces/IFileSystem';
import type { ILogger } from '@/kernel/services/LoggerService';
import { ExternalPluginTranspileCache } from '../ExternalPluginTranspileCache';

const { initializeMock, transformMock } = vi.hoisted(() => ({
    initializeMock: vi.fn(async () => undefined),
    transformMock: vi.fn(async (content: string) => ({ code: `//compiled\n${content}` })),
}));

vi.mock('esbuild-wasm', () => ({
    initialize: initializeMock,
    transform: transformMock,
}));

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
        saveFile: vi.fn(async () => ({ success: true })),
        readFile: vi.fn(),
        deleteFile: vi.fn(),
        exists: vi.fn(),
        readDir: vi.fn(),
        moveFile: vi.fn(),
        copyFile: vi.fn(),
        getFileStats: vi.fn(),
        createDirectory: vi.fn(async () => ({ success: true })),
        watchFile: vi.fn(),
        unwatchFile: vi.fn(),
        readTextAsset: vi.fn(),
        getBasename: vi.fn(),
        getPathSeparator: vi.fn(),
        pathJoin: vi.fn(async (...parts: string[]) => parts.join('/')),
        normalizePath: vi.fn(),
        getDirname: vi.fn(async (path: string) => path.split('/').slice(0, -1).join('/')),
        getExternalPluginList: vi.fn(),
        readPluginManifest: vi.fn(),
        readPluginDirectory: vi.fn(),
        loadWasm: vi.fn(async () => new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00])),
        ...overrides,
    } as unknown as IFileSystem;
}

async function computeHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
        .map((value) => value.toString(16).padStart(2, '0'))
        .join('');
}

describe('Phase 7 ExternalPluginTranspileCache', () => {
    beforeEach(() => {
        initializeMock.mockClear();
        transformMock.mockClear();
    });

    it('缓存命中时应直接返回缓存 JS', async () => {
        const logger = createLoggerStub();
        const source = 'export default { activate() {} }';
        const hash = await computeHash(source);
        const fileSystem = createFileSystemStub();
        const cache = new ExternalPluginTranspileCache(fileSystem, logger);

        const result = await cache.preparePluginFiles(
            {
                id: 'cache-hit-plugin',
                name: 'Cache Hit Plugin',
                version: '1.0.0',
                path: '/plugins/cache-hit-plugin',
                main: 'index.ts',
            },
            {
                'index.ts': source,
                '.cache/index.js': '//cached\nmodule.exports = {}',
                '.cache/metadata.json': JSON.stringify({ 'index.ts': hash }),
            },
        );

        expect(result).toEqual({ 'index.js': '//cached\nmodule.exports = {}' });
        expect(transformMock).not.toHaveBeenCalled();
    });

    it('缓存失配时应重建并写入缓存', async () => {
        const logger = createLoggerStub();
        const fileSystem = createFileSystemStub();
        const cache = new ExternalPluginTranspileCache(fileSystem, logger);

        const result = await cache.preparePluginFiles(
            {
                id: 'cache-miss-plugin',
                name: 'Cache Miss Plugin',
                version: '1.0.0',
                path: '/plugins/cache-miss-plugin',
                main: 'index.ts',
            },
            {
                'index.ts': 'export default { activate() {} }',
            },
        );

        expect(result?.['index.js']).toContain('//compiled');
        expect(transformMock).toHaveBeenCalledTimes(1);
        expect(fileSystem.saveFile).toHaveBeenCalled();
    });
});
