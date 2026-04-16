import EventEmitter from 'eventemitter3';
import { describe, expect, it, vi } from 'vitest';

import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import { EditorEvents } from '../../../../../constants/EditorEvents';
import { LifecycleService } from '../LifecycleService';

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

class FakeTabService {
    private tabs = new Map<string, any>();

    seedTab(path: string, content?: string, isDirty = false) {
        this.tabs.set(path, { id: path, path, content, isDirty });
    }

    getTab(path: string) {
        return this.tabs.get(path);
    }

    getTabContent(path: string) {
        return this.tabs.get(path)?.content;
    }

    updateTabContent(path: string, content: string, isDirty?: boolean) {
        const current = this.tabs.get(path) ?? { id: path, path, isDirty: false };
        this.tabs.set(path, {
            ...current,
            id: path,
            path,
            content,
            isDirty: isDirty ?? true,
        });
    }

    clearTabContent(path: string) {
        const current = this.tabs.get(path) ?? { id: path, path, isDirty: false };
        this.tabs.set(path, {
            ...current,
            id: path,
            path,
            content: undefined,
            isDirty: false,
        });
    }

    setTabDirty(path: string, isDirty: boolean) {
        const current = this.tabs.get(path) ?? { id: path, path };
        this.tabs.set(path, { ...current, id: path, path, isDirty });
    }
}

describe('LifecycleService failure isolation', () => {
    it('应在目标路径不存在时结束切换并清除该标签的陈旧缓存', async () => {
        const kernel = new FakeKernel();
        const tabService = new FakeTabService();
        const editorService = { setUnsaved: vi.fn() };
        const noteService = {
            readFile: vi.fn(async (path: string) => {
                if (path === 'docs/source.md') {
                    return '# source';
                }
                throw new Error(`unexpected read: ${path}`);
            }),
        };
        const fileSystem = {
            checkExists: vi.fn(async (path: string) => path === 'docs/source.md'),
        };
        const failures: Array<{ path: string | null; error: string }> = [];

        tabService.seedTab('docs/missing.md', '# stale cache', false);
        kernel.services.set(ServiceId.TAB, tabService);
        kernel.services.set(ServiceId.EDITOR, editorService);
        kernel.services.set(ServiceId.NOTE, noteService);
        kernel.services.set(ServiceId.FILE_SYSTEM, fileSystem);
        kernel.on(EditorEvents.LIFECYCLE_SWITCHING_FAILED, (payload) => failures.push(payload));

        const service = new LifecycleService(kernel as any);

        await service.switchFile('docs/source.md', { currentContent: '' });
        await service.switchFile('docs/missing.md', { currentContent: '# source' });

        expect(failures).toHaveLength(1);
        expect(failures[0]).toEqual({
            path: 'docs/missing.md',
            error: '目标文件不存在：docs/missing.md',
        });
        expect(service.getState()).toMatchObject({
            activePath: 'docs/missing.md',
            loadedPath: null,
            status: 'idle',
            lastError: '目标文件不存在：docs/missing.md',
        });
        expect(tabService.getTabContent('docs/missing.md')).toBeUndefined();
        expect(editorService.setUnsaved).toHaveBeenLastCalledWith(false);
    });

    it('失败目标在后续切换时不应继承上一份成功文档内容', async () => {
        const kernel = new FakeKernel();
        const tabService = new FakeTabService();
        const editorService = { setUnsaved: vi.fn() };
        const noteService = {
            readFile: vi.fn(async (path: string) => {
                if (path === 'docs/source.md') {
                    return '# source';
                }
                if (path === 'docs/other.md') {
                    return '# other';
                }
                throw new Error(`unexpected read: ${path}`);
            }),
        };
        const fileSystem = {
            checkExists: vi.fn(async (path: string) => path !== 'docs/missing.md'),
        };

        tabService.seedTab('docs/missing.md', '# stale cache', false);
        kernel.services.set(ServiceId.TAB, tabService);
        kernel.services.set(ServiceId.EDITOR, editorService);
        kernel.services.set(ServiceId.NOTE, noteService);
        kernel.services.set(ServiceId.FILE_SYSTEM, fileSystem);

        const service = new LifecycleService(kernel as any);

        await service.switchFile('docs/source.md', { currentContent: '' });
        await service.switchFile('docs/missing.md', { currentContent: '# source' });
        await service.switchFile('docs/other.md', { currentContent: '# source' });

        expect(service.getState()).toMatchObject({
            activePath: 'docs/other.md',
            loadedPath: 'docs/other.md',
            status: 'idle',
            lastError: null,
        });
        expect(tabService.getTabContent('docs/missing.md')).toBeUndefined();
        expect(tabService.getTabContent('docs/source.md')).toBe('# source');
        expect(kernel.emittedEvents.some((event) => event.event === CoreEvents.DOCUMENT_CHANGED)).toBe(true);
    });
});
