/**
 * 测试范围：ExtensionLoader 外部插件加载编排器
 * 测试类型：单元 / 回归
 * 测试目的：守住发现、读取、转译、运行时组件之间的编排关系
 * 防回归问题：编排器不再负责 orchestration、插件重复加载、卸载未同步清理运行时缓存
 * 关键不变量：
 * - loadPlugin 成功后会缓存插件实例
 * - 重复 loadPlugin 不会再次执行子组件链路
 * - unloadPlugin 会同时清理运行时缓存
 * 边界说明：
 * - 子组件具体行为由各自单测覆盖
 * - 这里仅验证 ExtensionLoader 编排与缓存行为
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IFileSystem } from '@/kernel/interfaces/IFileSystem';
import type { IPlugin } from '@/kernel/system/plugin/types';

const discoverPluginsMock = vi.fn();
const readPluginDirectoryMock = vi.fn();
const preparePluginFilesMock = vi.fn();
const runtimeLoadPluginMock = vi.fn();
const runtimeUnloadPluginMock = vi.fn();

vi.mock('@/kernel/system/plugin/external/ExternalPluginDiscovery', () => ({
    ExternalPluginDiscovery: class {
        discoverPlugins = discoverPluginsMock;
    },
}));

vi.mock('@/kernel/system/plugin/external/ExternalPluginSourceReader', () => ({
    ExternalPluginSourceReader: class {
        readPluginDirectory = readPluginDirectoryMock;
    },
}));

vi.mock('@/kernel/system/plugin/external/ExternalPluginTranspileCache', () => ({
    ExternalPluginTranspileCache: class {
        preparePluginFiles = preparePluginFilesMock;
    },
}));

vi.mock('@/kernel/system/plugin/external/ExternalPluginRuntime', () => ({
    ExternalPluginRuntime: class {
        loadPlugin = runtimeLoadPluginMock;
        unloadPlugin = runtimeUnloadPluginMock;
    },
}));

import { ExtensionLoader } from '@/kernel/system/plugin/ExtensionLoader';

function createFileSystemStub(): IFileSystem {
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
    } as unknown as IFileSystem;
}

describe('Phase 7 ExtensionLoader', () => {
    beforeEach(() => {
        discoverPluginsMock.mockReset();
        readPluginDirectoryMock.mockReset();
        preparePluginFilesMock.mockReset();
        runtimeLoadPluginMock.mockReset();
        runtimeUnloadPluginMock.mockReset();
    });

    it('loadPlugin 成功后应缓存插件并避免重复加载', async () => {
        const manifest = {
            id: 'demo-loader-plugin',
            name: 'Demo Loader Plugin',
            version: '1.0.0',
            path: '/plugins/demo-loader-plugin',
            main: 'index.ts',
        };
        const plugin = { ...manifest, activate: vi.fn() } as unknown as IPlugin;

        readPluginDirectoryMock.mockResolvedValue({ 'index.ts': 'export default {}' });
        preparePluginFilesMock.mockResolvedValue({ 'index.js': 'module.exports = {}' });
        runtimeLoadPluginMock.mockReturnValue(plugin);

        const loader = new ExtensionLoader(createFileSystemStub());
        const first = await loader.loadPlugin(manifest);
        const second = await loader.loadPlugin(manifest);

        expect(first).toBe(plugin);
        expect(second).toBe(plugin);
        expect(readPluginDirectoryMock).toHaveBeenCalledTimes(1);
        expect(runtimeLoadPluginMock).toHaveBeenCalledTimes(1);
        expect(loader.getLoadedPlugins()).toEqual([plugin]);
    });

    it('unloadPlugin 应同步清理运行时缓存', async () => {
        const manifest = {
            id: 'demo-loader-plugin',
            name: 'Demo Loader Plugin',
            version: '1.0.0',
            path: '/plugins/demo-loader-plugin',
            main: 'index.ts',
        };
        const plugin = { ...manifest, activate: vi.fn() } as unknown as IPlugin;

        readPluginDirectoryMock.mockResolvedValue({ 'index.ts': 'export default {}' });
        preparePluginFilesMock.mockResolvedValue({ 'index.js': 'module.exports = {}' });
        runtimeLoadPluginMock.mockReturnValue(plugin);

        const loader = new ExtensionLoader(createFileSystemStub());
        await loader.loadPlugin(manifest);

        expect(loader.unloadPlugin(plugin.id)).toBe(true);
        expect(runtimeUnloadPluginMock).toHaveBeenCalledWith(plugin.id);
        expect(loader.getLoadedPlugins()).toEqual([]);
    });
});
