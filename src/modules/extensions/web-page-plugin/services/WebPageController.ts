import type { EditorView } from '@codemirror/view';
import { ServiceId } from '@/kernel/core/ServiceId';
import type { IPluginContext } from '@/kernel/system/plugin/types';
import type { WebPageDiagnostic } from '../constants/WebPageSchema';
import {
    WebPageDocumentParser,
    type WebPageDocumentModel,
    type WebPageNodeLocation,
} from '../parser/WebPageDocumentParser';
import { WebPageSchemaValidator } from './WebPageSchemaValidator';
import {
    WebPageSourcePatchService,
    type WebPageAttributeWritebackRequest,
    type WebPageFormControlWritebackRequest,
    type WebPageSourcePatchResult,
} from './WebPageSourcePatchService';

interface IFileSystemProbe {
    readFile?(path: string): Promise<string>;
}

export interface WebPageViewState {
    isWebPageFile: boolean;
    isActive: boolean;
    currentPath?: string | null;
    document: WebPageDocumentModel | null;
    diagnostics: WebPageDiagnostic[];
    selectedNodeId: string | null;
}

export interface WebPageWritebackStatus {
    ok: boolean;
    message: string;
}

type Listener = () => void;

export class WebPageController {
    private readonly listeners = new Set<Listener>();
    private readonly sourcePatchService = new WebPageSourcePatchService();
    private editorView: EditorView | null = null;
    private resolutionNonce = 0;
    private state: WebPageViewState = {
        isWebPageFile: false,
        isActive: false,
        currentPath: null,
        document: null,
        diagnostics: [],
        selectedNodeId: null,
    };

    constructor(private readonly context: IPluginContext) {}

    getState(): WebPageViewState {
        return this.state;
    }

