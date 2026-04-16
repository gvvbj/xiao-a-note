/**
 * 测试范围：PersistenceService 自动保存与外部冲突保护
 * 测试类型：服务 / 集成 / 回归
 * 测试目的：验证自动保存时间换算、外部覆盖阻塞、二次保存保护、正常保存写盘的关键行为
 * 防回归问题：自动保存分钟配置失效、冲突状态下静默覆盖、正常保存后未登记内部写盘导致误报
 * 关键不变量：
 * - 自动保存时间按分钟换算
 * - unresolved conflict 时自动保存必须暂停
 * - unresolved conflict 时手动保存必须走守卫服务确认
 * - 正常保存必须登记内部写盘并发出 FILE_SAVED
 * 边界说明：
 * - 不覆盖真实磁盘写入与 Electron watch 回流
 * - 不覆盖 Save As 的完整 UI 流程
 * 依赖与限制：
 * - 使用 fake timers
 * - 使用 mock NoteService / TabService / SettingsService
 */
import EventEmitter from 'eventemitter3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import {
    EXTERNAL_OVERWRITE_GUARD_SERVICE_ID,
    FILE_CHANGE_CLASSIFICATION_SERVICE_ID,
} from '@/modules/interfaces';
import { EditorEvents } from '../../../../../constants/EditorEvents';
import { PersistenceService, resolveAutoSaveDelayMs } from '../PersistenceService';

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

describe('resolveAutoSaveDelayMs', () => {
    it('应在自动保存关闭时返回 null', () => {
        expect(resolveAutoSaveDelayMs(0)).toBeNull();
        expect(resolveAutoSaveDelayMs(-1)).toBeNull();
    });

    it('应按分钟值换算毫秒，不再被秒级上限截断', () => {
        expect(resolveAutoSaveDelayMs(1)).toBe(60 * 1000);
        expect(resolveAutoSaveDelayMs(5)).toBe(5 * 60 * 1000);
        expect(resolveAutoSaveDelayMs(10)).toBe(10 * 60 * 1000);
    });

    it('应仅对过小的正值应用最小保存下限', () => {
        expect(resolveAutoSaveDelayMs(1 / 120)).toBe(1000);
    });
});

