import { Extension } from '@codemirror/state';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { json } from '@codemirror/lang-json';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';
import { activeMatchField, allMatchesField } from '../../SearchPlugin/cm-extensions/searchHighlight';
import { excelTableTheme, editorCoreLayout } from '../../../../../cm-extensions/theme';
import { createEditorKeymap } from '../../../../../config/keymap';

/**
 * 核心编辑器扩展配置
 * 提供所有基础 CodeMirror 扩展
 */
export function getCoreExtensions(): Extension[] {
    return [
        // 主题和布局
        activeMatchField,
        allMatchesField,
        excelTableTheme,
        editorCoreLayout,

        // 语言支持
        markdown({
            base: markdownLanguage,
            codeLanguages: languages
        }),
        javascript(),
        python(),
        css(),
        html(),
        json(),

        // 行为
        EditorView.lineWrapping,

        // 历史记录 (撤销/重做)

        // 快捷键
        keymap.of([
            ...defaultKeymap
        ]),
        createEditorKeymap()
    ];
}
