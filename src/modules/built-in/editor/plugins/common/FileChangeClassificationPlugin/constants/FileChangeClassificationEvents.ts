export const FILE_CHANGE_CLASSIFICATION_EVENTS = {
    EXTERNAL_CHANGE_OBSERVED: 'editor-infra:file-change/external-change-observed',
    EXTERNAL_OVERWRITE_CANDIDATE: 'editor-infra:file-change/external-overwrite-candidate',
} as const;

export const FILE_CHANGE_CLASSIFICATION_WATCH_EVENT = {
    CHANGE: 'change',
    RENAME: 'rename',
} as const;
