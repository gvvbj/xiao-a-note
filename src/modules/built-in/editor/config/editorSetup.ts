import { EditorView } from '@codemirror/view';
import { Annotation } from '@codemirror/state';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { json } from '@codemirror/lang-json';
import { syntaxTree } from "@codemirror/language";
import { SyntaxNode } from "@lezer/common";
import { createEditorKeymap } from './keymap';

// Annotation to mark sync transactions that should not trigger "unsaved" state
export const syncFromSave = Annotation.define<boolean>();

interface EditorSetupOptions {
    handlePaste: (e: ClipboardEvent, view: EditorView) => void;
    handleClick: (e: MouseEvent, view: EditorView) => boolean;
    onUpdate: (content: string) => void;
    onActiveStateChange?: (states: Record<string, boolean>) => void;
}

export const createEditorSetup = (options: EditorSetupOptions) => {
    const { handlePaste, handleClick, onUpdate, onActiveStateChange } = options;

    const eventHandlers = EditorView.domEventHandlers({
        paste: (event, view) => { handlePaste(event, view); },
        mousedown: (e, view) => {
            if (handleClick(e, view)) {
                e.preventDefault();
            }
            return false;
        }
    });

    const stateListener = EditorView.updateListener.of((update) => {
        // Skip onUpdate if this is a sync transaction (e.g., from SYNC_EDITOR_CONTENT after save)
        const isSync = update.transactions.some(tr => tr.annotation(syncFromSave));
        if (update.docChanged && !isSync) {
            onUpdate(update.state.doc.toString());
        }
        if (update.selectionSet || update.docChanged) {
            if (onActiveStateChange) {
                const { state } = update.view;
                if (!state.selection) return;
                const { from } = state.selection.main;

                // === 修复：正确获取光标处的所有语法节点 ===
                const active: Record<string, boolean> = {};
                let node: SyntaxNode | null = syntaxTree(state).resolveInner(from, -1);

                // 向上遍历父节点，收集所有激活的状态
                while (node) {
                    active[node.name] = true;
                    // 特殊处理标题
                    if (node.name.startsWith("ATXHeading")) active["Heading"] = true;
                    node = node.parent;
                }

                onActiveStateChange(active);
            }
        }
    });

    // 自定义选区样式，确保代码块中选区可见
    const selectionTheme = EditorView.theme({
        ".cm-selectionBackground": {
            backgroundColor: "rgba(100, 150, 255, 0.4) !important"
        },
        ".cm-codeblock-line .cm-selectionBackground": {
            backgroundColor: "rgba(100, 150, 255, 0.5) !important"
        },
        "&.cm-focused .cm-selectionBackground": {
            backgroundColor: "rgba(100, 150, 255, 0.4) !important"
        }
    });

    return [
        markdown({
            base: markdownLanguage,
            codeLanguages: languages
        }),
        // Add language support extensions directly
        javascript(),
        python(),
        css(),
        html(),
        json(),
        EditorView.lineWrapping,
        createEditorKeymap(),
        eventHandlers,
        stateListener,
        selectionTheme
    ];
};