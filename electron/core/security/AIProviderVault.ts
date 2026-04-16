import { app, safeStorage } from 'electron';
import fs from 'fs';
import path from 'path';

export type AIAssistantProviderKind = 'openai-compatible' | 'ollama';

export interface IAIAssistantProviderRecord {
    id: string;
    name: string;
    kind: AIAssistantProviderKind;
    baseUrl: string;
    modelIds: string[];
    defaultModelId: string;
    enabled: boolean;
    createdAt: number;
    updatedAt: number;
}

export interface IAIAssistantProviderSummary extends IAIAssistantProviderRecord {
    hasSecret: boolean;
    maskedSecret: string | null;
}

export interface IAIAssistantProviderUpsertInput {
    id?: string;
    name: string;
    kind: AIAssistantProviderKind;
    baseUrl: string;
    modelIds: string[];
    defaultModelId?: string;
    enabled?: boolean;
}

export interface IAIAssistantProviderRuntime {
    provider: IAIAssistantProviderRecord;
    modelId: string;
    apiKey: string | null;
}

interface IAIAssistantProvidersFile {
    version: 1;
    providers: IAIAssistantProviderRecord[];
}

interface IAIAssistantSecretsFile {
    version: 1;
    secrets: Record<string, string>;
}

export class AIProviderVaultError extends Error {
    constructor(public readonly code: string, message: string) {
        super(message);
        this.name = 'AIProviderVaultError';
    }
}

