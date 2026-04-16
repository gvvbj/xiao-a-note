/**
 * 测试范围：外部覆盖守卫服务
 * 测试类型：服务 / 集成 / 回归
 * 测试目的：验证覆盖候选到冲突状态机、提示决策、关闭/重载/保留、内部覆盖清理、重命名清理的完整链路
 * 防回归问题：外部覆盖误报、冲突状态残留、内部覆盖后标签未清理、重命名后仍残留冲突状态
 * 关键不变量：
 * - 只有当前文件且磁盘内容失配时才确认冲突
 * - kept 状态下不能重复弹窗
 * - 内部覆盖和重命名必须清理冲突状态
 * 边界说明：
 * - 不覆盖真实文件系统监听
 * - 不覆盖 PersistenceService 自身的保存执行逻辑
 * 依赖与限制：
 * - 使用 FakeKernel、Fake TabService、Fake FileSystem
 * - 通过事件与服务协作验证状态流转
 */
import EventEmitter from 'eventemitter3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import { EDITOR_CONSTANTS } from '@/modules/built-in/editor/constants/EditorConstants';
import { FILE_CHANGE_CLASSIFICATION_EVENTS } from '@/modules/built-in/editor/plugins/common/FileChangeClassificationPlugin/constants/FileChangeClassificationEvents';
import { ExternalOverwriteGuardService } from '../ExternalOverwriteGuardService';

class FakeKernel extends EventEmitter {
    services = new Map<string, any>();
    emittedEvents: Array<{ event: string; payload: any }> = [];

    getService<T>(id: string, required = true): T | undefined {
        const service = this.services.get(id);
        if (!service && required) {
            throw new Error(`Missing service: ${id}`);
        }
        return service;
    }

    emit<T extends string | symbol>(event: T, ...args: any[]): boolean {
        this.emittedEvents.push({ event: String(event), payload: args[0] });
        return super.emit(event, ...args);
    }
}

async function flushAsyncWork(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
}

function createTabService(tab: { path: string; content?: string } | null) {
    const emitter = new EventEmitter();
    const tabs = tab ? [{ id: tab.path, ...tab }] : [];
    return Object.assign(emitter, {
        getActiveTabId: vi.fn(() => tab?.path ?? null),
        getTab: vi.fn(() => (tab ? { id: tab.path, ...tab } : undefined)),
        getTabs: vi.fn(() => tabs.map(item => ({ ...item }))),
        clearTabContent: vi.fn(),
        closeTab: vi.fn(),
    });
}

