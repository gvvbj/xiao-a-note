import { keymap } from '@codemirror/view';
import { Prec, Transaction } from '@codemirror/state';
import { indentMore, insertNewlineAndIndent } from "@codemirror/commands";
import { insertNewlineContinueMarkup } from '@codemirror/lang-markdown';

export const createEditorKeymap = () => {
    // 使用 Prec.highest 确保我们的键位映射优先级最高，覆盖 CodeMirror 或浏览器的默认行为
    return Prec.highest(keymap.of([
        // === 1. Tab 键处理 ===
        {
            key: "Tab",
            run: (view) => {
                // 如果焦点在表格组件内，不执行全局 Tab 逻辑，让渡给组件自身的事件监听器
                if (document.activeElement?.closest('.cm-table-widget')) {
                    return false;
                }
                const { state, dispatch } = view;
                const { from, empty } = state.selection.main;

                if (empty) {
                    // 光标向后移动 1 位
                    dispatch({
                        changes: { from, insert: "\t" },
                        selection: { anchor: from + 1 }
                    });
                } else {
                    // 有选区时：执行整块缩进
                    indentMore(view);
                }
                // 返回 true 表示拦截此事件，防止焦点跳出编辑器 (浏览器默认行为)
                return true;
            },
            preventDefault: true // 显式阻止默认行为
        },

        // === 2. Enter 键处理 ===
        // 列表行为由正则确定性处理，不依赖 insertNewlineContinueMarkup 的语法树
        // 仅在引用块场景下回退到 insertNewlineContinueMarkup
        {
            key: "Enter",
            run: (view) => {
                const { state } = view;
                const { from, to } = state.selection.main;
                if (from !== to) return false;

                const line = state.doc.lineAt(from);
                const text = line.text;

                // 匹配列表标记（支持缩进、任务列表、有序列表）
                // 注意：任务列表模式必须在普通列表之前匹配，避免 `- ` 提前消费 `- [ ] `
                const listMatch = text.match(/^(\s*)([-*+]\s\[[ xX]\]\s|[-*+]\s|(\d+)[.)]\s)/);

                if (listMatch) {
                    const indent = listMatch[1];
                    const marker = listMatch[2];
                    const fullPrefix = indent + marker;
                    const contentAfterPrefix = text.slice(fullPrefix.length);

                    if (!contentAfterPrefix.trim()) {
                        // 空列表项 → 移除前缀，中断列表
                        view.dispatch({
                            changes: { from: line.from, to: line.to, insert: '' },
                            selection: { anchor: line.from },
                            annotations: Transaction.userEvent.of('input')
                        });
                        return true;
                    }

                    // 有内容 → 在下一行继续列表
                    let nextMarker = marker;
                    if (listMatch[3]) {
                        // 有序列表 → 递增编号
                        const nextNum = parseInt(listMatch[3]) + 1;
                        nextMarker = marker.replace(/\d+/, String(nextNum));

                        // 收集后续连续有序列表行的序号更新
                        const changes: { from: number; to: number; insert: string }[] = [];
                        const insertText = '\n' + indent + nextMarker;
                        changes.push({ from, to: from, insert: insertText });

                        // 扫描后续行，更新连续有序列表的序号
                        let renumberNum = nextNum + 1;
                        for (let lineNum = line.number + 1; lineNum <= state.doc.lines; lineNum++) {
                            const nextLine = state.doc.line(lineNum);
                            const nextMatch = nextLine.text.match(/^(\s*)((\d+)([.)]))\s/);
                            if (!nextMatch) break; // 非有序列表行，停止
                            if (nextMatch[1] !== indent) break; // 缩进不同，不属于同一层级

                            const oldNumStr = nextMatch[3];
                            const separator = nextMatch[4]; // '.' or ')'
                            const newNumStr = String(renumberNum);
                            if (oldNumStr !== newNumStr) {
                                const numFrom = nextLine.from + indent.length;
                                const numTo = numFrom + oldNumStr.length;
                                changes.push({ from: numFrom, to: numTo, insert: newNumStr });
                            }
                            renumberNum++;
                        }

                        view.dispatch({
                            changes,
                            selection: { anchor: from + insertText.length },
                            annotations: Transaction.userEvent.of('input')
                        });
                        return true;
                    }
                    // 任务列表 → 重置复选框为未选中
                    nextMarker = nextMarker.replace(/\[[xX]\]/, '[ ]');

                    const insertText = '\n' + indent + nextMarker;
                    view.dispatch({
                        changes: { from, insert: insertText },
                        selection: { anchor: from + insertText.length },
                        annotations: Transaction.userEvent.of('input')
                    });
                    return true;
                }

                // 引用块交给 insertNewlineContinueMarkup 处理（其对引用块的语法树依赖较可靠）
                const trimmed = text.trimStart();
                if (/^>\s/.test(trimmed) && insertNewlineContinueMarkup(view)) return true;

                return insertNewlineAndIndent(view);
            }
        },

        // === 5. 禁用内置搜索快捷键 (因为使用了自定义搜索面板) ===
        { key: "Mod-f", run: () => true },
        { key: "Mod-h", run: () => true },
        { key: "Mod-g", run: () => true },
        { key: "Shift-Mod-g", run: () => true },
        { key: "Mod-Alt-f", run: () => true }
    ]));
};