function createProviderId(): string {
    return `provider-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function normalizeBaseUrl(baseUrl: string): string {
    const trimmed = baseUrl.trim();
    if (!trimmed) {
        return '';
    }
    return trimmed.replace(/\/+$/, '');
}

function normalizeModelIds(modelIds: string[]): string[] {
    const deduped = new Set(
        modelIds
            .map((item) => item.trim())
            .filter((item) => item.length > 0)
    );
    return [...deduped];
}

function maskSecret(secret: string): string {
    if (secret.length <= 8) {
        return '********';
    }
    return `${secret.slice(0, 4)}********${secret.slice(-4)}`;
}

export class AIProviderVault {
    private static instance: AIProviderVault | null = null;
    static readonly STRICT_SECRET_MODE = true;

    private readonly aiDirectoryPath = path.join(app.getPath('userData'), 'ai');
    private readonly providersFilePath = path.join(this.aiDirectoryPath, 'providers.v1.json');
    private readonly secretsFilePath = path.join(this.aiDirectoryPath, 'secrets.v1.json');

    static getInstance(): AIProviderVault {
        if (!AIProviderVault.instance) {
            AIProviderVault.instance = new AIProviderVault();
        }
        return AIProviderVault.instance;
    }

    async listProviders(): Promise<IAIAssistantProviderSummary[]> {
        const [providers, secrets] = await Promise.all([
            this.readProviders(),
            this.readSecrets(),
        ]);

        return providers.map((provider) => {
            const secretValue = secrets[provider.id];
            let maskedSecret: string | null = null;

            if (secretValue) {
                const plainText = this.tryDecryptSecret(secretValue);
                maskedSecret = plainText ? maskSecret(plainText) : '********';
            }

            return {
                ...provider,
                hasSecret: Boolean(secretValue),
                maskedSecret,
            };
        });
    }

    async upsertProvider(input: IAIAssistantProviderUpsertInput): Promise<IAIAssistantProviderRecord> {
        const normalizedName = input.name.trim();
        if (!normalizedName) {
            throw new AIProviderVaultError('PROVIDER_NAME_REQUIRED', '供应商名称不能为空。');
        }

        const normalizedBaseUrl = normalizeBaseUrl(input.baseUrl);
        if (!normalizedBaseUrl) {
            throw new AIProviderVaultError('PROVIDER_BASE_URL_REQUIRED', '供应商 Base URL 不能为空。');
        }

        const normalizedModelIds = normalizeModelIds(input.modelIds);
        if (normalizedModelIds.length === 0) {
            throw new AIProviderVaultError('PROVIDER_MODELS_REQUIRED', '至少需要配置一个模型。');
        }

        const normalizedDefaultModelId = (input.defaultModelId ?? '').trim();
        const defaultModelId = normalizedDefaultModelId && normalizedModelIds.includes(normalizedDefaultModelId)
            ? normalizedDefaultModelId
            : normalizedModelIds[0];

        const providers = await this.readProviders();
        const now = Date.now();
        const targetId = input.id?.trim() || createProviderId();
        const existed = providers.find((provider) => provider.id === targetId);

        const nextProvider: IAIAssistantProviderRecord = {
            id: targetId,
            name: normalizedName,
            kind: input.kind,
            baseUrl: normalizedBaseUrl,
            modelIds: normalizedModelIds,
            defaultModelId,
            enabled: input.enabled ?? true,
            createdAt: existed?.createdAt ?? now,
            updatedAt: now,
        };

        const nextProviders = existed
            ? providers.map((provider) => (provider.id === targetId ? nextProvider : provider))
            : [...providers, nextProvider];

        await this.writeProviders(nextProviders);
        return nextProvider;
    }

    async deleteProvider(providerId: string): Promise<void> {
        const normalizedProviderId = providerId.trim();
        if (!normalizedProviderId) {
            return;
        }

        const [providers, secrets] = await Promise.all([
            this.readProviders(),
            this.readSecrets(),
        ]);
        const nextProviders = providers.filter((provider) => provider.id !== normalizedProviderId);
        if (nextProviders.length !== providers.length) {
            await this.writeProviders(nextProviders);
        }

        if (secrets[normalizedProviderId]) {
            delete secrets[normalizedProviderId];
            await this.writeSecrets(secrets);
        }
    }

    async setProviderSecret(providerId: string, apiKey: string): Promise<void> {
        const normalizedProviderId = providerId.trim();
        const normalizedApiKey = apiKey.trim();
        if (!normalizedProviderId) {
            throw new AIProviderVaultError('PROVIDER_ID_REQUIRED', '供应商 ID 不能为空。');
        }
        if (!normalizedApiKey) {
            throw new AIProviderVaultError('PROVIDER_SECRET_REQUIRED', 'API Key 不能为空。');
        }

        if (!safeStorage.isEncryptionAvailable()) {
            throw new AIProviderVaultError(
                'SAFE_STORAGE_UNAVAILABLE',
                '当前系统不可用安全加密存储，无法保存云 API 密钥。'
            );
        }

        const providers = await this.readProviders();
        const provider = providers.find((item) => item.id === normalizedProviderId);
        if (!provider) {
            throw new AIProviderVaultError('PROVIDER_NOT_FOUND', '供应商不存在。');
        }

        if (provider.kind === 'ollama') {
            return;
        }

        const secrets = await this.readSecrets();
        const encryptedBuffer = safeStorage.encryptString(normalizedApiKey);
        secrets[normalizedProviderId] = encryptedBuffer.toString('base64');
        await this.writeSecrets(secrets);
    }

    async clearProviderSecret(providerId: string): Promise<void> {
        const normalizedProviderId = providerId.trim();
        if (!normalizedProviderId) {
            return;
        }
        const secrets = await this.readSecrets();
        if (secrets[normalizedProviderId]) {
            delete secrets[normalizedProviderId];
            await this.writeSecrets(secrets);
        }
    }

    async getProviderRuntime(providerId: string, modelId?: string): Promise<IAIAssistantProviderRuntime> {
        const normalizedProviderId = providerId.trim();
        if (!normalizedProviderId) {
            throw new AIProviderVaultError('PROVIDER_ID_REQUIRED', '供应商 ID 不能为空。');
        }

        const providers = await this.readProviders();
        const provider = providers.find((item) => item.id === normalizedProviderId && item.enabled);
        if (!provider) {
            throw new AIProviderVaultError('PROVIDER_NOT_FOUND', '供应商不存在或已禁用。');
        }

        const normalizedModelId = (modelId ?? '').trim();
        const resolvedModelId = normalizedModelId && provider.modelIds.includes(normalizedModelId)
            ? normalizedModelId
            : provider.defaultModelId;

        if (!resolvedModelId) {
            throw new AIProviderVaultError('MODEL_NOT_FOUND', '供应商未配置可用模型。');
        }

        if (provider.kind === 'ollama') {
            return {
                provider,
                modelId: resolvedModelId,
                apiKey: null,
            };
        }

        const secrets = await this.readSecrets();
        const cipherText = secrets[provider.id];
        if (!cipherText) {
            throw new AIProviderVaultError('PROVIDER_SECRET_MISSING', '供应商尚未配置 API 密钥。');
        }

        if (!safeStorage.isEncryptionAvailable()) {
            throw new AIProviderVaultError('SAFE_STORAGE_UNAVAILABLE', '当前系统不可用安全加密存储。');
        }

        const plainText = this.tryDecryptSecret(cipherText);
        if (!plainText) {
            throw new AIProviderVaultError('PROVIDER_SECRET_INVALID', '供应商 API 密钥无法解密，请重新设置。');
        }

        return {
            provider,
            modelId: resolvedModelId,
            apiKey: plainText,
        };
    }

    getSecurityStatus(): {
        encryptionAvailable: boolean;
        strictSecretMode: boolean;
    } {
        return {
            encryptionAvailable: safeStorage.isEncryptionAvailable(),
            strictSecretMode: AIProviderVault.STRICT_SECRET_MODE,
        };
    }

    private async ensureStorageDirectory(): Promise<void> {
        await fs.promises.mkdir(this.aiDirectoryPath, { recursive: true });
    }

    private async readProviders(): Promise<IAIAssistantProviderRecord[]> {
        await this.ensureStorageDirectory();
        if (!fs.existsSync(this.providersFilePath)) {
            return [];
        }

        try {
            const raw = await fs.promises.readFile(this.providersFilePath, 'utf-8');
            const parsed = JSON.parse(raw) as Partial<IAIAssistantProvidersFile>;
            return Array.isArray(parsed.providers) ? parsed.providers : [];
        } catch {
            return [];
        }
    }

    private async writeProviders(providers: IAIAssistantProviderRecord[]): Promise<void> {
        await this.ensureStorageDirectory();
        const payload: IAIAssistantProvidersFile = {
            version: 1,
            providers,
        };
        await this.writeJsonAtomic(this.providersFilePath, payload);
    }

    private async readSecrets(): Promise<Record<string, string>> {
        await this.ensureStorageDirectory();
        if (!fs.existsSync(this.secretsFilePath)) {
            return {};
        }

        try {
            const raw = await fs.promises.readFile(this.secretsFilePath, 'utf-8');
            const parsed = JSON.parse(raw) as Partial<IAIAssistantSecretsFile>;
            if (!parsed || typeof parsed !== 'object' || !parsed.secrets || typeof parsed.secrets !== 'object') {
                return {};
            }
            return parsed.secrets as Record<string, string>;
        } catch {
            return {};
        }
    }

    private async writeSecrets(secrets: Record<string, string>): Promise<void> {
        await this.ensureStorageDirectory();
        const payload: IAIAssistantSecretsFile = {
            version: 1,
            secrets,
        };
        await this.writeJsonAtomic(this.secretsFilePath, payload);
    }

    private async writeJsonAtomic(filePath: string, value: unknown): Promise<void> {
        const directoryPath = path.dirname(filePath);
        await fs.promises.mkdir(directoryPath, { recursive: true });
        const temporaryPath = `${filePath}.tmp-${Date.now()}`;
        await fs.promises.writeFile(temporaryPath, JSON.stringify(value, null, 2), 'utf-8');
        await fs.promises.rename(temporaryPath, filePath);
    }

    private tryDecryptSecret(cipherText: string): string | null {
        try {
            const encryptedBuffer = Buffer.from(cipherText, 'base64');
            return safeStorage.decryptString(encryptedBuffer);
        } catch {
            return null;
        }
    }
}

