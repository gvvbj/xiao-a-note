export const EXTERNAL_OVERWRITE_GUARD_SERVICE_ID = 'editor.external-overwrite-guard';

export type ExternalOverwriteStatus =
    | 'overwrite_confirmed'
    | 'kept';

export type ExternalOverwriteDialogKind =
    | 'resolution'
    | 'save_protection'
    | null;

export interface IExternalOverwriteState {
    path: string;
    status: ExternalOverwriteStatus;
    dialogOpen: boolean;
    dialogKind: ExternalOverwriteDialogKind;
    lastDetectedAt: number;
    sourceEventType?: string;
}

export interface IExternalOverwriteGuardService {
    hasBlockingConflict(path: string): boolean;
    isDialogOpen(path: string): boolean;
    keepConflict(path: string): void;
    clearConflict(path: string): void;
    getConflict(path: string): IExternalOverwriteState | null;
    reloadLatestFromDisk(path: string): Promise<void>;
    closeConflictedTab(path: string): void;
    promptSaveProtection(path: string, onConfirmOverwrite: () => Promise<boolean>): void;
}
