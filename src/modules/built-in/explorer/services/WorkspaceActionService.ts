import { CoreEvents } from '@/kernel/core/Events';
import { Kernel } from '@/kernel/core/Kernel';
import { ServiceId } from '@/kernel/core/ServiceId';
import type {
    IEditorService,
    IFileSystem,
    ITabService,
    IWorkspaceActionService,
    IWorkspaceChange,
    IWorkspaceChangePlan,
} from '@/kernel/interfaces';
import { WorkspaceService } from '@/kernel/services/WorkspaceService';
import { EDITOR_CONSTANTS } from '@/modules/built-in/editor/constants/EditorConstants';
import { EditorEvents } from '@/modules/built-in/editor/constants/EditorEvents';
import type { ILifecycleService } from '@/modules/interfaces';
import { normalizePath } from '@/shared/utils/path';

interface IScrollStatePayload {
    cursorPosition: number;
    scrollTop: number;
    topLineNumber?: number;
    topOffset?: number;
}

export class WorkspaceActionService implements IWorkspaceActionService {
    private readonly stagedPlans = new Map<string, IWorkspaceChangePlan>();
    private sequence = 0;

    constructor(private readonly kernel: Kernel) {}

    getProjectRoot(): string | null {
        return this.getWorkspaceService()?.getProjectRoot() ?? null;
    }

    async readDirectoryTree(path?: string): Promise<any[]> {
        const targetPath = path ?? this.requireProjectRoot();
        this.assertWithinProjectRoot(targetPath);
        return this.getFileSystem().readDirectoryTree(targetPath);
    }

    async readFile(path: string): Promise<string> {
        this.assertWithinProjectRoot(path);
        const result = await this.getFileSystem().readFile(path);
        if (!result.success) {
            throw new Error(result.error ?? `Failed to read workspace file: ${path}`);
        }

        return result.content ?? '';
    }

    async openFile(path: string): Promise<void> {
        this.assertWithinProjectRoot(path);
        const exists = await this.getFileSystem().checkExists(path);
        if (!exists) {
            throw new Error(`Workspace file does not exist: ${path}`);
        }

        this.kernel.emit(CoreEvents.OPEN_FILE, path);
    }

    async stageChangePlan(changes: IWorkspaceChange[]): Promise<IWorkspaceChangePlan> {
        const normalizedChanges = changes.map((change) => this.normalizeChange(change));
        normalizedChanges.forEach((change) => this.validateChange(change));

        const plan: IWorkspaceChangePlan = {
            id: this.generatePlanId(),
            changes: normalizedChanges.map((change) => ({ ...change })),
            createdAt: Date.now(),
        };

        this.stagedPlans.set(plan.id, plan);
        return this.clonePlan(plan);
    }

    async previewChangePlan(planId: string): Promise<IWorkspaceChangePlan> {
        return this.clonePlan(this.requirePlan(planId));
    }

    async applyChangePlan(planId: string): Promise<void> {
        const plan = this.requirePlan(planId);
        plan.changes.forEach((change) => this.validateChange(change));
        this.assertActiveDirtyFileNotAffected(plan.changes);

        for (const change of plan.changes) {
            await this.applySingleChange(change);
        }

        this.syncOpenTabsAndEditor(plan.changes);
        this.stagedPlans.delete(planId);
    }

    async discardChangePlan(planId: string): Promise<void> {
        if (!this.stagedPlans.delete(planId)) {
            throw new Error(`Workspace change plan not found: ${planId}`);
        }
    }

