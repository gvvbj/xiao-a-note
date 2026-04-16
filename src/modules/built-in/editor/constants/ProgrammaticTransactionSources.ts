export const PROGRAMMATIC_TRANSACTION_SOURCES = {
    SYNC_PROTOCOL: 'sync-protocol',
    SYNC_EDITOR_CONTENT: 'sync-editor-content',
    EDITOR_SET_CONTENT: 'editor-set-content',
    EDITOR_RESET_STATE: 'editor-reset-state',
    KANBAN_DEACTIVATE_VIEW: 'kanban-deactivate-view',
} as const;

export type ProgrammaticTransactionSource =
    (typeof PROGRAMMATIC_TRANSACTION_SOURCES)[keyof typeof PROGRAMMATIC_TRANSACTION_SOURCES];
