/**
 * UI Action Interfaces
 *
 * 第四阶段将基于此接口建立 AI 的界面动作总线。
 */

export interface IUIActionDefinition<T = unknown> {
    id: string;
    title: string;
    run(payload?: T): Promise<void> | void;
    isEnabled?: () => boolean;
}

export interface IUIActionExecuteResult {
    ok: boolean;
    reason?: string;
}

export interface IUIActionService {
    registerAction<T = unknown>(def: IUIActionDefinition<T>): () => void;
    execute<T = unknown>(id: string, payload?: T): Promise<IUIActionExecuteResult>;
    has(id: string): boolean;
    list(): IUIActionDefinition[];
}