    private async applySingleChange(change: IWorkspaceChange): Promise<void> {
        const fileSystem = this.getFileSystem();
        switch (change.kind) {
            case 'create': {
                if (typeof change.content === 'string') {
                    const result = await fileSystem.createFile(change.path, change.content);
                    if (!result.success) {
                        throw new Error(result.error ?? `Failed to create workspace file: ${change.path}`);
                    }
                    return;
                }

                const result = await fileSystem.createDirectory(change.path);
                if (!result.success) {
                    throw new Error(result.error ?? `Failed to create workspace directory: ${change.path}`);
                }
                return;
            }
            case 'update': {
                if (typeof change.content !== 'string') {
                    throw new Error(`Workspace update change requires content: ${change.path}`);
                }
                const result = await fileSystem.saveFile(change.path, change.content);
                if (!result.success) {
                    throw new Error(result.error ?? `Failed to update workspace file: ${change.path}`);
                }
                return;
            }
            case 'delete': {
                const result = await fileSystem.delete(change.path, false);
                if (!result.success) {
                    throw new Error(result.error ?? `Failed to delete workspace path: ${change.path}`);
                }
                return;
            }
            case 'rename': {
                if (!change.newPath) {
                    throw new Error(`Workspace rename change requires newPath: ${change.path}`);
                }
                const result = await fileSystem.rename(change.path, change.newPath);
                if (!result.success) {
                    throw new Error(result.error ?? `Failed to rename workspace path: ${change.path}`);
                }
                this.kernel.emit(CoreEvents.FILE_MOVED, {
                    oldPath: change.path,
                    newPath: change.newPath,
                });
                return;
            }
            default:
                throw new Error(`Unsupported workspace change kind: ${(change as IWorkspaceChange).kind}`);
        }
    }

    private syncOpenTabsAndEditor(changes: IWorkspaceChange[]): void {
        const tabService = this.getTabService();
        const lifecycleService = this.getLifecycleService();
        const activePath = lifecycleService?.getState().activePath ?? null;
        const affectedTabs = new Set<string>();

        for (const change of changes) {
            if (change.kind === 'create' || change.kind === 'update') {
                const tab = tabService?.getTab(change.path);
                if (tab && typeof change.content === 'string') {
                    tabService?.updateTabContent(change.path, change.content, false);
                    affectedTabs.add(change.path);
                }

                if (activePath && normalizePath(activePath) === normalizePath(change.path) && typeof change.content === 'string') {
                    this.refreshActiveDocument(change.path, change.content, false);
                }
                continue;
            }

            if (change.kind === 'rename' && change.newPath) {
                const renamedTab = tabService?.getTab(change.newPath);
                if (renamedTab) {
                    affectedTabs.add(change.newPath);
                }

                if (activePath && normalizePath(activePath) === normalizePath(change.newPath)) {
                    const renamedContent = tabService?.getTabContent(change.newPath);
                    if (typeof renamedContent === 'string') {
                        this.refreshActiveDocument(change.newPath, renamedContent, false);
                    }
                }
                continue;
            }

            if (change.kind === 'delete') {
                this.kernel.emit(CoreEvents.CHECK_TABS_EXISTENCE);
            }
        }

        for (const path of affectedTabs) {
            tabService?.setTabDirty(path, false);
        }
    }

    private refreshActiveDocument(path: string, content: string, isFromCache: boolean): void {
        const tab = this.getTabService()?.getTab(path);
        const scrollState: IScrollStatePayload | undefined =
            tab?.cursorPosition !== undefined || tab?.scrollTop !== undefined
                ? {
                    cursorPosition: tab?.cursorPosition ?? 0,
                    scrollTop: tab?.scrollTop ?? 0,
                    topLineNumber: tab?.topLineNumber,
                    topOffset: tab?.topOffset,
                }
                : undefined;

        this.getLifecycleService()?.setUnsaved(false);
        this.kernel.emit(EditorEvents.LIFECYCLE_FILE_LOADED, {
            path,
            content,
            isUnsaved: false,
            isFromCache,
            scrollState,
        });
        this.kernel.emit(EditorEvents.EDITOR_STATE_CHANGED, {
            path,
            isUnsaved: false,
        });
        this.kernel.emit(CoreEvents.DOCUMENT_CHANGED, {
            content,
            path,
            isInitial: false,
        });
    }

