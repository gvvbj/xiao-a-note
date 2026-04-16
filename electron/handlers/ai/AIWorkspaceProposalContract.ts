import { safeJsonParse } from './AIJsonContractUtils';
import type {
    IAIWorkspaceProposalChange,
    IAIWorkspaceProposalContractResult,
} from './AIStructuredArtifactTypes';

interface IAIWorkspaceProposalTargetCandidate {
    type?: unknown;
    headingText?: unknown;
    headingLevel?: unknown;
    anchorText?: unknown;
    occurrence?: unknown;
}

interface IAIWorkspaceProposalChangeCandidate {
    kind?: unknown;
    path?: unknown;
    newPath?: unknown;
    content?: unknown;
    target?: IAIWorkspaceProposalTargetCandidate | null;
    summary?: unknown;
    risk?: unknown;
}

interface IAIWorkspaceProposalCandidate {
    summary?: unknown;
    report?: unknown;
    changes?: unknown;
}

interface IAIWorkspaceProposalContractCandidate {
    assistantMessage?: unknown;
    report?: unknown;
    workspaceProposal?: IAIWorkspaceProposalCandidate | null;
}

function normalizeWorkspaceProposalChange(
    value: unknown
): IAIWorkspaceProposalChange | null {
    if (typeof value !== 'object' || value === null) {
        return null;
    }

    const candidate = value as IAIWorkspaceProposalChangeCandidate;
    const kind = candidate.kind;
    if (kind !== 'create' && kind !== 'update' && kind !== 'delete' && kind !== 'rename') {
        return null;
    }

    const path = typeof candidate.path === 'string' ? candidate.path.trim() : '';
    const summary = typeof candidate.summary === 'string' ? candidate.summary.trim() : '';
    const risk = candidate.risk === 'low' || candidate.risk === 'medium' || candidate.risk === 'high'
        ? candidate.risk
        : null;
    if (!path || !summary || !risk) {
        return null;
    }

    return {
        kind,
        path,
        newPath: typeof candidate.newPath === 'string' && candidate.newPath.trim().length > 0
            ? candidate.newPath.trim()
            : undefined,
        content: typeof candidate.content === 'string' ? candidate.content : undefined,
        target: candidate.target && typeof candidate.target === 'object'
            ? {
                type:
                    candidate.target.type === 'full-file'
                    || candidate.target.type === 'heading'
                    || candidate.target.type === 'text-anchor'
                        ? candidate.target.type
                        : undefined,
                headingText: typeof candidate.target.headingText === 'string'
                    ? candidate.target.headingText.trim()
                    : undefined,
                headingLevel: typeof candidate.target.headingLevel === 'number'
                    ? candidate.target.headingLevel
                    : undefined,
                anchorText: typeof candidate.target.anchorText === 'string'
                    ? candidate.target.anchorText.trim()
                    : undefined,
                occurrence: typeof candidate.target.occurrence === 'number'
                    ? candidate.target.occurrence
                    : undefined,
            }
            : undefined,
        summary,
        risk,
    };
}

export function buildWorkspaceProposalContractPrompt(): string {
    return [
        '返回格式要求：你必须只返回一个 JSON 对象，不要输出任何额外文字、解释、代码块或思考过程。',
        'JSON 结构固定为：',
        '{"assistantMessage":"给用户看的极短反馈","report":"给用户看的结果总结，可选","workspaceProposal":{"summary":"一句话概述本次工作区变更","report":"可选的更详细总结","changes":[{"kind":"create|update|delete|rename","path":"目标路径","newPath":"重命名新路径，可选","content":"创建或更新时的最终内容，可选","target":{"type":"full-file|heading|text-anchor","headingText":"可选","headingLevel":1,"anchorText":"可选","occurrence":1},"summary":"一句话说明本项变更","risk":"low|medium|high"}]}}',
        'assistantMessage 和 report 只给用户看，不表示已经落盘。',
        'workspaceProposal.changes 里的每一项都必须结构化，不允许用自然语言段落代替。',
        '如果请求涉及创建文件或多文件修改，你只能返回提案，不得声称“已经创建”或“已经写入”。',
    ].join('\n');
}

export function parseWorkspaceProposalContract(answer: string): IAIWorkspaceProposalContractResult | null {
    const parsed = safeJsonParse<IAIWorkspaceProposalContractCandidate>(answer);
    if (!parsed || typeof parsed !== 'object') {
        return null;
    }

    const assistantMessage = typeof parsed.assistantMessage === 'string'
        ? parsed.assistantMessage.trim()
        : '';
    const proposal = parsed.workspaceProposal;
    if (!assistantMessage || !proposal || typeof proposal !== 'object') {
        return null;
    }

    const summary = typeof proposal.summary === 'string' ? proposal.summary.trim() : '';
    const changes = Array.isArray(proposal.changes)
        ? proposal.changes
            .map(normalizeWorkspaceProposalChange)
            .filter((item): item is IAIWorkspaceProposalChange => item !== null)
        : [];
    if (!summary || changes.length === 0) {
        return null;
    }

    return {
        assistantMessage,
        report: typeof parsed.report === 'string' && parsed.report.trim().length > 0
            ? parsed.report.trim()
            : undefined,
        workspaceProposal: {
            summary,
            report: typeof proposal.report === 'string' && proposal.report.trim().length > 0
                ? proposal.report.trim()
                : undefined,
            changes,
        },
    };
}
