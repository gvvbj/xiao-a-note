import { ServiceId } from '@/kernel/core/ServiceId';
import { Kernel } from '@/kernel/core/Kernel';
import type {
    IEditorActionService,
    IEditorDocumentSelection,
    IEditorDocumentSnapshot,
    IEditorService,
    IEditorTextEdit,
    IEditorTextRange,
} from '@/kernel/interfaces';
import { EditorCommandCapability } from '../engines/core/EngineCapabilitySchema';
import type { IEditorRef } from '../framework/types';

type EditorRefProvider = () => IEditorRef | null;

export class EditorActionService implements IEditorActionService {
    private editorRefProvider: EditorRefProvider | null = null;

    constructor(private readonly kernel: Kernel) {}

    registerEditorRefProvider(provider: EditorRefProvider): () => void {
        this.editorRefProvider = provider;

        return () => {
            if (this.editorRefProvider === provider) {
                this.editorRefProvider = null;
            }
        };
    }

    getActiveSnapshot(): IEditorDocumentSnapshot {
        const editorState = this.getEditorState();
        const editorRef = this.getEditorRef();

        return {
            filePath: editorState.currentFileId,
            content: editorRef?.getContent() ?? '',
            isDirty: editorState.isUnsaved,
            viewMode: editorState.viewMode,
            selection: editorRef?.getSelection() ?? null,
        };
    }

    getSelection(): IEditorDocumentSelection | null {
        return this.getEditorRef()?.getSelection() ?? null;
    }

    replaceSelection(text: string, _source: string = 'ai'): void {
        const editorRef = this.requireEditorRef();
        const selection = editorRef.getSelection() ?? this.createCollapsedSelection(0);

        editorRef.applyTextEdits(
            [{
                range: { from: selection.from, to: selection.to },
                text,
            }],
            { anchor: selection.from + text.length },
        );
    }

    insertText(
        text: string,
        at: 'cursor' | 'selectionStart' | 'selectionEnd' | number = 'cursor',
        _source: string = 'ai',
    ): void {
        const editorRef = this.requireEditorRef();
        const position = this.resolveInsertPosition(
            editorRef.getContent(),
            editorRef.getSelection(),
            at,
        );

        editorRef.applyTextEdits(
            [{
                range: { from: position, to: position },
                text,
            }],
            { anchor: position + text.length },
        );
    }

    deleteRange(range: IEditorTextRange, _source: string = 'ai'): void {
        const editorRef = this.requireEditorRef();
        const validatedRange = this.validateRange(editorRef.getContent(), range);

        editorRef.applyTextEdits(
            [{
                range: validatedRange,
                text: '',
            }],
            { anchor: validatedRange.from },
        );
    }

    applyTextEdits(edits: IEditorTextEdit[], _source: string = 'ai'): void {
        if (edits.length === 0) {
            return;
        }

        const editorRef = this.requireEditorRef();
        const content = editorRef.getContent();
        const normalizedEdits = edits
            .map((edit) => ({
                ...edit,
                range: this.validateRange(content, edit.range),
            }))
            .sort((left, right) => {
                if (left.range.from !== right.range.from) {
                    return right.range.from - left.range.from;
                }

                return right.range.to - left.range.to;
            });

        editorRef.applyTextEdits(normalizedEdits);
    }

    setContent(content: string, _source: string = 'ai'): void {
        const editorRef = this.requireEditorRef();
        const currentContent = editorRef.getContent();

        editorRef.applyTextEdits([{
            range: { from: 0, to: currentContent.length },
            text: content,
        }]);
    }

    focus(): void {
        this.requireEditorRef().focus();
    }

    undo(): void {
        this.requireEditorRef().executeCommand(EditorCommandCapability.UNDO);
    }

    redo(): void {
        this.requireEditorRef().executeCommand(EditorCommandCapability.REDO);
    }

    private getEditorRef(): IEditorRef | null {
        return this.editorRefProvider?.() ?? null;
    }

    private requireEditorRef(): IEditorRef {
        const editorRef = this.getEditorRef();
        if (!editorRef) {
            throw new Error('No active editor session is available for AI actions.');
        }

        return editorRef;
    }

    private getEditorState(): ReturnType<IEditorService['getState']> {
        const editorService = this.kernel.getService<IEditorService>(ServiceId.EDITOR, false);
        return editorService?.getState() ?? {
            currentFileId: null,
            isUnsaved: false,
            headingNumbering: false,
            saveAsDialogOpen: false,
            viewMode: 'preview',
        };
    }

    private resolveInsertPosition(
        content: string,
        selection: IEditorDocumentSelection | null,
        at: 'cursor' | 'selectionStart' | 'selectionEnd' | number,
    ): number {
        if (typeof at === 'number') {
            return this.validatePosition(content, at);
        }

        const activeSelection = selection ?? this.createCollapsedSelection(0);
        switch (at) {
            case 'selectionStart':
                return this.validatePosition(content, activeSelection.from);
            case 'selectionEnd':
            case 'cursor':
            default:
                return this.validatePosition(content, activeSelection.to);
        }
    }

    private validateRange(content: string, range: IEditorTextRange): IEditorTextRange {
        const from = this.validatePosition(content, range.from);
        const to = this.validatePosition(content, range.to);

        if (from > to) {
            throw new Error(`Invalid editor range: from (${from}) cannot be greater than to (${to}).`);
        }

        return { from, to };
    }

    private validatePosition(content: string, position: number): number {
        if (!Number.isInteger(position)) {
            throw new Error(`Invalid editor position: ${position}.`);
        }

        if (position < 0 || position > content.length) {
            throw new Error(`Editor position out of bounds: ${position}.`);
        }

        return position;
    }

    private createCollapsedSelection(position: number): IEditorDocumentSelection {
        return {
            from: position,
            to: position,
            text: '',
        };
    }
}
