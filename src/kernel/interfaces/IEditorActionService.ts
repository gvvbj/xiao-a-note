/**
 * Editor Action Interfaces
 *
 * 第二阶段将基于此接口落地 AI 的正式编辑器语义操作层。
 * 当前阶段只固定契约，避免后续实现过程中继续摇摆。
 */

export interface IEditorTextRange {
    from: number;
    to: number;
}

export interface IEditorTextEdit {
    range: IEditorTextRange;
    text: string;
}

export interface IEditorDocumentSelection extends IEditorTextRange {
    text: string;
}

export interface IEditorDocumentSnapshot {
    filePath: string | null;
    content: string;
    isDirty: boolean;
    viewMode: 'source' | 'preview';
    selection: IEditorDocumentSelection | null;
}

export interface IEditorActionService {
    getActiveSnapshot(): IEditorDocumentSnapshot;
    getSelection(): IEditorDocumentSelection | null;
    replaceSelection(text: string, source?: string): void;
    insertText(text: string, at?: 'cursor' | 'selectionStart' | 'selectionEnd' | number, source?: string): void;
    deleteRange(range: IEditorTextRange, source?: string): void;
    applyTextEdits(edits: IEditorTextEdit[], source?: string): void;
    setContent(content: string, source?: string): void;
    focus(): void;
    undo(): void;
    redo(): void;
}

