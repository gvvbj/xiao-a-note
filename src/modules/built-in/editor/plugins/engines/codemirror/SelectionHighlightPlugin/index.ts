import { IPlugin, PluginCategory, IPluginContext } from '@/kernel/system/plugin/types';
import { highlightSelectionMatches } from '@codemirror/search';

/**
 * SelectionHighlightPlugin
 * 
 * 职责：
 * 选中文本后，文档中所有相同内容自动高亮显示
 * 
 * 实现：
 * 注册 CodeMirror 的 highlightSelectionMatches 扩展 + 自定义高亮样式
 */
export default class SelectionHighlightPlugin implements IPlugin {
    id = 'selection-highlight';
    readonly name = 'Selection Highlight';
    readonly category = PluginCategory.CORE;
    readonly internal = true;
    readonly order = 15;
    readonly description = 'Highlights all occurrences of selected text in the document.';
    version = '1.0.0';
    readonly essential = true;

    activate(context: IPluginContext) {
        // 1. 注册 CodeMirror 扩展：选中匹配高亮
        context.registerEditorExtension(
            highlightSelectionMatches({
                // 最少选中 2 个字符才触发高亮（避免单字符噪音）
                minSelectionLength: 2,
                // 高亮全词匹配（wholeWords 仅在纯字母时生效，中文自动按选区匹配）
                wholeWords: false,
            })
        );

        // 2. 注册高亮样式
        context.registerStyle('selection-highlight', SELECTION_HIGHLIGHT_CSS);
    }
}

/**
 * 选中匹配高亮样式
 * 
 * .cm-selectionMatch 是 CodeMirror highlightSelectionMatches 生成的 class
 */
const SELECTION_HIGHLIGHT_CSS = `
.cm-selectionMatch {
    background-color: var(--selection-highlight-bg, rgba(255, 215, 0, 0.3));
    border-radius: 2px;
    box-shadow: 0 0 0 1px var(--selection-highlight-border, rgba(255, 215, 0, 0.4));
}

/* 暗色主题适配 */
.dark .cm-selectionMatch {
    background-color: var(--selection-highlight-bg, rgba(255, 215, 0, 0.2));
    box-shadow: 0 0 0 1px var(--selection-highlight-border, rgba(255, 215, 0, 0.3));
}
`;
