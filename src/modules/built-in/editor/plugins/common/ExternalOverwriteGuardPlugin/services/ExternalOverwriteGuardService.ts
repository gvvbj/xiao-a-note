import { Kernel } from '@/kernel/core/Kernel';
import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import type { IEditorService } from '@/kernel/interfaces/IEditorService';
import type { IFileSystem } from '@/kernel/interfaces/IFileSystem';
import type { ITabService } from '@/kernel/interfaces/ITabService';
import {
    IExternalOverwriteGuardService,
    IExternalOverwriteState,
    ILifecycleService,
} from '@/modules/interfaces';
import { normalizeMarkdown } from '@/shared/utils/ContentUtils';
import { normalizePath } from '@/shared/utils/path';
import { EDITOR_CONSTANTS } from '../../../../constants/EditorConstants';
import {
    EXTERNAL_OVERWRITE_DIALOG_KIND,
    EXTERNAL_OVERWRITE_DIALOG_TEXT,
} from '../constants/ExternalOverwriteGuardConstants';
import { FILE_CHANGE_CLASSIFICATION_EVENTS } from '../../FileChangeClassificationPlugin/constants/FileChangeClassificationEvents';

interface IExternalChangeCandidatePayload {
    path: string;
    sourceEventType?: string;
    detectedAt: number;
}

export class ExternalOverwriteGuardService implements IExternalOverwriteGuardService {
    private readonly conflicts = new Map<string, IExternalOverwriteState>();
    private readonly cleanupHandlers: Array<() => void> = [];

    constructor(private readonly kernel: Kernel) {}

    start(): void {
        const handleOverwriteCandidate = (payload: IExternalChangeCandidatePayload) => {
            void this.handleOverwriteCandidate(payload);
        };
        const handleFileOverwritten = (path: string) => {
            this.handleInternalOverwrite(path);
        };
        const handleFileMoved = (payload: { oldPath: string; newPath: string }) => {
            this.clearConflict(payload.oldPath);
            this.clearConflict(payload.newPath);
        };
        const handleFileSaved = (path: string) => {
            this.clearConflict(path);
        };
        const handleTabsChanged = () => {
            this.clearClosedTabConflicts();
        };

        this.kernel.on(FILE_CHANGE_CLASSIFICATION_EVENTS.EXTERNAL_OVERWRITE_CANDIDATE, handleOverwriteCandidate);
        this.kernel.on(CoreEvents.FILE_OVERWRITTEN, handleFileOverwritten);
        this.kernel.on(CoreEvents.FILE_MOVED, handleFileMoved);
        this.kernel.on(CoreEvents.FILE_SAVED, handleFileSaved);
        this.tabService?.on(CoreEvents.TABS_CHANGED, handleTabsChanged);

        this.cleanupHandlers.push(() => {
            this.kernel.off(FILE_CHANGE_CLASSIFICATION_EVENTS.EXTERNAL_OVERWRITE_CANDIDATE, handleOverwriteCandidate);
            this.kernel.off(CoreEvents.FILE_OVERWRITTEN, handleFileOverwritten);
            this.kernel.off(CoreEvents.FILE_MOVED, handleFileMoved);
            this.kernel.off(CoreEvents.FILE_SAVED, handleFileSaved);
            this.tabService?.off(CoreEvents.TABS_CHANGED, handleTabsChanged);
        });
    }

    dispose(): void {
        this.cleanupHandlers.splice(0).forEach(dispose => dispose());
    }

    hasBlockingConflict(path: string): boolean {
        const conflict = this.conflicts.get(normalizePath(path));
        return !!conflict && (conflict.status === 'overwrite_confirmed' || conflict.status === 'kept');
    }

    isDialogOpen(path: string): boolean {
        return this.conflicts.get(normalizePath(path))?.dialogOpen ?? false;
    }