    subscribe(listener: Listener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    setEditorView(view: EditorView | null) {
        this.editorView = view;
    }

    handleContentChange(content: string, path?: string | null) {
        const currentNonce = ++this.resolutionNonce;
        void this.resolveDocument(content, path ?? this.state.currentPath ?? null, currentNonce);
    }

    toggleView() {
        if (!this.state.isWebPageFile) {
            return;
        }

        this.state = {
            ...this.state,
            isActive: !this.state.isActive,
        };

        this.notify();
    }

    selectNode(nodeId: string | null) {
        if (this.state.selectedNodeId === nodeId) {
            return;
        }

        this.state = {
            ...this.state,
            selectedNodeId: nodeId,
        };

        this.notify();
    }

    getNodeLocation(nodeId: string): WebPageNodeLocation | null {
        return this.sourcePatchService.getNodeLocation(this.state.document, nodeId);
    }

    writebackNodeText(nodeId: string, text: string): WebPageWritebackStatus {
        const result = this.sourcePatchService.replaceNodeText(this.state.document, {
            nodeId,
            text,
        });

        return this.applyPatchedDocument(result, `已写回节点文本：${nodeId}`);
    }

    writebackFormControl(request: WebPageFormControlWritebackRequest): WebPageWritebackStatus {
        const result = this.sourcePatchService.syncFormControlValue(this.state.document, request);

        return this.applyPatchedDocument(result, `已写回控件值：${request.nodeId}`);
    }

    writebackNodeAttributes(request: WebPageAttributeWritebackRequest): WebPageWritebackStatus {
        const result = this.sourcePatchService.replaceNodeAttributes(this.state.document, request);

        return this.applyPatchedDocument(result, `已写回节点属性：${request.nodeId}`);
    }

    dispose() {
        this.listeners.clear();
        this.editorView = null;
    }

    private notify() {
        for (const listener of this.listeners) {
            listener();
        }
    }

    private async resolveDocument(content: string, path: string | null, nonce: number) {
        const previousState = this.state;
        let nextDocument = WebPageDocumentParser.parse(content);

        if (!nextDocument.isWebPageFile && path) {
            const recoveredDocument = await this.tryRecoverDocument(content, path, previousState);
            if (recoveredDocument) {
                nextDocument = recoveredDocument;
            }
        }

        if (nonce !== this.resolutionNonce) {
            return;
        }

        const pathChanged = path !== undefined && path !== previousState.currentPath;
        const wasWebPage = previousState.isWebPageFile;
        const diagnostics = nextDocument.isWebPageFile
            ? WebPageSchemaValidator.validate(nextDocument)
            : [];
        const selectedNodeId = previousState.selectedNodeId && nextDocument.nodeIds.includes(previousState.selectedNodeId)
            ? previousState.selectedNodeId
            : null;
        const shouldAutoActivate = pathChanged && nextDocument.isWebPageFile;

        this.state = {
            ...previousState,
            isWebPageFile: nextDocument.isWebPageFile,
            isActive: shouldAutoActivate
                ? true
                : previousState.isActive && nextDocument.isWebPageFile,
            currentPath: path ?? previousState.currentPath ?? null,
            document: nextDocument.isWebPageFile ? nextDocument : null,
            diagnostics,
            selectedNodeId,
        };

        if (this.state.isActive && !nextDocument.isWebPageFile) {
            this.state = {
                ...this.state,
                isActive: false,
                diagnostics: [],
                selectedNodeId: null,
            };
        }

        if (pathChanged && wasWebPage !== nextDocument.isWebPageFile) {
            this.context.logger.info(
                `web-page document state changed: ${path ?? 'unknown'} -> ${nextDocument.isWebPageFile ? 'web-page' : 'non-web-page'}`,
            );
        }

        this.notify();
    }

    private applyPatchedDocument(result: WebPageSourcePatchResult, successMessage: string): WebPageWritebackStatus {
        if (!result.ok || !result.content) {
            return {
                ok: false,
                message: result.message ?? '源码回写失败。',
            };
        }

        if (!this.editorView) {
            return {
                ok: false,
                message: '当前没有可写入的编辑器视图，无法执行源码回写。',
            };
        }

        const view = this.editorView;
        view.dispatch({
            changes: {
                from: 0,
                to: view.state.doc.length,
                insert: result.content,
            },
        });
        this.handleContentChange(result.content, this.state.currentPath ?? undefined);
        this.context.logger.info(successMessage);

        return {
            ok: true,
            message: successMessage,
        };
    }

    private async tryRecoverDocument(
        content: string,
        path: string,
        previousState: WebPageViewState,
    ): Promise<WebPageDocumentModel | null> {
        if (!this.shouldRecoverFromPartialContent(content, path, previousState)) {
            return null;
        }

        const diskDocument = await this.readDiskDocument(path);
        if (diskDocument?.isWebPageFile && diskDocument.frontmatterRaw) {
            return WebPageDocumentParser.parse(`${diskDocument.frontmatterRaw}${content}`);
        }

        if (previousState.isWebPageFile && previousState.document) {
            return previousState.document;
        }

        return null;
    }

    private shouldRecoverFromPartialContent(
        content: string,
        path: string,
        previousState: WebPageViewState,
    ): boolean {
        const samePathAsCurrent = path === previousState.currentPath;
        if (!samePathAsCurrent || !previousState.isWebPageFile) {
            return this.looksLikeWebPageBody(content);
        }

        const { raw } = WebPageDocumentParser.parseFrontmatter(content);
        if (raw) {
            return false;
        }

        const trimmed = content.trim();
        if (trimmed.length === 0) {
            return true;
        }

        return this.looksLikeWebPageSections(content);
    }

    private async readDiskDocument(path: string): Promise<WebPageDocumentModel | null> {
        const fileSystem = this.context.getService<IFileSystemProbe>(ServiceId.FILE_SYSTEM);
        const diskContent = await fileSystem?.readFile?.(path).catch(() => '');
        return diskContent ? WebPageDocumentParser.parse(diskContent) : null;
    }

    private looksLikeWebPageBody(content: string): boolean {
        return /<template>[\s\S]*<\/template>/i.test(content);
    }

    private looksLikeWebPageSections(content: string): boolean {
        return /<(template|style|script)>[\s\S]*<\/(template|style|script)>/i.test(content);
    }
}
