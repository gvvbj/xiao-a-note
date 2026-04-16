import { ipcMain } from 'electron';
import { AI_CONFIG_CHANNELS } from '../constants/channels';
import {
    AIProviderVault,
    AIProviderVaultError,
    type AIAssistantProviderKind,
    type IAIAssistantProviderUpsertInput,
} from '../core/security/AIProviderVault';
import { MainLoggerHandler } from './MainLoggerHandler';

interface IAIProviderUpsertRequest {
    id?: string;
    name: string;
    kind: AIAssistantProviderKind;
    baseUrl: string;
    modelIds: string[];
    defaultModelId?: string;
    enabled?: boolean;
    apiKey?: string;
    clearSecret?: boolean;
}

interface IAIProviderConnectionTestRequest {
    providerId: string;
    modelId?: string;
}

interface IAIDiscoverOllamaModelsRequest {
    baseUrl: string;
}

export class AIConfigHandler {
    private static instance: AIConfigHandler | null = null;
    private static isRegistered = false;

    private readonly logger = MainLoggerHandler.initialize();
    private readonly ns = 'AIConfigHandler';
    private readonly vault = AIProviderVault.getInstance();

    static initialize(): AIConfigHandler {
        if (AIConfigHandler.isRegistered) {
            return AIConfigHandler.instance!;
        }

        AIConfigHandler.instance = new AIConfigHandler();
        AIConfigHandler.isRegistered = true;
        return AIConfigHandler.instance;
    }

    private constructor() {
        this.registerHandlers();
    }

