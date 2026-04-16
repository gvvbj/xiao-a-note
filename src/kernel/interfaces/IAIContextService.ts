/**
 * AI Context Interfaces
 *
 * 第五阶段将基于此接口实现受控上下文采集。
 */

import type { IEditorDocumentSnapshot } from './IEditorActionService';

export interface IAIContextRequest {
    pluginId?: string;
    includeEditor?: boolean;
    includeSelection?: boolean;
    includeWorkspaceRoot?: boolean;
    includeFileTree?: boolean;
}

export interface IAIContextSnapshot {
    editor?: IEditorDocumentSnapshot;
    workspaceRoot?: string | null;
    fileTree?: any[];
}

export interface IAIContextService {
    collect(request: IAIContextRequest): Promise<IAIContextSnapshot>;
}
