import type { AIAssistantDocumentEditMode } from './AIRequestContractTypes';
import {
    safeJsonParse,
} from './AIJsonContractUtils';
import type {
    IAIDocumentEditArtifact,
    IAIDocumentEditContractResult,
} from './AIStructuredArtifactTypes';

interface IAIDocumentEditTargetCandidate {
    type?: unknown;
    headingText?: unknown;
    headingLevel?: unknown;
    anchorText?: unknown;
    occurrence?: unknown;
}

interface IAIDocumentEditArtifactCandidate {
    target?: IAIDocumentEditTargetCandidate | null;
    operation?: unknown;
    content?: unknown;
    summary?: unknown;
    report?: unknown;
    confidence?: unknown;
}

interface IAIDocumentEditContractCandidate {
    assistantMessage?: unknown;
    report?: unknown;
    documentArtifact?: IAIDocumentEditArtifactCandidate | null;
    documentArtifacts?: IAIDocumentEditArtifactCandidate[] | null;
}

function buildModeHintLine(documentEditModeHint: AIAssistantDocumentEditMode | undefined): string {
    if (documentEditModeHint === 'replace-selection') {
        return '系统建议：目标应为当前选区，operation 优先使用 replace。';
    }

    if (documentEditModeHint === 'insert-cursor') {
        return '系统建议：目标应为当前光标，operation 优先使用 insert-after。';
    }

    return '系统建议：目标应为当前文档末尾，operation 优先使用 append。';
}

function normalizeDocumentEditArtifact(
    artifact: IAIDocumentEditArtifactCandidate | null | undefined
): IAIDocumentEditArtifact | null {
    if (!artifact || typeof artifact !== 'object') {
        return null;
    }

    const target = artifact.target;
    if (!target || typeof target !== 'object') {
        return null;
    }

    const targetType = target.type;
    if (
        targetType !== 'selection'
        && targetType !== 'cursor'
        && targetType !== 'document-start'
        && targetType !== 'document-end'
        && targetType !== 'heading'
        && targetType !== 'text-anchor'
    ) {
        return null;
    }

    const operation = artifact.operation;
    if (
        operation !== 'replace'
        && operation !== 'delete'
        && operation !== 'insert-before'
        && operation !== 'insert-after'
        && operation !== 'append'
        && operation !== 'prepend'
    ) {
        return null;
    }

    const content = typeof artifact.content === 'string' ? artifact.content : '';
    const summary = typeof artifact.summary === 'string' ? artifact.summary.trim() : '';
    if ((!content && operation !== 'delete') || !summary) {
        return null;
    }

    const confidence = artifact.confidence === 'high' || artifact.confidence === 'medium' || artifact.confidence === 'low'
        ? artifact.confidence
        : undefined;

    return {
        target: {
            type: targetType,
            headingText: typeof target.headingText === 'string' ? target.headingText.trim() : undefined,
            headingLevel: typeof target.headingLevel === 'number' ? target.headingLevel : undefined,
            anchorText: typeof target.anchorText === 'string' ? target.anchorText.trim() : undefined,
            occurrence: typeof target.occurrence === 'number' ? target.occurrence : undefined,
        },
        operation,
        content,
        summary,
        report: typeof artifact.report === 'string' && artifact.report.trim().length > 0
            ? artifact.report.trim()
            : undefined,
        confidence,
    };
}

export function buildDocumentEditContractPrompt(
    documentEditModeHint: AIAssistantDocumentEditMode | undefined
): string {
    return [
        '返回格式要求：你必须只返回一个 JSON 对象，不要输出任何额外文字、解释、代码块或思考过程。',
        buildModeHintLine(documentEditModeHint),
        'JSON 结构固定为：',
        '{"assistantMessage":"给用户看的极短反馈","report":"给用户看的结果总结，可选","documentArtifacts":[{"target":{"type":"selection|cursor|document-start|document-end|heading|text-anchor","headingText":"可选","headingLevel":1,"anchorText":"可选","occurrence":1},"operation":"replace|delete|insert-before|insert-after|append|prepend","content":"真正写入文档的最终文本，delete 时允许为空字符串","summary":"一句话说明本次修改","report":"可选的更详细总结","confidence":"high|medium|low"}]}',
        'assistantMessage 只允许是简短反馈，不允许复述全文，不允许包含思考过程。',
        'report 只用于向用户总结本次修改做了什么，不得写入文档。',
        'documentArtifacts 允许返回 1 个或多个编辑工件；当用户请求包含多个局部修改时，必须拆成多个工件返回。',
        'documentArtifacts[*].content 只允许包含最终写入文档的文本，不允许混入解释、前缀、Markdown 代码块、JSON 包装或“以下是修改内容”。',
        'documentArtifacts[*].target 和 operation 必须能唯一表达“改哪里、怎么改”。',
    ].join('\n');
}

export function parseDocumentEditContract(answer: string): IAIDocumentEditContractResult | null {
    const parsed = safeJsonParse<IAIDocumentEditContractCandidate>(answer);
    if (!parsed || typeof parsed !== 'object') {
        return null;
    }

    const assistantMessage = typeof parsed.assistantMessage === 'string'
        ? parsed.assistantMessage.trim()
        : '';
    const artifactCandidates = Array.isArray(parsed.documentArtifacts) && parsed.documentArtifacts.length > 0
        ? parsed.documentArtifacts
        : parsed.documentArtifact
            ? [parsed.documentArtifact]
            : [];
    const documentArtifacts = artifactCandidates
        .map((artifact) => normalizeDocumentEditArtifact(artifact))
        .filter((artifact): artifact is IAIDocumentEditArtifact => !!artifact);

    if (!assistantMessage || documentArtifacts.length === 0) {
        return null;
    }

    return {
        assistantMessage,
        report: typeof parsed.report === 'string' && parsed.report.trim().length > 0
            ? parsed.report.trim()
            : undefined,
        documentArtifacts,
    };
}
