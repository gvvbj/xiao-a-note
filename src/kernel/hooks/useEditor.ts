import { useState, useEffect, useCallback, useMemo } from 'react';
import { useKernel } from '../core/KernelContext';
import { ServiceId } from '../core/ServiceId';
import { IEditorService, IEditorState } from '../interfaces';
import { CoreEvents } from '../core/Events';

// Re-export for backward compatibility
export type EditorState = IEditorState;

export function useEditor() {
    const kernel = useKernel();
    const editorService = kernel.getService<IEditorService>(ServiceId.EDITOR, false);

    const [state, setState] = useState<EditorState>(
        editorService ? editorService.getState() : {
            currentFileId: null,
            isUnsaved: false,
            headingNumbering: false,
            saveAsDialogOpen: false,
            viewMode: 'preview',
        }
    );

    useEffect(() => {
        if (!editorService) return;

        const handleEditorChanged = (newState: EditorState) => {
            setState(newState);
        };

        editorService.on(CoreEvents.EDITOR_CHANGED, handleEditorChanged);
        setState(editorService.getState());
        return () => {
            editorService.off(CoreEvents.EDITOR_CHANGED, handleEditorChanged);
        };
    }, [editorService]);

    const setCurrentFile = useCallback((id: string | null) => editorService?.setCurrentFile(id), [editorService]);
    const setUnsaved = useCallback((unsaved: boolean) => editorService?.setUnsaved(unsaved), [editorService]);
    const setHeadingNumbering = useCallback((enable: boolean) => editorService?.setHeadingNumbering(enable), [editorService]);
    const setViewMode = useCallback((mode: 'source' | 'preview') => editorService?.setViewMode(mode), [editorService]);
    const setSaveAsDialogOpen = useCallback((open: boolean) => editorService?.setSaveAsDialogOpen(open), [editorService]);

    return useMemo(() => ({
        ...state,
        setCurrentFile,
        setUnsaved,
        setHeadingNumbering,
        setViewMode,
        setSaveAsDialogOpen,
        service: editorService
    }), [
        state,
        setCurrentFile,
        setUnsaved,
        setHeadingNumbering,
        setViewMode,
        setSaveAsDialogOpen,
        editorService
    ]);
}
