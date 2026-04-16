/**
 * 测试范围：Vitest 全局初始化（jsdom 环境补桩、测试运行时前置）
 * 测试类型：测试基础设施 / 测试辅助
 * 测试目的：为依赖 Electron API 的测试提供稳定最小桩，避免环境缺失导致误报失败
 * 防回归问题：单测环境访问 window.electronAPI 未定义引发异常
 * 关键不变量：
 * - 在测试环境中 window.electronAPI 始终可用
 * - 仅提供最小必需能力，不引入业务行为
 * 边界说明：
 * - 不覆盖业务模块逻辑正确性
 * - 不覆盖真实 Electron 进程通信行为
 * 依赖与限制（如有）：
 * - 依赖 jsdom 的 window 对象
 */
import '@testing-library/jest-dom/vitest';

// 为内核日志服务提供最小 Electron API stub，避免单测环境访问未定义对象。
if (!window.electronAPI) {
    window.electronAPI = {
        logger: {
            writeLog: async () => ({ success: true }),
            writeLogBatch: async () => ({ success: true }),
            readLogFile: async () => ({ success: true, content: '' }),
            clearLogs: async () => ({ success: true }),
        },
        ai: {
            startTask: async () => ({ taskId: 'test-task-id' }),
            cancelTask: async () => undefined,
            onTaskEvent: () => () => undefined,
        },
        writeLogBatch: async () => ({ success: true }),
        readLogFile: async () => ({ success: true, content: '' }),
        clearLogs: async () => ({ success: true }),
    } as unknown as IElectronAPI;
}
