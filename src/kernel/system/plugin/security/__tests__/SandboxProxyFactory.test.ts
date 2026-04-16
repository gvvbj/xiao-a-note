/**
 * 测试范围：共享沙箱代理工厂（服务访问 / 事件发射 / kernel 代理）
 * 测试类型：单元/回归
 * 测试目的：守护 RestrictedPluginContext 与 UISlot 共用的沙箱代理实现，防止策略分叉
 * 防回归问题：服务白名单失效、事件白名单失效、kernel 代理绕过
 * 关键不变量：
 * - 未授权服务始终返回空值或受限代理
 * - 未授权事件不会触发真实系统行为
 * - kernel 代理只暴露受控方法
 * 边界说明：
 * - 不覆盖 React 渲染与 UISlot 包装行为
 * - 不覆盖 PluginManager 路径信任联动
 * 依赖与限制（如有）：
 * - 使用最小 Kernel + stub logger 验证工厂行为
 */
import { describe, expect, it, vi } from 'vitest';
import { Kernel } from '@/kernel/core/Kernel';
import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import type { ILogger } from '@/kernel/services/LoggerService';
import {
    createSandboxKernelProxy,
    emitSandboxedEvent,
    getSandboxedService,
} from '../sandbox/SandboxProxyFactory';

interface IFileSystemProxyForTest {
    readFile(path: string): Promise<{ success: boolean; marker?: string; content?: string }>;
    deleteFile(path: string): Promise<{ success: boolean }>;
}

function createLoggerStub(): ILogger {
    return {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    };
}

describe('Phase 2 共享沙箱代理工厂', () => {
    it('getSandboxedService 应对安全服务直通、对受限服务返回代理、对禁止服务返回空值', async () => {
        const kernel = new Kernel();
        const logger = createLoggerStub();

        const fileSystem = {
            marker: 'fs-marker',
            readFile: vi.fn(async function (this: { marker: string }) {
                return { success: true, marker: this.marker };
            }),
            deleteFile: vi.fn(async () => ({ success: true })),
        };
        const workspace = { getRoot: vi.fn(() => 'workspace-root') };

        kernel.registerService(ServiceId.FILE_SYSTEM, fileSystem, true);
        kernel.registerService(ServiceId.WORKSPACE, workspace, true);
        kernel.registerService(ServiceId.SETTINGS, { updateSettings: vi.fn() }, true);

        const descriptor = {
            actorId: 'ext-test',
            actorType: 'plugin' as const,
            logger,
        };

        const workspaceService = getSandboxedService<typeof workspace>(kernel, ServiceId.WORKSPACE, descriptor);
        const fileSystemProxy = getSandboxedService<IFileSystemProxyForTest>(kernel, ServiceId.FILE_SYSTEM, descriptor);
        const settingsService = getSandboxedService(kernel, ServiceId.SETTINGS, descriptor);

        expect(workspaceService).toBe(workspace);
        expect(fileSystemProxy).toBeTruthy();
        expect(settingsService).toBeUndefined();

        await expect(fileSystemProxy?.readFile('note.md')).resolves.toEqual({
            success: true,
            marker: 'fs-marker',
        });
        await expect(fileSystemProxy?.deleteFile('note.md')).rejects.toThrow(/Sandbox: fileSystem\.deleteFile/);
    });

    it('emitSandboxedEvent 应只允许白名单事件进入内核', () => {
        const kernel = new Kernel();
        const logger = createLoggerStub();
        const allowedHandler = vi.fn();
        const deniedHandler = vi.fn();

        kernel.on(CoreEvents.DOCUMENT_CHANGED, allowedHandler);
        kernel.on(CoreEvents.APP_CMD_SAVE, deniedHandler);

        const descriptor = {
            actorId: 'ext-test',
            actorType: 'plugin' as const,
            logger,
        };

        expect(emitSandboxedEvent(kernel, CoreEvents.DOCUMENT_CHANGED, [{ content: 'ok' }], descriptor)).toBe(true);
        expect(emitSandboxedEvent(kernel, CoreEvents.APP_CMD_SAVE, [], descriptor)).toBe(false);

        expect(allowedHandler).toHaveBeenCalledTimes(1);
        expect(deniedHandler).not.toHaveBeenCalled();
    });

    it('createSandboxKernelProxy 应路由 getService / emit / on / off 并拦截其它属性', async () => {
        const kernel = new Kernel();
        const logger = createLoggerStub();

        const fileSystem = {
            readFile: vi.fn(async () => ({ success: true, content: 'ok' })),
            deleteFile: vi.fn(async () => ({ success: true })),
        };
        kernel.registerService(ServiceId.FILE_SYSTEM, fileSystem, true);

        const proxy = createSandboxKernelProxy({
            kernel,
            actorId: 'ext-test',
            actorType: 'plugin',
            logger,
            on: (event, handler) => {
                kernel.on(event as never, handler as never);
                return () => kernel.off(event as never, handler as never);
            },
            off: (event, handler) => {
                kernel.off(event as never, handler as never);
            },
        });

        const docHandler = vi.fn();
        const dispose = proxy.on(CoreEvents.DOCUMENT_CHANGED, docHandler) as unknown as () => void;

        proxy.emit(CoreEvents.DOCUMENT_CHANGED, { content: 'from-proxy' });
        proxy.emit(CoreEvents.APP_CMD_SAVE);

        expect(docHandler).toHaveBeenCalledTimes(1);

        dispose();
        proxy.emit(CoreEvents.DOCUMENT_CHANGED, { content: 'after-off' });
        expect(docHandler).toHaveBeenCalledTimes(1);

        const fsProxy = proxy.getService<IFileSystemProxyForTest>(ServiceId.FILE_SYSTEM);
        expect(await fsProxy?.readFile('note.md')).toEqual({ success: true, content: 'ok' });
        await expect(fsProxy?.deleteFile('note.md')).rejects.toThrow(/Sandbox: fileSystem\.deleteFile/);
        expect((proxy as unknown as Record<string, unknown>).registerService).toBeUndefined();
    });
});
