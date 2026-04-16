import type React from 'react';
import type { EditorEngineView } from '@/kernel/interfaces/IEditorEngine';

export const SPLIT_PREVIEW_HOST_SERVICE_ID = 'splitPreviewHost';

export interface ISplitPreviewEditorProps {
    headingNumbering: boolean;
    currentFileId: string | null;
    onViewReady: (view: EditorEngineView, currentContent: string) => void;
}

export interface ISplitPreviewHost {
    PreviewEditorComponent: React.ComponentType<ISplitPreviewEditorProps>;
}
