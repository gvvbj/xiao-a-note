import { Kernel } from '@/kernel/core/Kernel';
import { CoreEvents } from '@/kernel/core/Events';
import {
    IFileChangeClassificationService,
    IFileWatchChangeClassification,
    IRawFileWatchChange,
} from '@/modules/interfaces';
import { normalizePath } from '@/shared/utils/path';
import { EDITOR_CONSTANTS } from '../../../../constants/EditorConstants';
import {
    FILE_CHANGE_CLASSIFICATION_EVENTS,
    FILE_CHANGE_CLASSIFICATION_WATCH_EVENT,
} from '../constants/FileChangeClassificationEvents';

export class FileChangeClassificationService implements IFileChangeClassificationService {
    private readonly internalWrites = new Map<string, number>();
    private readonly transientPathIgnores = new Map<string, number>();
    private readonly cleanupHandlers: Array<() => void> = [];

    constructor(private readonly kernel: Kernel) {}

    start(): void {
        const handleFileMoved = (payload: { oldPath: string; newPath: string }) => {
            this.markPathTransition(payload.oldPath, payload.newPath);
        };

        const handleFileOverwritten = (path: string) => {
            this.markTransientIgnore(path);
        };

        this.kernel.on(CoreEvents.FILE_MOVED, handleFileMoved);
        this.kernel.on(CoreEvents.FILE_OVERWRITTEN, handleFileOverwritten);

        this.cleanupHandlers.push(() => {
            this.kernel.off(CoreEvents.FILE_MOVED, handleFileMoved);
            this.kernel.off(CoreEvents.FILE_OVERWRITTEN, handleFileOverwritten);
        });
    }

    dispose(): void {
        this.cleanupHandlers.splice(0).forEach(dispose => dispose());
    }

    markInternalWrite(path: string): void {
        const normalizedPath = normalizePath(path);
        this.internalWrites.set(normalizedPath, Date.now() + EDITOR_CONSTANTS.INTERNAL_WRITE_IGNORE_MS);
    }

    markPathTransition(oldPath: string, newPath: string): void {
        this.markTransientIgnore(oldPath);
        this.markTransientIgnore(newPath);
    }

    shouldIgnoreFsChange(path: string): boolean {
        const normalizedPath = normalizePath(path);
        return this.isWithinWindow(this.internalWrites, normalizedPath) || this.isWithinWindow(this.transientPathIgnores, normalizedPath);
    }

    consumeWatchChange(change: IRawFileWatchChange): IFileWatchChangeClassification | null {
        return this.consumeWatchChanges([change])[0] ?? null;
    }

    consumeWatchChanges(changes: IRawFileWatchChange[]): IFileWatchChangeClassification[] {
        if (!changes.length) {
            return [];
        }

        const groupedChanges = new Map<string, IRawFileWatchChange[]>();
        for (const change of changes) {
            const normalizedPath = normalizePath(change.changedPath);
            const bucket = groupedChanges.get(normalizedPath) ?? [];
            bucket.push({
                ...change,
                changedPath: normalizedPath,
            });
            groupedChanges.set(normalizedPath, bucket);
        }

        const detectedAt = Date.now();
        const classifications: IFileWatchChangeClassification[] = [];
        for (const [normalizedPath, pathChanges] of groupedChanges.entries()) {
            classifications.push(this.classifyObservedChanges(normalizedPath, pathChanges, detectedAt));
        }

        classifications.forEach((classification) => this.emitClassification(classification));
        return classifications;
    }

    private classifyObservedChanges(
        normalizedPath: string,
        changes: IRawFileWatchChange[],
        detectedAt: number,
    ): IFileWatchChangeClassification {
        const sourceEventTypes = new Set(
            changes
                .map(change => change.eventType?.toLowerCase())
                .filter((eventType): eventType is string => !!eventType),
        );
        const sourceEventType = sourceEventTypes.has(FILE_CHANGE_CLASSIFICATION_WATCH_EVENT.RENAME)
            ? FILE_CHANGE_CLASSIFICATION_WATCH_EVENT.RENAME
            : sourceEventTypes.has(FILE_CHANGE_CLASSIFICATION_WATCH_EVENT.CHANGE)
                ? FILE_CHANGE_CLASSIFICATION_WATCH_EVENT.CHANGE
                : changes.at(-1)?.eventType?.toLowerCase();
        const exists = changes.some(change => change.exists);

        if (!normalizedPath) {
            return {
                path: normalizedPath,
                kind: 'ignored_unknown',
                sourceEventType,
                detectedAt,
            };
        }

        if (this.shouldIgnoreFsChange(normalizedPath)) {
            return {
                path: normalizedPath,
                kind: 'ignored_internal_write',
                sourceEventType,
                detectedAt,
            };
        }

        if (!exists) {
            return {
                path: normalizedPath,
                kind: 'ignored_missing',
                sourceEventType,
                detectedAt,
            };
        }

        const classification = this.classifyObservedChange(normalizedPath, sourceEventType, detectedAt);
        if (!classification) {
            return {
                path: normalizedPath,
                kind: 'ignored_unknown',
                sourceEventType,
                detectedAt,
            };
        }

        return classification;
    }

    private classifyObservedChange(
        path: string,
        sourceEventType: string | undefined,
        detectedAt: number,
    ): IFileWatchChangeClassification | null {
        if (sourceEventType === FILE_CHANGE_CLASSIFICATION_WATCH_EVENT.RENAME) {
            return {
                path,
                kind: 'external_overwrite_candidate',
                sourceEventType,
                detectedAt,
            };
        }

        if (sourceEventType === FILE_CHANGE_CLASSIFICATION_WATCH_EVENT.CHANGE) {
            return {
                path,
                kind: 'external_change_observed',
                sourceEventType,
                detectedAt,
            };
        }

        return null;
    }

    private emitClassification(classification: IFileWatchChangeClassification): void {
        if (classification.kind === 'external_overwrite_candidate') {
            this.kernel.emit(FILE_CHANGE_CLASSIFICATION_EVENTS.EXTERNAL_OVERWRITE_CANDIDATE, classification);
            return;
        }

        if (classification.kind === 'external_change_observed') {
            this.kernel.emit(FILE_CHANGE_CLASSIFICATION_EVENTS.EXTERNAL_CHANGE_OBSERVED, classification);
        }
    }

    private markTransientIgnore(path: string): void {
        const normalizedPath = normalizePath(path);
        this.transientPathIgnores.set(normalizedPath, Date.now() + EDITOR_CONSTANTS.INTERNAL_WRITE_IGNORE_MS);
    }

    private isWithinWindow(store: Map<string, number>, path: string): boolean {
        const expiresAt = store.get(path);
        if (!expiresAt) return false;

        if (Date.now() > expiresAt) {
            store.delete(path);
            return false;
        }

        return true;
    }
}
