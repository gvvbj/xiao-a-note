export const AppDragType = {
    EDITOR_TAB_REFERENCE: 'application/x-xiao-a-note-editor-tab-reference',
} as const;

export interface IEditorTabDragPayload {
    tabId: string;
    path: string;
    name: string;
}