    keepConflict(path: string): void {
        const normalizedPath = normalizePath(path);
        const conflict = this.conflicts.get(normalizedPath);
        if (!conflict) return;

        this.conflicts.set(normalizedPath, {
            ...conflict,
            status: 'kept',
            dialogOpen: false,
            dialogKind: null,
        });
    }

    clearConflict(path: string): void {
        this.conflicts.delete(normalizePath(path));
    }

    getConflict(path: string): IExternalOverwriteState | null {
        return this.conflicts.get(normalizePath(path)) ?? null;
    }

    async reloadLatestFromDisk(path: string): Promise<void> {
        const normalizedPath = normalizePath(path);
        this.setDialogState(normalizedPath, false, null);
        this.tabService?.clearTabContent(normalizedPath);
        await this.lifecycleService?.switchFile(normalizedPath, {
            currentContent: '',
            forceReload: true,
        });
        this.clearConflict(normalizedPath);
    }

    closeConflictedTab(path: string): void {
        const normalizedPath = normalizePath(path);
        this.setDialogState(normalizedPath, false, null);
        this.clearConflict(normalizedPath);
        this.tabService?.clearTabContent(normalizedPath);
        this.tabService?.closeTab(normalizedPath);
    }

    promptSaveProtection(path: string, onConfirmOverwrite: () => Promise<boolean>): void {
        const normalizedPath = normalizePath(path);
        const conflict = this.conflicts.get(normalizedPath);
        if (!conflict || conflict.dialogOpen) {
            return;
        }

        this.setDialogState(normalizedPath, true, EXTERNAL_OVERWRITE_DIALOG_KIND.SAVE_PROTECTION);
        const fileName = normalizedPath.split('/').pop() || normalizedPath;

        this.kernel.emit(CoreEvents.APP_SHOW_SAVE_CONFIRM_DIALOG, {
            title: EXTERNAL_OVERWRITE_DIALOG_TEXT.SAVE_PROTECTION.title,
            description: EXTERNAL_OVERWRITE_DIALOG_TEXT.SAVE_PROTECTION.description(fileName),
            saveText: EXTERNAL_OVERWRITE_DIALOG_TEXT.SAVE_PROTECTION.saveText,
            discardText: EXTERNAL_OVERWRITE_DIALOG_TEXT.SAVE_PROTECTION.discardText,
            cancelText: EXTERNAL_OVERWRITE_DIALOG_TEXT.SAVE_PROTECTION.cancelText,
            onSave: async () => {
                this.setDialogState(normalizedPath, false, null);
                const saved = await onConfirmOverwrite();
                if (!saved) {
                    this.keepConflict(normalizedPath);
                }
            },
            onDontSave: async () => {
                await this.reloadLatestFromDisk(normalizedPath);
            },
            onCancel: () => {
                this.keepConflict(normalizedPath);
            },
        });
    }

    private async handleOverwriteCandidate(payload: IExternalChangeCandidatePayload): Promise<void> {
        const normalizedPath = normalizePath(payload.path);
        if (!this.isCurrentFile(normalizedPath)) {
            return;
        }

        const tab = this.tabService?.getTab(normalizedPath);
        if (!tab || typeof tab.content !== 'string') {
            return;
        }

        const diskRead = await this.fileSystem?.readFile(normalizedPath);
        if (!diskRead?.success || typeof diskRead.content !== 'string') {
            return;
        }

        if (normalizeMarkdown(tab.content) === normalizeMarkdown(diskRead.content)) {
            this.clearConflict(normalizedPath);
            return;
        }

        this.confirmOverwrite(normalizedPath, payload);
        this.promptResolutionIfNeeded(normalizedPath);
    }

    private confirmOverwrite(path: string, payload: IExternalChangeCandidatePayload): void {
        const normalizedPath = normalizePath(path);
        const existing = this.conflicts.get(normalizedPath);

        if (existing?.status === 'kept') {
            this.conflicts.set(normalizedPath, {
                ...existing,
                lastDetectedAt: payload.detectedAt,
                sourceEventType: payload.sourceEventType,
            });
            return;
        }

        this.conflicts.set(normalizedPath, {
            path: normalizedPath,
            status: 'overwrite_confirmed',
            dialogOpen: existing?.dialogOpen ?? false,
            dialogKind: existing?.dialogKind ?? null,
            lastDetectedAt: payload.detectedAt,
            sourceEventType: payload.sourceEventType,
        });
    }

