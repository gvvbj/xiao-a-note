import { EditorView, keymap } from '@codemirror/view';
import { Prec, Extension, Transaction } from '@codemirror/state';
import { ICommandDefinition } from '@/kernel/system/plugin/types';
import { insertNewlineContinueMarkup } from '@codemirror/lang-markdown';

/**
 * 文本包裹辅助函数
 * 用于加粗、斜体、删除线等格式
 */
export function wrapText(view: EditorView, symbol: string): void {
    const { state, dispatch } = view;
    const { from, to } = state.selection.main;
    const rawText = state.sliceDoc(from, to);
    const selectedText = rawText.trim();

    if (!selectedText) {
        const placeholder = symbol === '~~' ? '删除线文字' :
            symbol === '**' ? '加粗文字' :
                symbol === '*' ? '斜体文字' :
                    symbol === '`' ? '代码' : '';

        const insert = `${symbol}${placeholder}${symbol}`;
        dispatch({
            changes: { from, to, insert },
            selection: {
                anchor: from + symbol.length,
                head: from + symbol.length + placeholder.length
            },
            annotations: Transaction.userEvent.of('input')
        });
        view.focus();
        return;
    }

    const startOffset = rawText.indexOf(selectedText);
    const endOffset = startOffset + selectedText.length;
    const prefix = rawText.substring(0, startOffset);
    const suffix = rawText.substring(endOffset);

    const insert = `${prefix}${symbol}${selectedText}${symbol}${suffix}`;

    dispatch({
        changes: { from, to, insert },
        selection: {
            anchor: from + prefix.length + symbol.length,
            head: from + prefix.length + symbol.length + selectedText.length
        },
        annotations: Transaction.userEvent.of('input')
    });
    view.focus();
}

/**
 * 行前缀切换辅助函数
 * 用于标题、列表、引用等
 */
export function toggleLinePrefix(view: EditorView, prefix: string): void {
    const { state, dispatch } = view;
    const { from } = state.selection.main;
    const line = state.doc.lineAt(from);
    if (line.text.startsWith(prefix)) {
        dispatch({
            changes: { from: line.from, to: line.from + prefix.length, insert: '' },
            annotations: Transaction.userEvent.of('input')
        });
    } else {
        dispatch({
            changes: { from: line.from, to: line.from, insert: prefix },
            selection: { anchor: from + prefix.length },
            annotations: Transaction.userEvent.of('input')
        });
    }
    view.focus();
}

// [Refactored] handleEnter 已移除。
// 理由：Markdown 列表延续逻辑现在由 config/keymap.ts 统一通过官方 insertNewlineContinueMarkup 处理。
// 移除此处的冗余逻辑可解决快捷键冲突和内容推移 Bug。

/**
 * 退格键处理逻辑
 * 智能清除空样式标记
 */
export function handleBackspace(view: EditorView): boolean {
    const { state, dispatch } = view;
    const { from, empty } = state.selection.main;
    if (!empty) return false;

    const line = state.doc.lineAt(from);

    // 1. 引用块删除残留处理
    if (line.text === "> " && from === line.to) {
        dispatch({ changes: { from: line.from, to: line.to, insert: "" } });
        return true;
    }

    // 2. 智能清除空样式
    const checkStyles = [
        { symbol: '~~', len: 2 },
        { symbol: '**', len: 2 },
        { symbol: '*', len: 1 },
        { symbol: '`', len: 1 }
    ];

    for (const style of checkStyles) {
        const before = state.sliceDoc(from - style.len, from);
        const after = state.sliceDoc(from, from + style.len);
        if (before === style.symbol && after === style.symbol) {
            dispatch({
                changes: { from: from - style.len, to: from + style.len, insert: "" },
                selection: { anchor: from - style.len },
                annotations: Transaction.userEvent.of('input.type.backspace')
            });
            return true;
        }
    }

    return false;
}

/**
 * 获取 Markdown 核心命令定义
 */
export function getMarkdownCommands(): ICommandDefinition[] {
    return [
        { id: 'BOLD', title: '加粗', category: '编辑器', handler: (view) => wrapText(view, '**') },
        { id: 'ITALIC', title: '斜体', category: '编辑器', handler: (view) => wrapText(view, '*') },
        { id: 'STRIKE', title: '删除线', category: '编辑器', handler: (view) => wrapText(view, '~~') },
        { id: 'CODE', title: '行内代码', category: '编辑器', handler: (view) => wrapText(view, '`') },
        { id: 'H1', title: '一级标题', category: '编辑器', handler: (view) => toggleLinePrefix(view, '# ') },
        { id: 'H2', title: '二级标题', category: '编辑器', handler: (view) => toggleLinePrefix(view, '## ') },
        { id: 'H3', title: '三级标题', category: '编辑器', handler: (view) => toggleLinePrefix(view, '### ') },
        { id: 'UL', title: '无序列表', category: '编辑器', handler: (view) => toggleLinePrefix(view, '- ') },
        { id: 'OL', title: '有序列表', category: '编辑器', handler: (view) => toggleLinePrefix(view, '1. ') },
        { id: 'TASK', title: '任务列表', category: '编辑器', handler: (view) => toggleLinePrefix(view, '- [ ] ') },
        { id: 'QUOTE', title: '引用', category: '编辑器', handler: (view) => toggleLinePrefix(view, '> ') },
    ];
}

/**
 * 获取 Markdown 核心按键映射
 */
export function getMarkdownKeymap(): Extension {
    return Prec.highest(keymap.of([
        // Enter 由全局 config/keymap.ts 处理
        { key: "Backspace", run: (view) => handleBackspace(view) }
    ]));
}
