import { parseDocumentEditContract } from './AIDocumentEditContract';
import { parseWorkspaceProposalContract } from './AIWorkspaceProposalContract';
import type { AITaskKind, IAIChatPayload } from './AIMessagePromptPolicy';

function resolveDocumentEditMode(payload: IAIChatPayload): 'replace-selection' | 'insert-cursor' | 'append-document' {
    if (payload.documentEditModeHint) {
        return payload.documentEditModeHint;
    }

    const selection = payload.context?.editor?.selection;
    if (selection && typeof selection.from === 'number' && typeof selection.to === 'number') {
        if (selection.from !== selection.to) {
            return 'replace-selection';
        }

        return 'insert-cursor';
    }

    return 'append-document';
}

export function mapAITaskResult(
    kind: AITaskKind,
    payload: IAIChatPayload,
    answer: string,
    reasoning?: string
): Record<string, unknown> {
    if (kind === 'edit') {
        const contract = parseDocumentEditContract(answer);
        if (!contract) {
            return {
                content: '未能生成可直接应用的结构化文档修改结果，请更具体说明要修改的位置或内容。',
                reasoning,
            };
        }

        const artifacts = contract.documentArtifacts.map((artifact) => ({ ...artifact }));
        const fallbackArtifact = artifacts[0];
        if (!fallbackArtifact.operation) {
            const resolvedMode = resolveDocumentEditMode(payload);
            fallbackArtifact.operation = resolvedMode === 'replace-selection'
                ? 'replace'
                : resolvedMode === 'insert-cursor'
                    ? 'insert-after'
                    : 'append';
        }

        return {
            content: contract.assistantMessage,
            reasoning,
            report: contract.report ?? artifacts.map((artifact) => artifact.report ?? artifact.summary).join('；'),
            documentEdit: fallbackArtifact,
            documentEdits: artifacts,
        };
    }

    if (kind === 'workspace-change') {
        const contract = parseWorkspaceProposalContract(answer);
        if (!contract) {
            return {
                content: '未能生成结构化工作区变更提案，请明确目标文件、路径或修改范围。',
                reasoning,
            };
        }

        return {
            content: contract.assistantMessage,
            reasoning,
            report: contract.report ?? contract.workspaceProposal.report ?? contract.workspaceProposal.summary,
            workspaceProposal: contract.workspaceProposal,
        };
    }

    return {
        content: answer,
        reasoning,
    };
}

export {
    resolveDocumentEditMode,
};