    private promptResolutionIfNeeded(path: string): void {
        const normalizedPath = normalizePath(path);
        const conflict = this.conflicts.get(normalizedPath);
        if (!conflict || conflict.status !== 'overwrite_confirmed' || conflict.dialogOpen) {
            return;
        }

        this.setDialogState(normalizedPath, true, EXTERNAL_OVERWRITE_DIALOG_KIND.RESOLUTION);
        const fileName = normalizedPath.split('/').pop() || normalizedPath;

        this.kernel.emit(CoreEvents.APP_SHOW_SAVE_CONFIRM_DIALOG, {
            title: EXTERNAL_OVERWRITE_DIALOG_TEXT.RESOLUTION.title,
            description: EXTERNAL_OVERWRITE_DIALOG_TEXT.RESOLUTION.description(fileName),
            saveText: EXTERNAL_OVERWRITE_DIALOG_TEXT.RESOLUTION.saveText,
            discardText: EXTERNAL_OVERWRITE_DIALOG_TEXT.RESOLUTION.discardText,
            cancelText: EXTERNAL_OVERWRITE_DIALOG_TEXT.RESOLUTION.cancelText,
            onSave: async () => {
                await this.reloadLatestFromDisk(normalizedPath);
            },
            onDontSave: () => {
                this.closeConflictedTab(normalizedPath);
            },
            onCancel: () => {
                this.keepConflict(normalizedPath);
            },
        });
    }

    private setDialogState(path: string, open: boolean, dialogKind: IExternalOverwriteState['dialogKind']): void {
        const normalizedPath = normalizePath(path);
        const conflict = this.conflicts.get(normalizedPath);
        if (!conflict) {
            return;
        }

        this.conflicts.set(normalizedPath, {
            ...conflict,
            dialogOpen: open,
            dialogKind: open ? dialogKind : null,
        });
    }

    private clearClosedTabConflicts(): void {
        const openPaths = new Set((this.tabService?.getTabs() ?? []).map(tab => normalizePath(tab.path)));

        Array.from(this.conflicts.keys()).forEach(path => {
            if (!openPaths.has(path)) {
                this.conflicts.delete(path);
            }
        });
    }

    private isCurrentFile(path: string): boolean {
        const normalizedPath = normalizePath(path);
        const currentFileId = this.editorService?.getState().currentFileId ?? '';
        const activeTabId = this.tabService?.getActiveTabId() ?? '';

        return normalizePath(currentFileId) === normalizedPath || normalizePath(activeTabId) === normalizedPath;
    }

    private handleInternalOverwrite(path: string): void {
        const normalizedPath = normalizePath(path);
        const overwrittenTab = this.tabService?.getTabs().find(
            (tab) => normalizePath(tab.path) === normalizedPath,
        );

        if (!overwrittenTab) {
            return;
        }

        this.clearConflict(normalizedPath);
        this.tabService?.clearTabContent(overwrittenTab.id);
        this.tabService?.closeTab(overwrittenTab.id);
    }

    private get fileSystem(): IFileSystem | undefined {
        return this.kernel.getService<IFileSystem>(ServiceId.FILE_SYSTEM, false);
    }

    private get editorService(): IEditorService | undefined {
        return this.kernel.getService<IEditorService>(ServiceId.EDITOR, false);
    }

    private get tabService(): ITabService | undefined {
        return this.kernel.getService<ITabService>(ServiceId.TAB, false);
    }

    private get lifecycleService(): ILifecycleService | undefined {
        return this.kernel.getService<ILifecycleService>(EDITOR_CONSTANTS.SERVICE_NAMES.LIFECYCLE, false);
    }
}
