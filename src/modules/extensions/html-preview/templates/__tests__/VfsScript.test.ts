/**
 * 测试范围：html-preview 的 VFS 注入脚本
 * 测试类型：单元 / 回归
 * 测试目的：守护 iframe 内 bridge 晚于业务脚本初始化时，VfsScript 仍能补齐 bridge.fs
 * 防回归问题：html-preview 预览脚本先执行、window.bridge 后挂载，导致 bridge.fs 永远不可用
 * 关键不变量：
 * - bridge 后创建时，bridge.fs 仍会被补装
 * - bridge.fs.list / read 必须通过 sendSignal 发起受控查询
 * - fs-response 返回后，对应 Promise 必须正确 resolve / reject
 * 边界说明：
 * - 不覆盖宿主侧 SignalHandler 的真实文件系统逻辑
 * - 不覆盖 iframe 渲染层与 CodeMirror 装饰联动
 * 依赖与限制：
 * - 依赖 jsdom 的 window 对象
 * - 使用 fake timers 驱动异步轮询
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getVfsScript } from '../VfsScript';

declare global {
    interface Window {
        bridge?: {
            fs?: {
                list: (path: string) => Promise<unknown>;
                read: (path: string) => Promise<unknown>;
            };
            sendSignal: (type: string, payload: Record<string, unknown>) => void;
        };
    }
}

describe('VfsScript', () => {
    afterEach(() => {
        vi.useRealTimers();
        delete window.bridge;
    });

    it('应在 bridge 后初始化时仍补齐 bridge.fs 并完成查询响应', async () => {
        vi.useFakeTimers();
        delete window.bridge;

        window.eval(getVfsScript());

        const sendSignal = vi.fn();
        await vi.advanceTimersByTimeAsync(50);
        window.bridge = { sendSignal };
        await vi.advanceTimersByTimeAsync(50);

        expect(window.bridge.fs).toBeTruthy();
        expect(typeof window.bridge.fs?.list).toBe('function');
        expect(typeof window.bridge.fs?.read).toBe('function');

        const listPromise = window.bridge.fs!.list('.');
        expect(sendSignal).toHaveBeenCalledTimes(1);
        expect(sendSignal).toHaveBeenLastCalledWith('fs-query', expect.objectContaining({
            operation: 'list',
            path: '.',
        }));

        const listQueryId = sendSignal.mock.calls[0][1].queryId as string;
        window.dispatchEvent(new MessageEvent('message', {
            data: {
                type: 'fs-response',
                queryId: listQueryId,
                status: 'success',
                data: ['a.md', 'b.md'],
            },
        }));
        await expect(listPromise).resolves.toEqual(['a.md', 'b.md']);

        const readPromise = window.bridge.fs!.read('note.md');
        expect(sendSignal).toHaveBeenCalledTimes(2);
        expect(sendSignal).toHaveBeenLastCalledWith('fs-query', expect.objectContaining({
            operation: 'read',
            path: 'note.md',
        }));

        const readQueryId = sendSignal.mock.calls[1][1].queryId as string;
        window.dispatchEvent(new MessageEvent('message', {
            data: {
                type: 'fs-response',
                queryId: readQueryId,
                status: 'error',
                message: 'Access denied',
            },
        }));
        await expect(readPromise).rejects.toThrow('Access denied');
    });
});
