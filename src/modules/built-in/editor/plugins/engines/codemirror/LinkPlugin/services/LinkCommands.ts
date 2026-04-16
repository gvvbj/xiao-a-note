import { EditorView } from '@codemirror/view';
import { Transaction } from '@codemirror/state';

/**
 * 链接命令处理器
 * 负责处理 LINK 命令的具体逻辑
 */
export function handleLinkCommand(view: EditorView, params: any): void {
    const { state, dispatch } = view;
    const { from, to } = state.selection.main;
    const rawText = state.sliceDoc(from, to);
    const selectedText = rawText.trim();

    const url = typeof params === 'string' ? params : (params?.url || '');
    if (!url) return;

    const customText = typeof params === 'object' ? params?.text : undefined;

    const startOffset = rawText.indexOf(selectedText);
    const endOffset = selectedText ? (startOffset + selectedText.length) : 0;

    const prefix = rawText.substring(0, startOffset);
    const suffix = rawText.substring(endOffset);

    const linkLabel = customText || selectedText || '链接文字';
    const linkText = `${prefix}[${linkLabel}](${url})${suffix}`;

    dispatch({
        changes: { from, to, insert: linkText },
        selection: {
            anchor: from + prefix.length + 1,
            head: from + prefix.length + 1 + linkLabel.length
        },
        annotations: Transaction.userEvent.of('input')
    });
    view.focus();
}
