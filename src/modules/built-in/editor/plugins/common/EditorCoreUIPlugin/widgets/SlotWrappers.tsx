import React from 'react';
import { EditorHeader } from '../../../../components/sub/EditorHeader';
import { EditorToolbar } from '../../../../components/EditorToolbar';
import { EditorMainView } from '../../../../components/sub/EditorMainView';
import { useNoteEditorContext } from '../../../../context/NoteEditorContext';
import { useKernel } from '@/kernel/core/KernelContext';
import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import { EditorPanelRegistry } from '../../../../registries/EditorPanelRegistry';
import { EditorEvents } from '../../../../constants/EditorEvents';

/**
 * SlotWrapper 组件集合
 * 用于在 Slot 中访问 NoteEditorContext
 */

export const HeaderSlot = () => {
    const { isUnsaved } = useNoteEditorContext();
    return <EditorHeader isUnsaved={isUnsaved} />;
};

export const ToolbarSlot = () => {
    const { editorRef } = useNoteEditorContext();
    return <EditorToolbar editorRef={editorRef} />;
};

export const MainViewSlot = () => {
    const kernel = useKernel();
    const {
        editorRef, previewEditorRef, initialContent, liveContentRef,
        currentPath, handleEditorUpdate, cursorLineRef, loadedPath, switchError
    } = useNoteEditorContext();

    const panelRegistry = kernel.getService<EditorPanelRegistry>(ServiceId.EDITOR_PANEL_REGISTRY, false);
    const [panels, setPanels] = React.useState(() => panelRegistry ? panelRegistry.getVisiblePanels() : []);

    React.useEffect(() => {
        if (!panelRegistry) return;
        return panelRegistry.subscribe(() => setPanels(panelRegistry.getVisiblePanels()));
    }, [panelRegistry]);

    const handleCursorActivity = React.useCallback((line: number) => {
        cursorLineRef.current = line;
        kernel.emit(CoreEvents.CURSOR_ACTIVITY, line);
    }, [kernel]);

    return (
        <EditorMainView
            panels={panels.filter(p => p.position === 'top' || p.position === 'bottom')}
            getEditorView={() => editorRef.current?.view || null}
            editorRef={editorRef}
            previewEditorRef={previewEditorRef}
            initialContent={initialContent}
            previewInitialContent={liveContentRef.current}
            currentPath={currentPath}
            handleEditorUpdate={handleEditorUpdate}
            onCursorActivity={handleCursorActivity}
            showSourceOnHover={false}
            loadedPath={loadedPath}
            switchError={switchError}
            onMainViewReady={React.useCallback((v: any) => {
                kernel.emit(CoreEvents.MAIN_VIEW_READY, v);
            }, [kernel])}
            onPreviewViewReady={React.useCallback((v: any) => {
                kernel.emit(CoreEvents.PREVIEW_VIEW_READY, v);
            }, [kernel])}
        />
    );
};
