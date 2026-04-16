import { ipcMain, type WebContents } from 'electron';
import { AI_CHANNELS } from '../constants/channels';
import { AIProviderVault, AIProviderVaultError } from '../core/security/AIProviderVault';
import { AIProviderClient, type IAIRemoteTaskResponse } from './ai/AIProviderClient';
import { mapAITaskResult } from './ai/AITaskResultMapper';
import { type AITaskKind, type IAIChatPayload } from './ai/AIMessagePromptPolicy';

type AITaskStatus = 'queued' | 'running' | 'streaming' | 'completed' | 'failed' | 'cancelled';

interface IAITaskRequestPayload {
    kind: AITaskKind;
    payload: unknown;
    pluginId?: string;
}

interface IAITaskEventPayload {
    taskId: string;
    status: AITaskStatus;
    chunk?: string;
    result?: unknown;
    error?: {
        code: string;
        message: string;
    };
}

interface IAITaskRecord {
    sender: WebContents;
    request: IAITaskRequestPayload;
    status: AITaskStatus;
    abortController: AbortController | null;
}

function chunkText(content: string, size: number): string[] {
    if (!content) {
        return [];
    }

    const chunks: string[] = [];
    for (let index = 0; index < content.length; index += size) {
        chunks.push(content.slice(index, index + size));
    }
    return chunks;
}

function isTaskPayload(value: unknown): value is IAIChatPayload {
    return typeof value === 'object' && value !== null;
}

function isAbortError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
        return false;
    }

    return Reflect.get(error, 'name') === 'AbortError';
}

export class AIHandler {
    private static instance: AIHandler | null = null;
    private static isRegistered = false;

    private readonly tasks = new Map<string, IAITaskRecord>();
    private readonly providerVault = AIProviderVault.getInstance();
    private readonly providerClient = new AIProviderClient();
    private sequence = 0;

    static initialize(): AIHandler {
        if (AIHandler.isRegistered) {
            return AIHandler.instance!;
        }

        AIHandler.instance = new AIHandler();
        AIHandler.isRegistered = true;
        return AIHandler.instance;
    }

    private constructor() {
        this.registerHandlers();
    }

    private registerHandlers(): void {
        ipcMain.handle(AI_CHANNELS.START_TASK, async (event, request: IAITaskRequestPayload) => {
            const taskId = this.createTaskId();
            const record: IAITaskRecord = {
                sender: event.sender,
                request,
                status: 'queued',
                abortController: null,
            };

            this.tasks.set(taskId, record);
            this.emitTaskEvent(record.sender, { taskId, status: 'queued' });
            record.status = 'running';
            this.emitTaskEvent(record.sender, { taskId, status: 'running' });
            this.startTask(taskId, record);

            return { taskId };
        });

        ipcMain.handle(AI_CHANNELS.CANCEL_TASK, async (_event, taskId: string) => {
            const record = this.tasks.get(taskId);
            if (!record) {
                return;
            }

            this.disposeTask(taskId, 'cancelled');
        });
    }

    private startTask(taskId: string, record: IAITaskRecord): void {
        const payload = isTaskPayload(record.request.payload) ? record.request.payload : {};
        const providerId = payload.providerId?.trim();
        if (!providerId) {
            this.emitFailure(taskId, record.sender, 'PROVIDER_ID_REQUIRED', '当前未配置可用模型，请先在 AI 设置中配置并选择供应商模型。');
            this.disposeTask(taskId);
            return;
        }

        const abortController = new AbortController();
        record.abortController = abortController;

        void this.executeRemoteTask(taskId, record, payload, providerId, abortController).catch((error) => {
            if (!this.tasks.has(taskId) || isAbortError(error)) {
                return;
            }

            if (error instanceof AIProviderVaultError) {
                this.emitFailure(taskId, record.sender, error.code, error.message);
                this.disposeTask(taskId);
                return;
            }

            this.emitFailure(
                taskId,
                record.sender,
                'REMOTE_TASK_FAILED',
                error instanceof Error ? error.message : '模型请求失败。'
            );
            this.disposeTask(taskId);
        });
    }

    private async executeRemoteTask(
        taskId: string,
        record: IAITaskRecord,
        payload: IAIChatPayload,
        providerId: string,
        abortController: AbortController
    ): Promise<void> {
        const runtime = await this.providerVault.getProviderRuntime(providerId, payload.modelId);
        const response = await this.providerClient.request(
            runtime,
            record.request.kind,
            payload,
            abortController.signal
        );

        const latest = this.tasks.get(taskId);
        if (!latest || latest.status === 'cancelled') {
            return;
        }

        this.emitStreamingResponse(taskId, record.sender, record.request.kind, payload, response);

        this.emitTaskEvent(record.sender, {
            taskId,
            status: 'completed',
            result: mapAITaskResult(record.request.kind, payload, response.answer, response.reasoning),
        });
        this.disposeTask(taskId);
    }

    private emitStreamingResponse(
        taskId: string,
        sender: WebContents,
        kind: AITaskKind,
        payload: IAIChatPayload,
        response: IAIRemoteTaskResponse
    ): void {
        const requestMode = payload.requestMode ?? (kind === 'edit'
            ? 'document-edit'
            : kind === 'workspace-change'
                ? 'workspace-change'
                : 'chat');

        if (requestMode === 'document-edit' || requestMode === 'workspace-change') {
            return;
        }

        if (payload.thinkingEnabled && response.reasoning) {
            for (const chunk of chunkText(response.reasoning, 24)) {
                this.emitTaskEvent(sender, {
                    taskId,
                    status: 'streaming',
                    chunk,
                    result: {
                        segment: 'thinking',
                    },
                });
            }
        }

        for (const chunk of chunkText(response.answer, 24)) {
            this.emitTaskEvent(sender, {
                taskId,
                status: 'streaming',
                chunk,
                result: {
                    segment: 'answer',
                },
            });
        }
    }

    private emitFailure(taskId: string, sender: WebContents, code: string, message: string): void {
        this.emitTaskEvent(sender, {
            taskId,
            status: 'failed',
            error: {
                code,
                message,
            },
        });
    }

    private disposeTask(taskId: string, terminalStatus?: 'cancelled'): void {
        const record = this.tasks.get(taskId);
        if (!record) {
            return;
        }

        record.abortController?.abort();
        record.abortController = null;

        if (terminalStatus === 'cancelled' && record.status !== 'completed' && record.status !== 'failed') {
            record.status = 'cancelled';
            this.emitTaskEvent(record.sender, {
                taskId,
                status: 'cancelled',
            });
        }

        this.tasks.delete(taskId);
    }

    private emitTaskEvent(sender: WebContents, payload: IAITaskEventPayload): void {
        if (sender.isDestroyed()) {
            return;
        }

        sender.send(AI_CHANNELS.TASK_EVENT, payload);
    }

    private createTaskId(): string {
        this.sequence += 1;
        return `ai-task-${Date.now()}-${this.sequence}`;
    }
}
