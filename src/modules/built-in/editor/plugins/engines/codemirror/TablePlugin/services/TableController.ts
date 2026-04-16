/**
 * TableController - 表格控制器
 * 
 * 从 index.ts 剥离的业务逻辑
 * 
 * 职责:
 * 1. 处理表格插入命令
 * 2. 计算插入位置和模板
 */

import { EditorView } from '@codemirror/view';

export class TableController {
    /**
     * 插入表格处理函数
     */
    insertTable(view: EditorView): void {
        const { state, dispatch } = view;
        const { from } = state.selection.main;
        const line = state.doc.lineAt(from);
        const isLineEmpty = line.text.trim() === '';
        const insertPos = isLineEmpty ? from : line.to;
        const prevLine = line.number > 1 ? state.doc.line(line.number - 1) : null;
        const isAtEnd = insertPos === state.doc.length;

        let prefix = '';
        if (!isLineEmpty) {
            prefix = '\n\n';
        } else if (prevLine && prevLine.text.trim() !== '') {
            prefix = '\n';
        }

        const suffix = '\n\n';
        const tableTemplate = `${prefix}| 列1 | 列2 | 列3 |\n|---|---|---|\n| 内容 | 内容 | 内容 |${suffix}`;

        dispatch({
            changes: { from: insertPos, insert: tableTemplate },
            selection: { anchor: insertPos + tableTemplate.length - (isAtEnd ? 1 : 0) }
        });
        view.focus();
    }
}

// 单例导出
export const tableController = new TableController();
