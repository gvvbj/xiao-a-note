import React, { useLayoutEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { Kernel } from '@/kernel/core/Kernel';
import { KernelProvider } from '@/kernel/core/KernelContext';
import { ServiceId } from '@/kernel/core/ServiceId';
import { SettingsService } from '@/kernel/services/SettingsService';
import { TabService } from '@/kernel/services/TabService';
import { EditorService } from '@/kernel/services/EditorService';
import { useTabs } from '../useTabs';
import { useEditor } from '../useEditor';

function createKernel() {
    const kernel = new Kernel();
    const settings = new SettingsService();
    const tabService = new TabService();
    const editorService = new EditorService();

    kernel.registerService(ServiceId.SETTINGS, settings, true);
    kernel.registerService(ServiceId.TAB, tabService, true);
    kernel.registerService(ServiceId.EDITOR, editorService, true);

    tabService.init(kernel);
    editorService.init(kernel);

    return { kernel, tabService, editorService };
}

function TabsProbe() {
    const { tabs, activeTabId } = useTabs();
    return (
        <div data-testid="tabs-state">
            {JSON.stringify({
                tabs: tabs.map(tab => tab.path),
                activeTabId,
            })}
        </div>
    );
}

function TabsTrigger({ tabService }: { tabService: TabService }) {
    useLayoutEffect(() => {
        tabService.openTab('E:\\tmp\\cold-start.md', 'cold-start.md');
    }, [tabService]);

    return null;
}

function EditorProbe() {
    const { currentFileId } = useEditor();
    return <div data-testid="editor-state">{currentFileId ?? 'null'}</div>;
}

function EditorTrigger({ editorService }: { editorService: EditorService }) {
    useLayoutEffect(() => {
        editorService.setCurrentFile('E:\\tmp\\cold-start.md');
    }, [editorService]);

    return null;
}

describe('service sync hooks', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('useTabs 应在订阅后立即同步当前 TabService 状态', async () => {
        const { kernel, tabService } = createKernel();

        render(
            <KernelProvider kernel={kernel}>
                <TabsProbe />
                <TabsTrigger tabService={tabService} />
            </KernelProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('tabs-state').textContent).toContain('e:/tmp/cold-start.md');
            expect(screen.getByTestId('tabs-state').textContent).toContain('"activeTabId":"e:/tmp/cold-start.md"');
        });
    });

    it('useEditor 应在订阅后立即同步当前 EditorService 状态', async () => {
        const { kernel, editorService } = createKernel();

        render(
            <KernelProvider kernel={kernel}>
                <EditorProbe />
                <EditorTrigger editorService={editorService} />
            </KernelProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('editor-state')).toHaveTextContent('e:/tmp/cold-start.md');
        });
    });
});
