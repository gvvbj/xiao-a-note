/**
 * HTMLTagParser — HTML 内联标签解析器
 * 
 * 职责：扫描文本中的 HTML 内联标签，匹配白名单标签后
 * 返回用于 CodeMirror 装饰的位置和样式信息。
 * 
 * 遵循原则:
 * - 零硬编码: 标签白名单来自 HTMLConstants
 * - 安全优先: CSS 过滤通过 CSSWhitelist
 * - 单一职责: 仅负责解析和生成装饰，不负责注册
 */

import { Decoration } from '@codemirror/view';
import { EditorState, Range } from '@codemirror/state';
import { ALLOWED_TAGS, HTML_TAG_CLASS_MAP, STYLE_CAPABLE_TAGS } from '../constants/HTMLConstants';
import { filterCSS } from './CSSWhitelist';

/**
 * 内联 HTML 标签匹配结果
 */
interface IHTMLTagMatch {
    /** 开始标签的起始位置（文档绝对偏移） */
    openFrom: number;
    /** 开始标签的结束位置 */
    openTo: number;
    /** 内容的起始位置 */
    contentFrom: number;
    /** 内容的结束位置 */
    contentTo: number;
    /** 结束标签的起始位置 */
    closeFrom: number;
    /** 结束标签的结束位置 */
    closeTo: number;
    /** 小写标签名 */
    tagName: string;
    /** 解析后的 style 属性值（仅 span 标签） */
    filteredStyle: string | null;
    /** title 属性值（仅 abbr 标签） */
    title: string | null;
}

/**
 * 构建匹配 HTML 标签的正则表达式
 * 
 * 匹配模式：<tag ...>content</tag>
 * - 支持自定义属性（style, title 等）
 * - 不支持嵌套（同类型标签不能嵌套）
 * - 不支持跨行（内联标签在同一行内完成）
 */
function buildTagPattern(): RegExp {
    const tagList = [...ALLOWED_TAGS, ...STYLE_CAPABLE_TAGS].join('|');
    // 匹配 <tag>content</tag> 或 <tag attr="value">content</tag>
    // 捕获组：1=标签名, 2=属性部分, 3=内容
    return new RegExp(
        `<(${tagList})(\\s[^>]*)?>([\\s\\S]*?)<\\/\\1>`,
        'gi'
    );
}

/** 提取 style 属性值 */
function extractStyleAttr(attrString: string | undefined): string | null {
    if (!attrString) return null;
    const match = /\bstyle\s*=\s*"([^"]*)"/.exec(attrString) ||
        /\bstyle\s*=\s*'([^']*)'/.exec(attrString);
    return match ? match[1] : null;
}

/** 提取 title 属性值 */
function extractTitleAttr(attrString: string | undefined): string | null {
    if (!attrString) return null;
    const match = /\btitle\s*=\s*"([^"]*)"/.exec(attrString) ||
        /\btitle\s*=\s*'([^']*)'/.exec(attrString);
    return match ? match[1] : null;
}

/**
 * 解析文本中的所有 HTML 内联标签
 * 
 * @param text - 要扫描的文本
 * @param baseOffset - 文本在文档中的绝对偏移
 * @returns 匹配结果列表
 */
function parseHTMLTags(text: string, baseOffset: number): IHTMLTagMatch[] {
    const pattern = buildTagPattern();
    const matches: IHTMLTagMatch[] = [];
    let m: RegExpExecArray | null;

    while ((m = pattern.exec(text)) !== null) {
        const fullMatch = m[0];
        const tagName = m[1].toLowerCase();
        const attrPart = m[2];      // 可能是 undefined
        const content = m[3];

        const matchStart = baseOffset + m.index;

        // 计算开始标签的范围
        const openTagLength = fullMatch.length - content.length - `</${m[1]}>`.length;
        const openFrom = matchStart;
        const openTo = matchStart + openTagLength;

        // 计算内容范围
        const contentFrom = openTo;
        const contentTo = contentFrom + content.length;

        // 计算结束标签范围
        const closeFrom = contentTo;
        const closeTo = matchStart + fullMatch.length;

        // 处理 style 属性（仅 span 标签）
        let filteredStyle: string | null = null;
        if (STYLE_CAPABLE_TAGS.has(tagName)) {
            const rawStyle = extractStyleAttr(attrPart);
            if (rawStyle) {
                filteredStyle = filterCSS(rawStyle);
            }
            // span 标签若无有效 style，不渲染
            if (!filteredStyle) continue;
        }

        // 处理 title 属性（abbr 标签）
        const title = tagName === 'abbr' ? extractTitleAttr(attrPart) : null;

        matches.push({
            openFrom, openTo,
            contentFrom, contentTo,
            closeFrom, closeTo,
            tagName,
            filteredStyle,
            title,
        });
    }

    return matches;
}

/**
 * 为解析出的 HTML 标签生成 CodeMirror 装饰
 * 
 * @param text - 节点文本
 * @param baseOffset - 节点在文档中的偏移
 * @param state - 编辑器状态
 * @param isRangeActive - 判断当前范围是否活跃的回调
 * @returns CodeMirror 装饰列表
 */
export function buildHTMLDecorations(
    text: string,
    baseOffset: number,
    state: EditorState,
    isRangeActive: (from: number, to: number) => boolean
): Range<Decoration>[] {
    const matches = parseHTMLTags(text, baseOffset);
    const decorations: Range<Decoration>[] = [];

    for (const m of matches) {
        // 光标在此范围内时不隐藏，让用户编辑源码
        if (isRangeActive(m.openFrom, m.closeTo)) continue;

        // 确保所有位置在文档范围内
        if (m.closeTo > state.doc.length) continue;

        // 隐藏开始标签
        decorations.push(
            Decoration.mark({ class: 'cm-soft-hide' }).range(m.openFrom, m.openTo)
        );

        // 隐藏结束标签
        decorations.push(
            Decoration.mark({ class: 'cm-soft-hide' }).range(m.closeFrom, m.closeTo)
        );

        // 内容区域应用样式
        if (m.contentFrom < m.contentTo) {
            if (m.filteredStyle) {
                // span + style：应用过滤后的内联样式
                decorations.push(
                    Decoration.mark({
                        attributes: { style: m.filteredStyle },
                    }).range(m.contentFrom, m.contentTo)
                );
            } else {
                // 标准标签：应用 CSS class
                const cssClass = HTML_TAG_CLASS_MAP[m.tagName];
                if (cssClass) {
                    const attrs: Record<string, string> = {};
                    if (m.title) attrs['title'] = m.title;

                    decorations.push(
                        Decoration.mark({
                            class: cssClass,
                            attributes: Object.keys(attrs).length > 0 ? attrs : undefined,
                        }).range(m.contentFrom, m.contentTo)
                    );
                }
            }
        }
    }

    return decorations;
}