describe('ExternalOverwriteGuardService', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('应在当前文件被外部覆盖且磁盘内容不同时时确认冲突并请求提示', async () => {
        const kernel = new FakeKernel();
        const fileSystem = {
            readFile: vi.fn(async () => ({ success: true, content: '# new' })),
        };
        const editorService = {
            getState: vi.fn(() => ({ currentFileId: 'docs/test.md' })),
        };
        const tabService = createTabService({ path: 'docs/test.md', content: '# old' });
        const lifecycleService = {
            switchFile: vi.fn(),
        };

        kernel.services.set(ServiceId.FILE_SYSTEM, fileSystem);
        kernel.services.set(ServiceId.EDITOR, editorService);
        kernel.services.set(ServiceId.TAB, tabService);
        kernel.services.set(EDITOR_CONSTANTS.SERVICE_NAMES.LIFECYCLE, lifecycleService);

        const service = new ExternalOverwriteGuardService(kernel as any);
        service.start();

        kernel.emit(FILE_CHANGE_CLASSIFICATION_EVENTS.EXTERNAL_OVERWRITE_CANDIDATE, {
            path: 'docs/test.md',
            sourceEventType: 'rename',
            detectedAt: Date.now(),
        });
        await flushAsyncWork();

        expect(service.hasBlockingConflict('docs/test.md')).toBe(true);
        expect(service.getConflict('docs/test.md')).toMatchObject({
            path: 'docs/test.md',
            status: 'overwrite_confirmed',
            dialogKind: 'resolution',
        });

        const dialogEvent = kernel.emittedEvents.find(
            event => event.event === CoreEvents.APP_SHOW_SAVE_CONFIRM_DIALOG,
        );
        expect(dialogEvent).toBeTruthy();
    });

    it('应忽略非当前文件的外部覆盖候选', async () => {
        const kernel = new FakeKernel();
        const fileSystem = {
            readFile: vi.fn(async () => ({ success: true, content: '# new' })),
        };
        const editorService = {
            getState: vi.fn(() => ({ currentFileId: 'docs/other.md' })),
        };
        const tabService = createTabService({ path: 'docs/other.md', content: '# old' });

        kernel.services.set(ServiceId.FILE_SYSTEM, fileSystem);
        kernel.services.set(ServiceId.EDITOR, editorService);
        kernel.services.set(ServiceId.TAB, tabService);

        const service = new ExternalOverwriteGuardService(kernel as any);
        service.start();

        kernel.emit(FILE_CHANGE_CLASSIFICATION_EVENTS.EXTERNAL_OVERWRITE_CANDIDATE, {
            path: 'docs/test.md',
            sourceEventType: 'rename',
            detectedAt: Date.now(),
        });
        await flushAsyncWork();

        expect(service.getConflict('docs/test.md')).toBeNull();
        expect(
            kernel.emittedEvents.some(event => event.event === CoreEvents.APP_SHOW_SAVE_CONFIRM_DIALOG),
        ).toBe(false);
    });

    it('应在用户选择暂时保留后保留阻塞状态但不再重复提示', async () => {
        const kernel = new FakeKernel();
        const fileSystem = {
            readFile: vi.fn(async () => ({ success: true, content: '# new' })),
        };
        const editorService = {
            getState: vi.fn(() => ({ currentFileId: 'docs/test.md' })),
        };
        const tabService = createTabService({ path: 'docs/test.md', content: '# old' });
        const lifecycleService = {
            switchFile: vi.fn(),
        };

        kernel.services.set(ServiceId.FILE_SYSTEM, fileSystem);
        kernel.services.set(ServiceId.EDITOR, editorService);
        kernel.services.set(ServiceId.TAB, tabService);
        kernel.services.set(EDITOR_CONSTANTS.SERVICE_NAMES.LIFECYCLE, lifecycleService);

        const service = new ExternalOverwriteGuardService(kernel as any);
        service.start();

        kernel.emit(FILE_CHANGE_CLASSIFICATION_EVENTS.EXTERNAL_OVERWRITE_CANDIDATE, {
            path: 'docs/test.md',
            sourceEventType: 'rename',
            detectedAt: Date.now(),
        });
        await flushAsyncWork();

        const dialogEvent = kernel.emittedEvents.find(
            event => event.event === CoreEvents.APP_SHOW_SAVE_CONFIRM_DIALOG,
        );
        expect(dialogEvent).toBeTruthy();

        dialogEvent?.payload.onCancel();

        expect(service.hasBlockingConflict('docs/test.md')).toBe(true);
        expect(service.getConflict('docs/test.md')?.status).toBe('kept');
        expect(service.getConflict('docs/test.md')?.dialogKind).toBeNull();
    });

    it('应在重新加载时清空缓存并清理冲突状态', async () => {
        const kernel = new FakeKernel();
        const fileSystem = {
            readFile: vi.fn(async () => ({ success: true, content: '# new' })),
        };
        const editorService = {
            getState: vi.fn(() => ({ currentFileId: 'docs/test.md' })),
        };
        const tabService = createTabService({ path: 'docs/test.md', content: '# old' });
        const lifecycleService = {
            switchFile: vi.fn(async () => undefined),
        };

        kernel.services.set(ServiceId.FILE_SYSTEM, fileSystem);
        kernel.services.set(ServiceId.EDITOR, editorService);
        kernel.services.set(ServiceId.TAB, tabService);
        kernel.services.set(EDITOR_CONSTANTS.SERVICE_NAMES.LIFECYCLE, lifecycleService);

        const service = new ExternalOverwriteGuardService(kernel as any);
        service.start();

        kernel.emit(FILE_CHANGE_CLASSIFICATION_EVENTS.EXTERNAL_OVERWRITE_CANDIDATE, {
            path: 'docs/test.md',
            sourceEventType: 'rename',
            detectedAt: Date.now(),
        });
        await flushAsyncWork();

        const dialogEvent = kernel.emittedEvents.find(
            event => event.event === CoreEvents.APP_SHOW_SAVE_CONFIRM_DIALOG,
        );
        await dialogEvent?.payload.onSave();

        expect(tabService.clearTabContent).toHaveBeenCalledWith('docs/test.md');
        expect(lifecycleService.switchFile).toHaveBeenCalledWith('docs/test.md', {
            currentContent: '',
            forceReload: true,
        });
        expect(service.getConflict('docs/test.md')).toBeNull();
    });

    it('应在请求保存保护时统一由守卫服务弹出二次确认', async () => {
        const kernel = new FakeKernel();
        const fileSystem = {
            readFile: vi.fn(async () => ({ success: true, content: '# new' })),
        };
        const editorService = {
            getState: vi.fn(() => ({ currentFileId: 'docs/test.md' })),
        };
        const tabService = createTabService({ path: 'docs/test.md', content: '# old' });
        const lifecycleService = {
            switchFile: vi.fn(async () => undefined),
        };
        const onConfirmOverwrite = vi.fn(async () => true);

        kernel.services.set(ServiceId.FILE_SYSTEM, fileSystem);
        kernel.services.set(ServiceId.EDITOR, editorService);
        kernel.services.set(ServiceId.TAB, tabService);
        kernel.services.set(EDITOR_CONSTANTS.SERVICE_NAMES.LIFECYCLE, lifecycleService);

        const service = new ExternalOverwriteGuardService(kernel as any);
        service.start();

        kernel.emit(FILE_CHANGE_CLASSIFICATION_EVENTS.EXTERNAL_OVERWRITE_CANDIDATE, {
            path: 'docs/test.md',
            sourceEventType: 'rename',
            detectedAt: Date.now(),
        });
        await flushAsyncWork();

        service.keepConflict('docs/test.md');
        kernel.emittedEvents = [];

        service.promptSaveProtection('docs/test.md', onConfirmOverwrite);

        const dialogEvent = kernel.emittedEvents.find(
            event => event.event === CoreEvents.APP_SHOW_SAVE_CONFIRM_DIALOG,
        );
        expect(dialogEvent?.payload.title).toBe('检测到外部覆盖冲突');
        await dialogEvent?.payload.onSave();

        expect(onConfirmOverwrite).toHaveBeenCalledTimes(1);
    });

    it('应在标签关闭后清理已保留的冲突状态', async () => {
        const kernel = new FakeKernel();
        const fileSystem = {
            readFile: vi.fn(async () => ({ success: true, content: '# new' })),
        };
        const editorService = {
            getState: vi.fn(() => ({ currentFileId: 'docs/test.md' })),
        };
        const tabService = createTabService({ path: 'docs/test.md', content: '# old' });

        kernel.services.set(ServiceId.FILE_SYSTEM, fileSystem);
        kernel.services.set(ServiceId.EDITOR, editorService);
        kernel.services.set(ServiceId.TAB, tabService);

        const service = new ExternalOverwriteGuardService(kernel as any);
        service.start();

        kernel.emit(FILE_CHANGE_CLASSIFICATION_EVENTS.EXTERNAL_OVERWRITE_CANDIDATE, {
            path: 'docs/test.md',
            sourceEventType: 'rename',
            detectedAt: Date.now(),
        });
        await flushAsyncWork();

        service.keepConflict('docs/test.md');
        tabService.getTabs.mockReturnValue([]);
        tabService.emit(CoreEvents.TABS_CHANGED);

        expect(service.getConflict('docs/test.md')).toBeNull();
    });

    it('应在内部覆盖事件后关闭被覆盖标签并清理冲突状态', async () => {
        const kernel = new FakeKernel();
        const fileSystem = {
            readFile: vi.fn(async () => ({ success: true, content: '# new' })),
        };
        const editorService = {
            getState: vi.fn(() => ({ currentFileId: 'docs/test.md' })),
        };
        const tabService = createTabService({ path: 'docs/test.md', content: '# old' });

        kernel.services.set(ServiceId.FILE_SYSTEM, fileSystem);
        kernel.services.set(ServiceId.EDITOR, editorService);
        kernel.services.set(ServiceId.TAB, tabService);

        const service = new ExternalOverwriteGuardService(kernel as any);
        service.start();

        kernel.emit(FILE_CHANGE_CLASSIFICATION_EVENTS.EXTERNAL_OVERWRITE_CANDIDATE, {
            path: 'docs/test.md',
            sourceEventType: 'rename',
            detectedAt: Date.now(),
        });
        await flushAsyncWork();

        expect(service.getConflict('docs/test.md')).not.toBeNull();

        kernel.emit(CoreEvents.FILE_OVERWRITTEN, 'docs/test.md');

        expect(tabService.clearTabContent).toHaveBeenCalledWith('docs/test.md');
        expect(tabService.closeTab).toHaveBeenCalledWith('docs/test.md');
        expect(service.getConflict('docs/test.md')).toBeNull();
    });

    it('应在文件重命名后清理旧路径与新路径的冲突状态', async () => {
        const kernel = new FakeKernel();
        const fileSystem = {
            readFile: vi.fn(async () => ({ success: true, content: '# new' })),
        };
        const editorService = {
            getState: vi.fn(() => ({ currentFileId: 'docs/test.md' })),
        };
        const tabService = createTabService({ path: 'docs/test.md', content: '# old' });

        kernel.services.set(ServiceId.FILE_SYSTEM, fileSystem);
        kernel.services.set(ServiceId.EDITOR, editorService);
        kernel.services.set(ServiceId.TAB, tabService);

        const service = new ExternalOverwriteGuardService(kernel as any);
        service.start();

        kernel.emit(FILE_CHANGE_CLASSIFICATION_EVENTS.EXTERNAL_OVERWRITE_CANDIDATE, {
            path: 'docs/test.md',
            sourceEventType: 'rename',
            detectedAt: Date.now(),
        });
        await flushAsyncWork();

        expect(service.getConflict('docs/test.md')).not.toBeNull();

        kernel.emit(CoreEvents.FILE_MOVED, {
            oldPath: 'docs/test.md',
            newPath: 'docs/test-renamed.md',
        });

        expect(service.getConflict('docs/test.md')).toBeNull();
        expect(service.getConflict('docs/test-renamed.md')).toBeNull();
    });
});