describe('PersistenceService external conflict protection', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('应在存在外部冲突时阻止自动保存', async () => {
        const kernel = new FakeKernel();
        const noteService = { saveFile: vi.fn(), saveAs: vi.fn() };
        const fileSystem = { checkExists: vi.fn(async () => true) };
        const tabService = {
            getTab: vi.fn(() => ({ path: 'docs/test.md', content: 'old content' })),
        };
        const fileChangeClassificationService = {
            markInternalWrite: vi.fn(),
            markPathTransition: vi.fn(),
            consumeWatchChange: vi.fn(),
            shouldIgnoreFsChange: vi.fn(() => false),
        };
        const externalOverwriteGuardService = {
            hasBlockingConflict: vi.fn(() => true),
            isDialogOpen: vi.fn(() => false),
            keepConflict: vi.fn(),
            clearConflict: vi.fn(),
            getConflict: vi.fn(() => null),
            reloadLatestFromDisk: vi.fn(),
            closeConflictedTab: vi.fn(),
            promptSaveProtection: vi.fn(),
        };
        const settingsService = {
            getSetting: vi.fn(() => 1 / 120),
        };

        kernel.services.set(ServiceId.NOTE, noteService);
        kernel.services.set(ServiceId.FILE_SYSTEM, fileSystem);
        kernel.services.set(ServiceId.TAB, tabService);
        kernel.services.set(ServiceId.SETTINGS, settingsService);
        kernel.services.set(FILE_CHANGE_CLASSIFICATION_SERVICE_ID, fileChangeClassificationService);
        kernel.services.set(EXTERNAL_OVERWRITE_GUARD_SERVICE_ID, externalOverwriteGuardService);

        const service = new PersistenceService(kernel as any);
        service.start();

        kernel.emit(EditorEvents.EDITOR_CONTENT_INPUT, {
            path: 'docs/test.md',
            newContent: 'old content',
            initialContent: 'initial',
        });

        await vi.advanceTimersByTimeAsync(1000);

        expect(noteService.saveFile).not.toHaveBeenCalled();
    });

    it('应在存在外部冲突时阻止手动保存并弹出确认对话框', async () => {
        const kernel = new FakeKernel();
        const noteService = { saveFile: vi.fn(async () => true), saveAs: vi.fn() };
        const fileSystem = { checkExists: vi.fn(async () => true) };
        const tabService = {
            clearTabContent: vi.fn(),
            updateTabContent: vi.fn(),
            setTabDirty: vi.fn(),
        };
        const editorService = {
            setUnsaved: vi.fn(),
        };
        const fileChangeClassificationService = {
            markInternalWrite: vi.fn(),
            markPathTransition: vi.fn(),
            consumeWatchChange: vi.fn(),
            shouldIgnoreFsChange: vi.fn(() => false),
        };
        const externalOverwriteGuardService = {
            hasBlockingConflict: vi.fn(() => true),
            isDialogOpen: vi.fn(() => false),
            keepConflict: vi.fn(),
            clearConflict: vi.fn(),
            getConflict: vi.fn(() => null),
            reloadLatestFromDisk: vi.fn(),
            closeConflictedTab: vi.fn(),
            promptSaveProtection: vi.fn(),
        };

        kernel.services.set(ServiceId.NOTE, noteService);
        kernel.services.set(ServiceId.FILE_SYSTEM, fileSystem);
        kernel.services.set(ServiceId.TAB, tabService);
        kernel.services.set(ServiceId.EDITOR, editorService);
        kernel.services.set(FILE_CHANGE_CLASSIFICATION_SERVICE_ID, fileChangeClassificationService);
        kernel.services.set(EXTERNAL_OVERWRITE_GUARD_SERVICE_ID, externalOverwriteGuardService);

        const service = new PersistenceService(kernel as any);
        const result = await service.saveFile('docs/test.md', 'old content', false);

        expect(result).toBe(false);
        expect(noteService.saveFile).not.toHaveBeenCalled();
        expect(externalOverwriteGuardService.promptSaveProtection).toHaveBeenCalledTimes(1);
        expect(externalOverwriteGuardService.promptSaveProtection).toHaveBeenCalledWith(
            'docs/test.md',
            expect.any(Function),
        );
    });

    it('应在正常保存成功后登记内部写盘并发出 FILE_SAVED 事件', async () => {
        const kernel = new FakeKernel();
        const noteService = { saveFile: vi.fn(async () => true), saveAs: vi.fn() };
        const fileSystem = { checkExists: vi.fn(async () => true) };
        const tabService = {
            updateTabContent: vi.fn(),
            setTabDirty: vi.fn(),
        };
        const editorService = {
            setUnsaved: vi.fn(),
        };
        const fileChangeClassificationService = {
            markInternalWrite: vi.fn(),
            markPathTransition: vi.fn(),
            consumeWatchChange: vi.fn(),
            shouldIgnoreFsChange: vi.fn(() => false),
        };
        const externalOverwriteGuardService = {
            hasBlockingConflict: vi.fn(() => false),
            isDialogOpen: vi.fn(() => false),
            keepConflict: vi.fn(),
            clearConflict: vi.fn(),
            getConflict: vi.fn(() => null),
            reloadLatestFromDisk: vi.fn(),
            closeConflictedTab: vi.fn(),
            promptSaveProtection: vi.fn(),
        };

        kernel.services.set(ServiceId.NOTE, noteService);
        kernel.services.set(ServiceId.FILE_SYSTEM, fileSystem);
        kernel.services.set(ServiceId.TAB, tabService);
        kernel.services.set(ServiceId.EDITOR, editorService);
        kernel.services.set(FILE_CHANGE_CLASSIFICATION_SERVICE_ID, fileChangeClassificationService);
        kernel.services.set(EXTERNAL_OVERWRITE_GUARD_SERVICE_ID, externalOverwriteGuardService);

        const service = new PersistenceService(kernel as any);
        const result = await service.saveFile('docs/test.md', '# content', false);

        expect(result).toBe(true);
        expect(noteService.saveFile).toHaveBeenCalledWith('docs/test.md', '# content');
        expect(fileChangeClassificationService.markInternalWrite).toHaveBeenCalledWith('docs/test.md');
        expect(externalOverwriteGuardService.clearConflict).toHaveBeenCalledWith('docs/test.md');
        expect(kernel.emittedEvents.some(event => event.event === CoreEvents.FILE_SAVED)).toBe(true);
    });
    it('应在目标路径已不存在时阻止保存并提示用户', async () => {
        const kernel = new FakeKernel();
        const noteService = { saveFile: vi.fn(async () => true), saveAs: vi.fn() };
        const fileSystem = { checkExists: vi.fn(async () => false) };
        const externalOverwriteGuardService = {
            hasBlockingConflict: vi.fn(() => false),
            isDialogOpen: vi.fn(() => false),
            keepConflict: vi.fn(),
            clearConflict: vi.fn(),
            getConflict: vi.fn(() => null),
            reloadLatestFromDisk: vi.fn(),
            closeConflictedTab: vi.fn(),
            promptSaveProtection: vi.fn(),
        };

        kernel.services.set(ServiceId.NOTE, noteService);
        kernel.services.set(ServiceId.FILE_SYSTEM, fileSystem);
        kernel.services.set(EXTERNAL_OVERWRITE_GUARD_SERVICE_ID, externalOverwriteGuardService);

        const service = new PersistenceService(kernel as any);
        const result = await service.saveFile('docs/moved.md', '# content', false);

        expect(result).toBe(false);
        expect(noteService.saveFile).not.toHaveBeenCalled();
        expect(kernel.emittedEvents.some(event => event.event === CoreEvents.APP_SHOW_MESSAGE_DIALOG)).toBe(true);
    });

    it('应在另存为成功后用正式文件替换当前 untitled 标签，而不是额外新增重复标签', async () => {
        const kernel = new FakeKernel();
        const noteService = {
            saveFile: vi.fn(async () => true),
            saveAs: vi.fn(async () => 'docs/saved.md'),
        };
        const tabService = {
            getTab: vi.fn(() => undefined),
            updateTabPath: vi.fn(),
            updateTabContent: vi.fn(),
            setTabDirty: vi.fn(),
            openTab: vi.fn(),
            closeTab: vi.fn(),
        };
        const editorService = {
            getState: vi.fn(() => ({ currentFileId: 'untitled-123' })),
            setCurrentFile: vi.fn(),
            setUnsaved: vi.fn(),
        };
        const fileChangeClassificationService = {
            markInternalWrite: vi.fn(),
            markPathTransition: vi.fn(),
            consumeWatchChange: vi.fn(),
            shouldIgnoreFsChange: vi.fn(() => false),
        };

        kernel.services.set(ServiceId.NOTE, noteService);
        kernel.services.set(ServiceId.TAB, tabService);
        kernel.services.set(ServiceId.EDITOR, editorService);
        kernel.services.set(FILE_CHANGE_CLASSIFICATION_SERVICE_ID, fileChangeClassificationService);

        const service = new PersistenceService(kernel as any);
        const result = await service.saveAs('# content');

        expect(result).toBe(true);
        expect(tabService.updateTabPath).toHaveBeenCalledWith('untitled-123', 'docs/saved.md');
        expect(tabService.openTab).not.toHaveBeenCalled();
        expect(tabService.updateTabContent).toHaveBeenCalledWith('docs/saved.md', '# content', false);
        expect(tabService.setTabDirty).toHaveBeenCalledWith('docs/saved.md', false);
        expect(editorService.setCurrentFile).toHaveBeenCalledWith('docs/saved.md');
    });
});
