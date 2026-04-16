import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KernelProvider } from '@/kernel/core/KernelContext';
import { ServiceId } from '@/kernel/core/ServiceId';
import { CoreEvents } from '@/kernel/core/Events';
import { useFileOperations } from '../useFileOperations';

const explorerState = {
    editingNode: { path: 'C:\\workspace', type: 'create-file' as const },
    stopEditing: vi.fn(),
};

vi.mock('@/kernel/hooks/useExplorer', () => ({
    useExplorer: () => explorerState,
}));

vi.mock('@/kernel/hooks/useWorkspace', () => ({
    useWorkspace: () => ({
        projectRoot: 'C:\\workspace',
    }),
}));

function createKernelStub(fileSystem: any) {
    return {
        emit: vi.fn(),
        getService: vi.fn((id: string) => {
            if (id === ServiceId.FILE_SYSTEM) return fileSystem;
            return null;
        }),
    };
}

function HookHarness({ refreshTree }: { refreshTree: () => Promise<void> }) {
    const { handleConfirmRename, messageDialog } = useFileOperations(refreshTree);

    return (
        <div>
            <button type="button" onClick={() => void handleConfirmRename('lesson-40')}>
                submit
            </button>
            <div data-testid="dialog-open">{messageDialog.isOpen ? 'open' : 'closed'}</div>
            <div data-testid="dialog-message">{messageDialog.message}</div>
        </div>
    );
}

describe('useFileOperations create-file guard', () => {
    beforeEach(() => {
        explorerState.editingNode = { path: 'C:\\workspace', type: 'create-file' };
        explorerState.stopEditing.mockReset();
    });

    it('createFile 失败时不应继续发 OPEN_FILE', async () => {
        const fileSystem = {
            pathJoin: vi.fn(async (...parts: string[]) => parts.join('\\')),
            checkExists: vi.fn(async () => false),
            createFile: vi.fn(async () => ({ success: false, error: 'disk full' })),
            createDirectory: vi.fn(),
            getDirname: vi.fn(),
            rename: vi.fn(),
            move: vi.fn(),
            delete: vi.fn(),
        };
        const refreshTree = vi.fn(async () => undefined);
        const kernel = createKernelStub(fileSystem);

        render(
            <KernelProvider kernel={kernel as any}>
                <HookHarness refreshTree={refreshTree} />
            </KernelProvider>
        );

        fireEvent.click(screen.getByRole('button', { name: 'submit' }));

        await waitFor(() => {
            expect(fileSystem.createFile).toHaveBeenCalledWith('C:\\workspace\\lesson-40.md', '');
        });
        expect(kernel.emit).not.toHaveBeenCalledWith(CoreEvents.OPEN_FILE, expect.anything());
        expect(refreshTree).not.toHaveBeenCalled();
        expect(screen.getByTestId('dialog-open')).toHaveTextContent('open');
        expect(screen.getByTestId('dialog-message')).toHaveTextContent('disk full');
    });

    it('createFile 成功时应刷新文件树并发 OPEN_FILE', async () => {
        const fileSystem = {
            pathJoin: vi.fn(async (...parts: string[]) => parts.join('\\')),
            checkExists: vi.fn(async () => false),
            createFile: vi.fn(async () => ({ success: true, path: 'C:\\workspace\\lesson-40.md' })),
            createDirectory: vi.fn(),
            getDirname: vi.fn(),
            rename: vi.fn(),
            move: vi.fn(),
            delete: vi.fn(),
        };
        const refreshTree = vi.fn(async () => undefined);
        const kernel = createKernelStub(fileSystem);

        render(
            <KernelProvider kernel={kernel as any}>
                <HookHarness refreshTree={refreshTree} />
            </KernelProvider>
        );

        fireEvent.click(screen.getByRole('button', { name: 'submit' }));

        await waitFor(() => {
            expect(refreshTree).toHaveBeenCalledTimes(1);
        });
        expect(kernel.emit).toHaveBeenCalledWith(CoreEvents.OPEN_FILE, 'C:\\workspace\\lesson-40.md');
    });
});
