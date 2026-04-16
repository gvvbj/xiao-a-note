import EventEmitter from 'eventemitter3';
import { describe, expect, it, vi } from 'vitest';

import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import { SplitViewService } from '../SplitViewService';

class FakeKernel extends EventEmitter {
    services = new Map<string, any>();

    getService<T>(id: string, required = true): T | undefined {
        const service = this.services.get(id);
        if (!service && required) {
            throw new Error(`Missing service: ${id}`);
        }
        return service;
    }
}

describe('SplitViewService', () => {
    it('应在编辑上下文清空时自动关闭分栏', () => {
        const kernel = new FakeKernel();
        const settingsService = {
            getSetting: vi.fn(() => false),
            updateSettings: vi.fn(),
        };
        const editorService = {
            getState: vi.fn(() => ({ viewMode: 'source' })),
            setViewMode: vi.fn(),
        };

        kernel.services.set(ServiceId.SETTINGS, settingsService);
        kernel.services.set(ServiceId.EDITOR, editorService);

        const service = new SplitViewService(kernel as any);
        service.init();
        service.setSplitView(true);

        expect(service.isSplitView).toBe(true);

        kernel.emit(CoreEvents.OPEN_FILE, null);

        expect(service.isSplitView).toBe(false);
    });
});
