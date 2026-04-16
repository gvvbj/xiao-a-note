/**
 * AI Task Interfaces
 *
 * 第五阶段将基于此接口实现主进程统一托管的长任务协议。
 */

export type AITaskStatus =
    | 'queued'
    | 'running'
    | 'streaming'
    | 'completed'
    | 'failed'
    | 'cancelled';

export interface IAITaskRequest {
    kind: 'chat' | 'plan' | 'edit' | 'workspace-change';
    payload: unknown;
    pluginId?: string;
}

export interface IAITaskError {
    code: string;
    message: string;
}

export interface IAITaskEvent {
    taskId: string;
    status: AITaskStatus;
    chunk?: string;
    result?: unknown;
    error?: IAITaskError;
}

export interface IAITaskService {
    start(request: IAITaskRequest): Promise<{ taskId: string }>;
    cancel(taskId: string): Promise<void>;
    subscribe(taskId: string, listener: (event: IAITaskEvent) => void): () => void;
}
