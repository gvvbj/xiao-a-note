import { Decoration, keymap } from '@codemirror/view';
import { Prec, Range, Transaction } from '@codemirror/state';
import { IPlugin, PluginCategory, IPluginContext } from '@/kernel/system/plugin/types';
import { SyntaxNodeRef } from '@lezer/common';
import { syntaxTree } from "@codemirror/language";
import { IDecorationContext } from '../../../../registries/MarkdownDecorationRegistry';
import { CodeBlockHeaderWidget } from './widgets/CodeBlockWidgets';
import { CODEBLOCK_CSS } from './styles/CodeBlockStyles';

/**
 * 代码块支持插件
 * 职责：
 * 1. 提供代码块装饰器（头部 Widget + 背景样式）
 * 2. 注册代码块相关快捷键
 * 
 * 注意：本文件仅负责注册，Widget 逻辑在 widgets/CodeBlockWidgets.ts
 */
export default class CodeBlockPlugin implements IPlugin {
    id = 'codeblock-support';
    name = 'CodeBlock Support';
    version = '1.1.0';
    category = PluginCategory.EDITOR;
    internal = true;
    order = 11;

    activate(context: IPluginContext) {
        // 1. 注册样式
        context.registerStyle('codeblock', CODEBLOCK_CSS);

        // 2. 注册装饰器
        context.registerMarkdownDecorationProvider({
            nodeTypes: ['FencedCode'],
            render: (node: SyntaxNodeRef, { state, isLineActive }: IDecorationContext) => {
                const builder: Range<Decoration>[] = [];
                const { from, to } = node;
                const firstLine = state.doc.lineAt(from);
                const endLine = state.doc.lineAt(to);
                const hasClosingFence = endLine.number > firstLine.number && endLine.text.trim().startsWith("```");
                const isHeaderActive = isLineActive(from);

                if (hasClosingFence && !isHeaderActive) {
                    const langMatch = firstLine.text.match(/^```(\w*)/);
                    const language = langMatch ? langMatch[1] : "";
                    const codeStart = firstLine.to + 1;
                    const codeEnd = endLine.from - 1;
                    const codeContent = codeStart < codeEnd ? state.sliceDoc(codeStart, codeEnd) : "";

                    builder.push(Decoration.widget({
                        widget: new CodeBlockHeaderWidget(language, codeContent, firstLine.from),
                        block: true,
                        side: -1
                    }).range(firstLine.from));
                }

                if (hasClosingFence) {
                    for (let l = firstLine.number; l <= endLine.number; l++) {
                        if (l > state.doc.lines) break;
                        const line = state.doc.line(l);
                        let lineClass = "cm-codeblock-line";
                        if (l === firstLine.number) lineClass += " cm-codeblock-first";
                        if (l === endLine.number) lineClass += " cm-codeblock-last";
                        builder.push(Decoration.line({ class: lineClass }).range(line.from));
                    }
                }

                if (!isHeaderActive) {
                    builder.push(Decoration.mark({ class: "cm-soft-hide" }).range(firstLine.from, firstLine.to));
                }
                if (hasClosingFence && !isLineActive(endLine.from)) {
                    builder.push(Decoration.mark({ class: "cm-md-mark" }).range(endLine.from, endLine.to));
                }
                return { decorations: builder };
            }
        });

        // 3. 注册快捷键
        context.registerEditorKeymap(Prec.highest(keymap.of([
            {
                key: "Enter",
                run: (view) => {
                    const { state, dispatch } = view;
                    const { from, to } = state.selection.main;
                    if (from !== to) return false;

                    const line = state.doc.lineAt(from);
                    const trimText = line.text.trim();

                    // 仅在当前行是 ``` 开头时处理
                    if (!/^```/.test(trimText)) return false;

                    // 确定性判断：扫描上方所有 ``` 行
                    // 偶数个 = 当前行是开启代码块的行
                    // 奇数个 = 当前行在已有代码块内部（可能是闭合行）
                    let fenceCountAbove = 0;
                    for (let lineNum = 1; lineNum < line.number; lineNum++) {
                        if (/^\s*```/.test(state.doc.line(lineNum).text)) {
                            fenceCountAbove++;
                        }
                    }

                    const isOpeningFence = fenceCountAbove % 2 === 0;

                    if (isOpeningFence) {
                        // 再检查下方是否已有匹配的闭合 ```
                        let hasClosingBelow = false;
                        for (let lineNum = line.number + 1; lineNum <= state.doc.lines; lineNum++) {
                            if (/^\s*```\s*$/.test(state.doc.line(lineNum).text)) {
                                hasClosingBelow = true;
                                break;
                            }
                        }

                        if (!hasClosingBelow) {
                            // 无闭合 → 自动插入闭合代码块
                            dispatch({
                                changes: { from: line.to, insert: "\n\n```" },
                                selection: { anchor: line.to + 1 },
                                annotations: Transaction.addToHistory.of(true)
                            });
                            return true;
                        }
                    }

                    return false;
                }
            },
            {
                key: "ArrowDown",
                run: (view) => {
                    const { state, dispatch } = view;
                    const head = state.selection.main.head;
                    const line = state.doc.lineAt(head);
                    const isClosingFence = /^\s*```/.test(line.text);

                    if (isClosingFence) {
                        if (line.number === state.doc.lines) {
                            dispatch({
                                changes: { from: line.to, insert: "\n" },
                                selection: { anchor: line.to + 1 }
                            });
                            return true;
                        } else {
                            const nextLine = state.doc.line(line.number + 1);
                            dispatch({ selection: { anchor: nextLine.from } });
                            return true;
                        }
                    }
                    return false;
                }
            }
        ])));
    }
}