    private registerHandlers(): void {
        ipcMain.handle(AI_CONFIG_CHANNELS.LIST_PROVIDERS, async () => {
            try {
                const providers = await this.vault.listProviders();
                return {
                    success: true,
                    providers,
                    ...this.vault.getSecurityStatus(),
                };
            } catch (error) {
                this.logger.error(this.ns, 'Failed to list AI providers.', error);
                return {
                    success: false,
                    providers: [],
                    ...this.vault.getSecurityStatus(),
                    error: '读取 AI 供应商配置失败。',
                };
            }
        });

        ipcMain.handle(AI_CONFIG_CHANNELS.UPSERT_PROVIDER, async (_event, request: IAIProviderUpsertRequest) => {
            try {
                const providerInput: IAIAssistantProviderUpsertInput = {
                    id: request.id,
                    name: request.name,
                    kind: request.kind,
                    baseUrl: request.baseUrl,
                    modelIds: request.modelIds,
                    defaultModelId: request.defaultModelId,
                    enabled: request.enabled,
                };
                const provider = await this.vault.upsertProvider(providerInput);

                if (request.clearSecret) {
                    await this.vault.clearProviderSecret(provider.id);
                } else if (typeof request.apiKey === 'string' && request.apiKey.trim().length > 0) {
                    await this.vault.setProviderSecret(provider.id, request.apiKey);
                }

                const providers = await this.vault.listProviders();
                return {
                    success: true,
                    providerId: provider.id,
                    providers,
                    ...this.vault.getSecurityStatus(),
                };
            } catch (error) {
                if (error instanceof AIProviderVaultError) {
                    return {
                        success: false,
                        code: error.code,
                        error: error.message,
                        ...this.vault.getSecurityStatus(),
                    };
                }

                this.logger.error(this.ns, 'Failed to upsert AI provider.', error);
                return {
                    success: false,
                    code: 'PROVIDER_UPSERT_FAILED',
                    error: '保存 AI 供应商配置失败。',
                    ...this.vault.getSecurityStatus(),
                };
            }
        });

        ipcMain.handle(AI_CONFIG_CHANNELS.DELETE_PROVIDER, async (_event, providerId: string) => {
            try {
                await this.vault.deleteProvider(providerId);
                const providers = await this.vault.listProviders();
                return {
                    success: true,
                    providers,
                    ...this.vault.getSecurityStatus(),
                };
            } catch (error) {
                this.logger.error(this.ns, 'Failed to delete AI provider.', error);
                return {
                    success: false,
                    error: '删除 AI 供应商失败。',
                    ...this.vault.getSecurityStatus(),
                };
            }
        });

        ipcMain.handle(AI_CONFIG_CHANNELS.CLEAR_PROVIDER_SECRET, async (_event, providerId: string) => {
            try {
                await this.vault.clearProviderSecret(providerId);
                const providers = await this.vault.listProviders();
                return {
                    success: true,
                    providers,
                    ...this.vault.getSecurityStatus(),
                };
            } catch (error) {
                this.logger.error(this.ns, 'Failed to clear provider secret.', error);
                return {
                    success: false,
                    error: '清除 API 密钥失败。',
                    ...this.vault.getSecurityStatus(),
                };
            }
        });

        ipcMain.handle(
            AI_CONFIG_CHANNELS.TEST_PROVIDER_CONNECTION,
            async (_event, request: IAIProviderConnectionTestRequest) => {
                const startedAt = Date.now();
                try {
                    const runtime = await this.vault.getProviderRuntime(request.providerId, request.modelId);
                    const timeoutController = new AbortController();
                    const timeout = setTimeout(() => timeoutController.abort(), 12000);

                    if (runtime.provider.kind === 'ollama') {
                        const response = await fetch(`${runtime.provider.baseUrl}/api/tags`, {
                            method: 'GET',
                            signal: timeoutController.signal,
                        });
                        clearTimeout(timeout);

                        if (!response.ok) {
                            const body = await response.text();
                            return {
                                success: false,
                                error: `Ollama 连通性测试失败：${response.status} ${body.slice(0, 180)}`,
                            };
                        }

                        return {
                            success: true,
                            latencyMs: Date.now() - startedAt,
                        };
                    }

                    const response = await fetch(`${runtime.provider.baseUrl}/chat/completions`, {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${runtime.apiKey}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            model: runtime.modelId,
                            messages: [{ role: 'user', content: 'ping' }],
                            max_tokens: 1,
                            stream: false,
                        }),
                        signal: timeoutController.signal,
                    });
                    clearTimeout(timeout);

                    if (!response.ok) {
                        const body = await response.text();
                        return {
                            success: false,
                            error: `模型接口测试失败：${response.status} ${body.slice(0, 180)}`,
                        };
                    }

                    return {
                        success: true,
                        latencyMs: Date.now() - startedAt,
                    };
                } catch (error) {
                    if (error instanceof AIProviderVaultError) {
                        return {
                            success: false,
                            code: error.code,
                            error: error.message,
                        };
                    }

                    const message = error instanceof Error ? error.message : '连接测试失败。';
                    return {
                        success: false,
                        code: 'PROVIDER_CONNECTION_TEST_FAILED',
                        error: message,
                    };
                }
            }
        );

        ipcMain.handle(
            AI_CONFIG_CHANNELS.DISCOVER_OLLAMA_MODELS,
            async (_event, request: IAIDiscoverOllamaModelsRequest) => {
                try {
                    const normalizedBaseUrl = request.baseUrl.trim().replace(/\/+$/, '');
                    if (!normalizedBaseUrl) {
                        return {
                            success: false,
                            code: 'PROVIDER_BASE_URL_REQUIRED',
                            error: 'Ollama Base URL 不能为空。',
                            models: [] as string[],
                        };
                    }

                    const timeoutController = new AbortController();
                    const timeout = setTimeout(() => timeoutController.abort(), 12000);
                    const response = await fetch(`${normalizedBaseUrl}/api/tags`, {
                        method: 'GET',
                        signal: timeoutController.signal,
                    });
                    clearTimeout(timeout);

                    if (!response.ok) {
                        const body = await response.text();
                        return {
                            success: false,
                            code: 'OLLAMA_DISCOVER_FAILED',
                            error: `读取 Ollama 模型失败：${response.status} ${body.slice(0, 180)}`,
                            models: [] as string[],
                        };
                    }

                    const payload = await response.json() as {
                        models?: Array<{ name?: string }>;
                    };
                    const models = Array.isArray(payload.models)
                        ? payload.models
                            .map((item) => (typeof item?.name === 'string' ? item.name.trim() : ''))
                            .filter((item) => item.length > 0)
                        : [];

                    return {
                        success: true,
                        models,
                    };
                } catch (error) {
                    return {
                        success: false,
                        code: 'OLLAMA_DISCOVER_FAILED',
                        error: error instanceof Error ? error.message : '读取 Ollama 模型失败。',
                        models: [] as string[],
                    };
                }
            }
        );
    }
}
