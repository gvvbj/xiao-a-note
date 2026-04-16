/**
 * MathParser - 数学公式解析器
 * 
 * 从 index.ts 剥离的解析逻辑
 * 
 * 职责:
 * 1. 解析块级公式 ($$ ... $$)
 * 2. 解析行内公式 ($ ... $)
 */

import { EditorState } from '@codemirror/state';
import { Decoration } from '@codemirror/view';
import { Range as CMRange } from '@codemirror/state';
import { MathWidget } from '../widgets/MathWidgets';

export interface MathParseResult {
    decorations: CMRange<Decoration>[];
}

export class MathParser {
    /**
     * 解析文本中的数学公式
     */
    parse(
        text: string,
        from: number,
        state: EditorState,
        isRangeActive: (from: number, to: number) => boolean,
        sourceName: string
    ): CMRange<Decoration>[] {
        const builder: CMRange<Decoration>[] = [];

        // 1. Block Math ($$ ... $$)
        this.parseBlockMath(text, from, state, isRangeActive, sourceName, builder);

        // 2. Inline Math ($...$)
        this.parseInlineMath(text, from, isRangeActive, sourceName, builder);

        return builder;
    }

    /**
     * 解析块级公式
     */
    private parseBlockMath(
        text: string,
        from: number,
        state: EditorState,
        isRangeActive: (from: number, to: number) => boolean,
        sourceName: string,
        builder: CMRange<Decoration>[]
    ): void {
        const blockRegex = /\$\$(.+?)\$\$/gs;
        let match;

        while ((match = blockRegex.exec(text)) !== null) {
            const mStart = from + match.index;
            const mEnd = mStart + match[0].length;

            const lineStart = state.doc.lineAt(mStart);
            const lineEnd = state.doc.lineAt(mEnd);
            const isFullLine = lineStart.text.trim() === match[0] && lineEnd.text.trim().endsWith('$$');

            if (!isRangeActive(mStart, mEnd)) {
                if (isFullLine) {
                    const replaceEnd = lineEnd.to < state.doc.length ? lineEnd.to + 1 : lineEnd.to;
                    builder.push(Decoration.replace({
                        widget: new MathWidget(match[1].trim(), true, sourceName),
                        block: true
                    }).range(lineStart.from, replaceEnd));
                } else {
                    builder.push(Decoration.replace({
                        widget: new MathWidget(match[1].trim(), true, sourceName)
                    }).range(mStart, mEnd));
                }
            } else {
                builder.push(Decoration.mark({ class: "cm-math-bg" }).range(mStart, mEnd));
            }
        }
    }

    /**
     * 解析行内公式
     */
    private parseInlineMath(
        text: string,
        from: number,
        isRangeActive: (from: number, to: number) => boolean,
        sourceName: string,
        builder: CMRange<Decoration>[]
    ): void {
        const inlineRegex = /(?<!\$)\$(?!\$)([^$\n]+)(?<!\$)\$(?!\$)/g;
        let match;

        while ((match = inlineRegex.exec(text)) !== null) {
            const mContent = match[1];
            if (!mContent || mContent.trim().length === 0) continue;

            const mStart = from + match.index;
            const mEnd = mStart + match[0].length;

            // 跳过已被块级公式覆盖的范围
            if (builder.some(r => r.from <= mStart && r.to >= mEnd)) continue;

            if (!isRangeActive(mStart, mEnd)) {
                builder.push(Decoration.replace({
                    widget: new MathWidget(mContent.trim(), false, sourceName)
                }).range(mStart, mEnd));
            } else {
                builder.push(Decoration.mark({ class: "cm-math-bg" }).range(mStart, mEnd));
            }
        }
    }
}

// 单例导出
export const mathParser = new MathParser();
