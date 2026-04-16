export type AIAssistantDocumentEditTargetType =
    | 'selection'
    | 'cursor'
    | 'document-start'
    | 'document-end'
    | 'heading'
    | 'text-anchor';

export type AIAssistantDocumentEditOperation =
    | 'replace'
    | 'delete'
    | 'insert-before'
    | 'insert-after'
    | 'append'
    | 'prepend';

export type AIAssistantDocumentEditConfidence = 'high' | 'medium' | 'low';

export interface IAIDocumentEditTarget {
    type: AIAssistantDocumentEditTargetType;
    headingText?: string;
    headingLevel?: number;
    anchorText?: string;
    occurrence?: number;
}

export interface IAIDocumentEditArtifact {
    target: IAIDocumentEditTarget;
    operation: AIAssistantDocumentEditOperation;
    content: string;
    summary: string;
    report?: string;
    confidence?: AIAssistantDocumentEditConfidence;
}

export interface IAIDocumentEditContractResult {
    assistantMessage: string;
    report?: string;
    documentArtifacts: IAIDocumentEditArtifact[];
}

export type AIAssistantWorkspaceProposalChangeKind = 'create' | 'update' | 'delete' | 'rename';
export type AIAssistantWorkspaceProposalRisk = 'low' | 'medium' | 'high';

export interface IAIWorkspaceProposalTarget {
    type?: 'full-file' | 'heading' | 'text-anchor';
    headingText?: string;
    headingLevel?: number;
    anchorText?: string;
    occurrence?: number;
}

export interface IAIWorkspaceProposalChange {
    kind: AIAssistantWorkspaceProposalChangeKind;
    path: string;
    newPath?: string;
    content?: string;
    target?: IAIWorkspaceProposalTarget;
    summary: string;
    risk: AIAssistantWorkspaceProposalRisk;
}

export interface IAIWorkspaceProposalContractResult {
    assistantMessage: string;
    report?: string;
    workspaceProposal: {
        summary: string;
        report?: string;
        changes: IAIWorkspaceProposalChange[];
    };
}
