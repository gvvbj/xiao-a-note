import type {
    AIAssistantContextVisibility,
    AIAssistantDocumentEditMode,
    AIAssistantRequestMode,
} from './AIRequestContractTypes';
import { buildDocumentEditContractPrompt } from './AIDocumentEditContract';
import { buildWorkspaceProposalContractPrompt } from './AIWorkspaceProposalContract';
import { buildRequestModeInstruction } from './AIRequestModePromptCatalog';

export type AITaskKind = 'chat' | 'plan' | 'edit' | 'workspace-change';

export interface IAIChatPayload {
    prompt?: string;
    modelId?: string;
    providerId?: string;
    requestMode?: AIAssistantRequestMode;
    contextScope?: string;
    contextVisibility?: AIAssistantContextVisibility;
    documentEditModeHint?: AIAssistantDocumentEditMode;
    thinkingEnabled?: boolean;
    toolsEnabled?: boolean;
    systemPrompt?: string;
    history?: Array<{
        role?: unknown;
        content?: unknown;
    }>;
    context?: {
        editor?: {
            content?: string;
            selection?: {
                from?: number;
                to?: number;
                text?: string;
            } | null;
        };
        workspaceRoot?: string | null;
        fileTree?: unknown[];
    };
}

export interface IAIModelMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

function getTextFromContentPart(content: unknown): string {
    if (typeof content === 'string') {
        return content;
    }

    if (!Array.isArray(content)) {
        return '';
    }

    return content
        .map((part) => {
            if (typeof part === 'string') {
                return part;
            }

            if (typeof part === 'object' && part !== null) {
                const text = Reflect.get(part, 'text');
                return typeof text === 'string' ? text : '';
            }

            return '';
        })
        .join('');
}

function buildContextSnippet(context: unknown): string | null {
    if (!context || typeof context !== 'object') {
        return null;
    }

    try {
        const serialized = JSON.stringify(context);
        if (!serialized) {
            return null;
        }

        return serialized.length > 2400
            ? `${serialized.slice(0, 2400)}...(truncated)`
            : serialized;
    } catch {
        return null;
    }
}

function normalizeHistoryMessages(payload: IAIChatPayload): IAIModelMessage[] {
    if (!Array.isArray(payload.history)) {
        return [];
    }

    return payload.history
        .filter((item): item is { role?: unknown; content?: unknown } => typeof item === 'object' && item !== null)
        .map((item) => {
            const role = item.role === 'assistant' || item.role === 'system' ? item.role : 'user';
            const content = typeof item.content === 'string' ? item.content.trim() : '';
            if (content.length === 0) {
                return null;
            }

            return {
                role,
                content,
            } satisfies IAIModelMessage;
        })
        .filter((item): item is IAIModelMessage => item !== null);
}

function resolveRequestMode(kind: AITaskKind, payload: IAIChatPayload): AIAssistantRequestMode {
    if (payload.requestMode) {
        return payload.requestMode;
    }

    if (kind === 'edit') {
        return 'document-edit';
    }

    if (kind === 'workspace-change') {
        return 'workspace-change';
    }

    return 'chat';
}

export function extractModelTextContent(content: unknown): string {
    return getTextFromContentPart(content);
}

export function summarizeEditorContext(payload: IAIChatPayload): string | null {
    const selectionText = payload.context?.editor?.selection?.text?.trim();
    if (selectionText) {
        if (payload.contextVisibility === 'explicit') {
            return `本次请求带有当前选区上下文，选区片段是“${selectionText.slice(0, 40)}”。`;
        }

        return '本次请求可参考当前选区作为隐式上下文。';
    }

    const documentText = payload.context?.editor?.content?.trim();
    if (documentText) {
        if (payload.contextVisibility === 'explicit') {
            return `本次请求带有当前文档上下文，文档开头是“${documentText.slice(0, 60)}”。`;
        }

        return '本次请求可参考当前激活文档作为隐式上下文。';
    }

    if (payload.context?.workspaceRoot) {
        const fileTreeCount = Array.isArray(payload.context.fileTree) ? payload.context.fileTree.length : 0;
        return `本次请求带有工作区上下文，可见文件树节点数约为 ${fileTreeCount}。`;
    }

    return null;
}

function buildRemoteUserPrompt(kind: AITaskKind, payload: IAIChatPayload): string {
    const requestMode = resolveRequestMode(kind, payload);
    const modeInstruction = buildRequestModeInstruction(
        requestMode,
        payload.contextVisibility ?? 'implicit',
        payload.documentEditModeHint
    );
    const contextSummary = summarizeEditorContext(payload);
    const contextSnippet = buildContextSnippet(payload.context);
    const sections = [
        modeInstruction,
        requestMode === 'document-edit'
            ? buildDocumentEditContractPrompt(payload.documentEditModeHint)
            : requestMode === 'workspace-change'
                ? buildWorkspaceProposalContractPrompt()
                : '',
        payload.prompt?.trim() ?? '',
        contextSummary ? `上下文摘要：${contextSummary}` : '',
        contextSnippet ? `上下文快照(JSON)：${contextSnippet}` : '',
    ].filter((item) => item.length > 0);

    return sections.join('\n\n');
}

export function buildRemoteMessages(kind: AITaskKind, payload: IAIChatPayload): IAIModelMessage[] {
    const messages: IAIModelMessage[] = [];
    const systemPrompt = payload.systemPrompt?.trim();
    if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push(...normalizeHistoryMessages(payload));
    messages.push({
        role: 'user',
        content: buildRemoteUserPrompt(kind, payload),
    });
    return messages;
}
