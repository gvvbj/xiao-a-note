/**
 * Workspace Action Interfaces
 *
 * 第二阶段将基于此接口落地 AI 的工作区只读与变更计划能力。
 */

export interface IWorkspaceFileRef {
    path: string;
    name: string;
    isDirectory: boolean;
}

export interface IWorkspaceChange {
    path: string;
    kind: 'create' | 'update' | 'delete' | 'rename';
    content?: string;
    newPath?: string;
}

export interface IWorkspaceChangePlan {
    id: string;
    changes: IWorkspaceChange[];
    createdAt: number;
}

export interface IWorkspaceActionService {
    getProjectRoot(): string | null;
    readDirectoryTree(path?: string): Promise<any[]>;
    readFile(path: string): Promise<string>;
    openFile(path: string): Promise<void>;
    stageChangePlan(changes: IWorkspaceChange[]): Promise<IWorkspaceChangePlan>;
    previewChangePlan(planId: string): Promise<IWorkspaceChangePlan>;
    applyChangePlan(planId: string): Promise<void>;
    discardChangePlan(planId: string): Promise<void>;
}

