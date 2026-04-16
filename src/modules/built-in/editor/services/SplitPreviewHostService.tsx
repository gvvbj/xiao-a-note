import React, { useMemo, useRef, useCallback } from 'react';
import { CodeMirrorEditor } from '../components/CodeMirrorEditor';
import { IEditorRef } from '../framework/types';
import { useNoteEditorContext } from '../context/NoteEditorContext';
import { ISplitPreviewEditorProps, ISplitPreviewHost } from '@/modules/interfaces';

const SplitPreviewEditorHost: React.FC<ISplitPreviewEditorProps> = ({
    headingNumbering,
    currentFileId,
    onViewReady,
}) => {
    const { liveContentRef } = useNoteEditorContext();
    const previewRef = useRef<IEditorRef | null>(null);

    // 分栏同步优化：挂载时即刻从 Context 同步最新内容
    const previewInitialContent = useMemo(() => {
        if (typeof liveContentRef.current === 'function') {
            return liveContentRef.current();
        }
        return liveContentRef.current || '';
    }, [currentFileId, liveContentRef]);

    const handleViewReady = useCallback((view: Parameters<ISplitPreviewEditorProps['onViewReady']>[0]) => {
        const content = typeof liveContentRef.current === 'function'
            ? liveContentRef.current()
            : (liveContentRef.current || '');
        onViewReady(view, content);
    }, [liveContentRef, onViewReady]);

    return (
        <CodeMirrorEditor
            ref={previewRef}
            initialContent={previewInitialContent}
            onUpdate={() => { }}
            viewMode="preview"
            currentFilePath={currentFileId}
            readOnly={true}
            showSourceOnHover={false}
            className={headingNumbering ? 'show-heading-numbering' : ''}
            onViewReady={handleViewReady}
        />
    );
};

export class SplitPreviewHostService implements ISplitPreviewHost {
    readonly PreviewEditorComponent = SplitPreviewEditorHost;
}
