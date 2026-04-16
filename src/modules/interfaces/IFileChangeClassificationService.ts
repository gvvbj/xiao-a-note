export const FILE_CHANGE_CLASSIFICATION_SERVICE_ID = 'editor.file-change-classification';

export type FileWatchChangeKind =
    | 'ignored_internal_write'
    | 'ignored_missing'
    | 'ignored_unknown'
    | 'external_change_observed'
    | 'external_overwrite_candidate';

export interface IRawFileWatchChange {
    changedPath: string;
    eventType?: string;
    exists: boolean;
}

export interface IFileWatchChangeClassification {
    path: string;
    kind: FileWatchChangeKind;
    sourceEventType?: string;
    detectedAt: number;
}

export interface IFileChangeClassificationService {
    markInternalWrite(path: string): void;
    markPathTransition(oldPath: string, newPath: string): void;
    consumeWatchChange(change: IRawFileWatchChange): IFileWatchChangeClassification | null;
    consumeWatchChanges(changes: IRawFileWatchChange[]): IFileWatchChangeClassification[];
    shouldIgnoreFsChange(path: string): boolean;
}
