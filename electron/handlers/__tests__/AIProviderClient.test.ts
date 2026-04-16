import { describe, expect, it, vi } from 'vitest';
import type { IAIAssistantProviderRuntime } from '../../core/security/AIProviderVault';
import { AIProviderClient } from '../ai/AIProviderClient';

function createRuntime(kind: 'openai-compatible' | 'ollama'): IAIAssistantProviderRuntime {
    return {
        provider: {
            id: 'provider-1',
            name: kind,
            kind,
            baseUrl: kind === 'ollama' ? 'http://127.0.0.1:11434' : 'https://api.example.com/v1',
            modelIds: ['model-a'],
            defaultModelId: 'model-a',
            enabled: true,
            createdAt: 1,
            updatedAt: 1,
        },
        modelId: 'model-a',
        apiKey: kind === 'ollama' ? null : 'secret-key',
    };
}

function createResponse(body: string, status = 200): Response {
    return new Response(body, {
        status,
        headers: {
            'Content-Type': 'application/json',
        },
    });
}

describe('AIProviderClient', () => {
    it('调用 OpenAI-compatible 时分离 reasoning 与 answer', async () => {
        const fetcher = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => createResponse(JSON.stringify({
            choices: [{
                message: {
                    reasoning_content: '先分析上下文',
                    content: '{"assistantMessage":"已更新当前文档。","documentArtifact":{"content":"hello"}}',
                },
            }],
        })));
        const client = new AIProviderClient(fetcher as typeof fetch);

        const result = await client.request(
            createRuntime('openai-compatible'),
            'edit',
            {
                prompt: '更新文件',
                systemPrompt: '你是文档编辑助手',
            },
            new AbortController().signal
        );

        expect(fetcher).toHaveBeenCalledTimes(1);
        const [url, init] = fetcher.mock.calls[0] as [string, RequestInit];
        expect(String(url)).toContain('/chat/completions');
        expect(init?.headers).toMatchObject({
            Authorization: 'Bearer secret-key',
            'Content-Type': 'application/json',
        });
        expect(result).toEqual({
            answer: '{"assistantMessage":"已更新当前文档。","documentArtifact":{"content":"hello"}}',
            reasoning: '先分析上下文',
        });
    });

    it('调用 Ollama 时不携带 Authorization 并返回 answer', async () => {
        const fetcher = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => createResponse(JSON.stringify({
            message: {
                content: '本地模型回复',
            },
        })));
        const client = new AIProviderClient(fetcher as typeof fetch);

        const result = await client.request(
            createRuntime('ollama'),
            'chat',
            {
                prompt: '你好',
            },
            new AbortController().signal
        );

        const [url, init] = fetcher.mock.calls[0] as [string, RequestInit];
        expect(String(url)).toContain('/api/chat');
        expect(init?.headers).toEqual({
            'Content-Type': 'application/json',
        });
        expect(result).toEqual({
            answer: '本地模型回复',
        });
    });

    it('provider 返回空内容时给出统一兜底 answer', async () => {
        const fetcher = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => createResponse(JSON.stringify({
            choices: [{
                message: {
                    content: '',
                },
            }],
        })));
        const client = new AIProviderClient(fetcher as typeof fetch);

        const result = await client.request(
            createRuntime('openai-compatible'),
            'chat',
            {
                prompt: '测试',
            },
            new AbortController().signal
        );

        expect(result).toEqual({
            answer: '模型未返回可解析内容。',
        });
    });
});