    private assertActiveDirtyFileNotAffected(changes: IWorkspaceChange[]): void {
        const editorState = this.getEditorService()?.getState();
        const currentFileId = editorState?.currentFileId ?? null;
        if (!currentFileId || !editorState?.isUnsaved) {
            return;
        }

        const normalizedCurrent = normalizePath(currentFileId);
        const touchesActiveFile = changes.some((change) => {
            const normalizedPath = normalizePath(change.path);
            if (normalizedPath === normalizedCurrent) {
                return true;
            }

            return change.kind === 'rename' && change.newPath
                ? normalizePath(change.newPath) === normalizedCurrent
                : false;
        });

        if (touchesActiveFile) {
            throw new Error('Active dirty document cannot be modified by a workspace change plan.');
        }
    }

    private validateChange(change: IWorkspaceChange): void {
        this.assertWithinProjectRoot(change.path);

        switch (change.kind) {
            case 'create':
                if (change.newPath) {
                    throw new Error(`Workspace create change must not contain newPath: ${change.path}`);
                }
                return;
            case 'update':
                if (typeof change.content !== 'string') {
                    throw new Error(`Workspace update change requires content: ${change.path}`);
                }
                if (change.newPath) {
                    throw new Error(`Workspace update change must not contain newPath: ${change.path}`);
                }
                return;
            case 'delete':
                if (change.content !== undefined || change.newPath) {
                    throw new Error(`Workspace delete change must not contain content or newPath: ${change.path}`);
                }
                return;
            case 'rename':
                if (!change.newPath) {
                    throw new Error(`Workspace rename change requires newPath: ${change.path}`);
                }
                this.assertWithinProjectRoot(change.newPath);
                if (change.content !== undefined) {
                    throw new Error(`Workspace rename change must not contain content: ${change.path}`);
                }
                return;
            default:
                throw new Error(`Unsupported workspace change kind: ${(change as IWorkspaceChange).kind}`);
        }
    }

    private normalizeChange(change: IWorkspaceChange): IWorkspaceChange {
        return {
            ...change,
            path: change.path,
            newPath: change.newPath,
        };
    }

    private assertWithinProjectRoot(targetPath: string): void {
        const projectRoot = this.requireProjectRoot();
        const normalizedRoot = normalizePath(projectRoot);
        const normalizedTarget = normalizePath(targetPath);
        const prefix = normalizedRoot.endsWith('/') ? normalizedRoot : `${normalizedRoot}/`;

        if (normalizedTarget !== normalizedRoot && !normalizedTarget.startsWith(prefix)) {
            throw new Error(`Workspace path is outside project root: ${targetPath}`);
        }
    }

    private requireProjectRoot(): string {
        const projectRoot = this.getProjectRoot();
        if (!projectRoot) {
            throw new Error('No workspace project root is available.');
        }

        return projectRoot;
    }

    private requirePlan(planId: string): IWorkspaceChangePlan {
        const plan = this.stagedPlans.get(planId);
        if (!plan) {
            throw new Error(`Workspace change plan not found: ${planId}`);
        }

        return plan;
    }

    private clonePlan(plan: IWorkspaceChangePlan): IWorkspaceChangePlan {
        return {
            ...plan,
            changes: plan.changes.map((change) => ({ ...change })),
        };
    }

    private generatePlanId(): string {
        if (typeof globalThis.crypto?.randomUUID === 'function') {
            return globalThis.crypto.randomUUID();
        }

        this.sequence += 1;
        return `workspace-plan-${Date.now()}-${this.sequence}`;
    }

    private getWorkspaceService(): WorkspaceService | null {
        return this.kernel.getService<WorkspaceService>(ServiceId.WORKSPACE, false) ?? null;
    }

    private getFileSystem(): IFileSystem {
        return this.kernel.getService<IFileSystem>(ServiceId.FILE_SYSTEM);
    }

    private getTabService(): ITabService | null {
        return this.kernel.getService<ITabService>(ServiceId.TAB, false) ?? null;
    }

    private getEditorService(): IEditorService | null {
        return this.kernel.getService<IEditorService>(ServiceId.EDITOR, false) ?? null;
    }

    private getLifecycleService(): ILifecycleService | null {
        return this.kernel.getService<ILifecycleService>(EDITOR_CONSTANTS.SERVICE_NAMES.LIFECYCLE, false) ?? null;
    }
}
