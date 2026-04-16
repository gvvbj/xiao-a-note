import type { IAIAssistantProviderRuntime } from '../../core/security/AIProviderVault';
import {
    buildRemoteMessages,
    extractModelTextContent,
    type AITaskKind,
    type IAIChatPayload,
} from './AIMessagePromptPolicy';

export interface IAIRemoteTaskResponse {
    answer: string;
    reasoning?: string;
}

export interface IAIRemoteTaskClient {
    request(
        runtime: IAIAssistantProviderRuntime,
        kind: AITaskKind,
        payload: IAIChatPayload,
        signal: AbortSignal
    ): Promise<IAIRemoteTaskResponse>;
}

type AIFetcher = typeof fetch;

function ensureResponseOk(response: Response, body: string, fallbackMessage: string): void {
    if (!response.ok) {
        throw new Error(`${fallbackMessage}：${response.status} ${body.slice(0, 180)}`);
    }
}

function buildFallbackAnswer(answer: string): IAIRemoteTaskResponse {
    return {
        answer: answer || '模型未返回可解析内容。',
    };
}

function parseOpenAICompatibleResponse(body: string): IAIRemoteTaskResponse {
    const parsed = JSON.parse(body) as {
        choices?: Array<{
            message?: {
                content?: unknown;
                reasoning_content?: unknown;
            };
        }>;
    };
    const choice = parsed.choices?.[0]?.message;
    const answer = extractModelTextContent(choice?.content).trim();
    const reasoning = extractModelTextContent(choice?.reasoning_content).trim();

    return {
        answer: answer || '模型未返回可解析内容。',
        reasoning: reasoning || undefined,
    };
}

function parseOllamaResponse(body: string): IAIRemoteTaskResponse {
    const parsed = JSON.parse(body) as {
        message?: {
            content?: unknown;
        };
    };
    const answer = extractModelTextContent(parsed.message?.content).trim();
    return buildFallbackAnswer(answer);
}

export class AIProviderClient implements IAIRemoteTaskClient {
    constructor(private readonly fetcher: AIFetcher = fetch) {}

    async request(
        runtime: IAIAssistantProviderRuntime,
        kind: AITaskKind,
        payload: IAIChatPayload,
        signal: AbortSignal
    ): Promise<IAIRemoteTaskResponse> {
        if (runtime.provider.kind === 'ollama') {
            return this.requestOllama(runtime, kind, payload, signal);
        }

        return this.requestOpenAICompatible(runtime, kind, payload, signal);
    }

    private async requestOpenAICompatible(
        runtime: IAIAssistantProviderRuntime,
        kind: AITaskKind,
        payload: IAIChatPayload,
        signal: AbortSignal
    ): Promise<IAIRemoteTaskResponse> {
        const response = await this.fetcher(`${runtime.provider.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${runtime.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: runtime.modelId,
                messages: buildRemoteMessages(kind, payload),
                stream: false,
            }),
            signal,
        });
        const body = await response.text();
        ensureResponseOk(response, body, '模型接口调用失败');
        return parseOpenAICompatibleResponse(body);
    }

    private async requestOllama(
        runtime: IAIAssistantProviderRuntime,
        kind: AITaskKind,
        payload: IAIChatPayload,
        signal: AbortSignal
    ): Promise<IAIRemoteTaskResponse> {
        const response = await this.fetcher(`${runtime.provider.baseUrl}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: runtime.modelId,
                messages: buildRemoteMessages(kind, payload),
                stream: false,
            }),
            signal,
        });
        const body = await response.text();
        ensureResponseOk(response, body, 'Ollama 调用失败');
        return parseOllamaResponse(body);
    }
}

export {
    parseOllamaResponse,
    parseOpenAICompatibleResponse,
};
