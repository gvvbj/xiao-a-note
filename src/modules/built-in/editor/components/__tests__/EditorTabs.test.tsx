import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { Kernel } from '@/kernel/core/Kernel';
import { KernelProvider } from '@/kernel/core/KernelContext';
import { ServiceId } from '@/kernel/core/ServiceId';
import { EditorTabs } from '../EditorTabs';

const setSelectedFilePath = vi.fn();

let tabInteractionsState = {
    tabs: [] as Array<{ id: string; path: string; name: string; isDirty: boolean }>,
    activeTabId: null as string | null,
    contextMenu: null as { x: number; y: number; tabId: string } | null,
    draggedIndex: null as number | null,
    dragOverIndex: null as number | null,
};

const tabInteractionActions = {
    handleActivate: vi.fn(),
    setContextMenu: vi.fn(),
    onDragStart: vi.fn(),
    onDragOver: vi.fn(),
    onDrop: vi.fn(),
    onDragEnd: vi.fn(),
    getContextMenuItems: vi.fn(() => []),
    closeTab: vi.fn(),
};

vi.mock('@/kernel/hooks/useWorkspace', () => ({
    useWorkspace: () => ({
        setSelectedFilePath,
    }),
}));

vi.mock('@/modules/built-in/editor/hooks/useTabInteractions', () => ({
    useTabInteractions: () => ({
        state: tabInteractionsState,
        actions: tabInteractionActions,
    }),
}));

describe('EditorTabs cold-start active tab guard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
            configurable: true,
            value: vi.fn(),
        });
        tabInteractionsState = {
            tabs: [],
            activeTabId: null,
            contextMenu: null,
            draggedIndex: null,
            dragOverIndex: null,
        };
    });

    it('当 UI 快照落后于 TabService 实时状态时，不应回流旧 OPEN_FILE', () => {
        const kernel = new Kernel();
        const emitSpy = vi.spyOn(kernel, 'emit');

        const liveTabService = {
            getActiveTabId: () => 'e:/docs/new.md',
            getTabs: () => [
                { id: 'e:/docs/old.md', path: 'e:/docs/old.md', name: 'old.md', isDirty: false },
                { id: 'e:/docs/new.md', path: 'e:/docs/new.md', name: 'new.md', isDirty: false },
            ],
        };

        kernel.registerService(ServiceId.TAB, liveTabService, true);

        tabInteractionsState = {
            tabs: [
                { id: 'e:/docs/old.md', path: 'e:/docs/old.md', name: 'old.md', isDirty: false },
                { id: 'e:/docs/new.md', path: 'e:/docs/new.md', name: 'new.md', isDirty: false },
            ],
            activeTabId: 'e:/docs/old.md',
            contextMenu: null,
            draggedIndex: null,
            dragOverIndex: null,
        };

        render(
            <KernelProvider kernel={kernel}>
                <EditorTabs />
            </KernelProvider>
        );

        expect(emitSpy).not.toHaveBeenCalledWith('editor:open_file', 'e:/docs/old.md');
    });

    it('当 UI 快照与 TabService 一致时，应正常回流当前活动标签', () => {
        const kernel = new Kernel();
        const emitSpy = vi.spyOn(kernel, 'emit');

        const liveTabService = {
            getActiveTabId: () => 'e:/docs/new.md',
            getTabs: () => [{ id: 'e:/docs/new.md', path: 'e:/docs/new.md', name: 'new.md', isDirty: false }],
        };

        kernel.registerService(ServiceId.TAB, liveTabService, true);

        tabInteractionsState = {
            tabs: [{ id: 'e:/docs/new.md', path: 'e:/docs/new.md', name: 'new.md', isDirty: false }],
            activeTabId: 'e:/docs/new.md',
            contextMenu: null,
            draggedIndex: null,
            dragOverIndex: null,
        };

        render(
            <KernelProvider kernel={kernel}>
                <EditorTabs />
            </KernelProvider>
        );

        expect(emitSpy).toHaveBeenCalledWith('editor:open_file', 'e:/docs/new.md');
    });
});
