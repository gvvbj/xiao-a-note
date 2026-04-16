/**
 * AnchorLinkService — 文档内锚点跳转服务
 * 
 * 职责：拦截锚点链接点击，查找文档内匹配的标题并滚动跳转。
 * 
 * 匹配策略（优先级从高到低）：
 * 1. 显式 {#custom-id} 精确匹配
 * 2. 标题文本 slug 化匹配（兼容 GitHub / VS Code 规则）
 * 
 * 遵循原则:
 * - 零硬编码: 使用常量和类型，slug 规则集中定义
 * - 单一职责: 仅负责锚点查找与跳转
 */

import { EditorView } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { parseHeadingId } from './HeadingIdParser';

/** 标题节点类型前缀 */
const HEADING_PREFIX = 'ATXHeading';

/** 回到顶部的保留锚点 ID（兼容 HTML 标准 `<a href="#top">` 行为） */
const TOP_ANCHOR_ID = 'top';

/** 匹配行首 Markdown 标题标记（# ~ ######） */
const HEADING_MARK_PATTERN = /^#{1,6}\s+/;

/**
 * 将标题文本转为 URL-safe slug
 * 
 * 规则（兼容 GitHub / VS Code）：
 * - 保留中文、日文、韩文等 Unicode 字母
 * - 空格和连续空白 → 单个连字符 `-`
 * - 移除除字母、数字、连字符、下划线以外的特殊字符
 * - 全部转小写
 * - 移除首尾连字符
 * 
 * @param text - 原始标题文本
 * @returns slug 化后的字符串
 * 
 * @example
 * slugify('第 1 章：快速开始') // → '第-1-章快速开始'
 * slugify('3.4 状态管理最佳实践') // → '34-状态管理最佳实践'
 */
export function slugify(text: string): string {
    return text
        .trim()
        .toLowerCase()
        // 将空白字符替换为连字符
        .replace(/\s+/g, '-')
        // 移除非字母、非数字、非连字符、非下划线的 ASCII 特殊字符
        // 保留 Unicode 字母（中文、日文等）
        .replace(/[^\p{L}\p{N}_-]/gu, '')
        // 合并连续连字符
        .replace(/-{2,}/g, '-')
        // 移除首尾连字符
        .replace(/^-+|-+$/g, '');
}

/**
 * 从标题行文本中提取纯标题内容
 * 
 * 移除 Markdown 标题标记（`## `）和尾部 `{#id}` 标记
 * 
 * @param lineText - 标题行的完整文本
 * @returns 纯标题文本
 * 
 * @example
 * extractHeadingText('## 第 1 章：快速开始') // → '第 1 章：快速开始'
 * extractHeadingText('### My Title {#my-id}') // → 'My Title'
 */
export function extractHeadingText(lineText: string): string {
    return lineText
        // 移除标题标记 (## )
        .replace(HEADING_MARK_PATTERN, '')
        // 移除尾部 {#id} 标记
        .replace(/\s*\{#[^\}]+\}\s*$/, '')
        .trim();
}

/**
 * 在编辑器文档中查找匹配指定锚点 ID 的标题行
 * 
 * 匹配策略：
 * 1. 优先通过显式 {#custom-id} 精确匹配
 * 2. 回退通过标题文本 slug 化匹配（兼容无显式 ID 的标题）
 * 
 * @param view - CodeMirror 编辑器视图
 * @param targetId - 目标锚点 ID（不含 #）
 * @returns 标题行的起始位置，未找到返回 -1
 */
export function findHeadingById(view: EditorView, targetId: string): number {
    const { state } = view;
    const tree = syntaxTree(state);

    /** 显式 {#id} 精确匹配结果 */
    let exactMatchPos = -1;
    /** slug 化标题文本回退匹配结果 */
    let slugMatchPos = -1;

    tree.iterate({
        enter: (node) => {
            // 仅处理标题节点
            if (!node.name.startsWith(HEADING_PREFIX)) return;

            const line = state.doc.lineAt(node.from);
            const result = parseHeadingId(line.text, line.from);

            // 优先级 1: 显式 {#id} 精确匹配 → 立即返回
            if (result && result.id === targetId) {
                exactMatchPos = node.from;
                return false; // 停止遍历
            }

            // 优先级 2: 标题文本 slug 化匹配（仅记录首次匹配）
            if (slugMatchPos < 0) {
                const headingText = extractHeadingText(line.text);
                if (slugify(headingText) === targetId) {
                    slugMatchPos = node.from;
                }
            }
        }
    });

    // 精确匹配优先，slug 匹配作为回退
    return exactMatchPos >= 0 ? exactMatchPos : slugMatchPos;
}

/**
 * 跳转到指定锚点 ID 对应的标题
 * 
 * 特殊处理：`#top` 锚点始终跳转到文档顶部（兼容 HTML 标准行为），
 * 除非文档中存在显式 `{#top}` 标题。
 * 
 * @param view - CodeMirror 编辑器视图
 * @param targetId - 目标锚点 ID（不含 #）
 * @returns 是否成功跳转
 */
export function scrollToAnchor(view: EditorView, targetId: string): boolean {
    const pos = findHeadingById(view, targetId);

    // #top 回到顶部（仅当文档中未找到匹配标题时触发）
    const scrollPos = pos >= 0 ? pos : (targetId === TOP_ANCHOR_ID ? 0 : -1);
    if (scrollPos < 0) return false;

    // 滚动并将光标移动到目标位置
    view.dispatch({
        selection: { anchor: scrollPos },
        effects: EditorView.scrollIntoView(scrollPos, { y: 'start', yMargin: 50 }),
    });
    view.focus();

    return true;
}

/**
 * 判断 URL 是否为文档内锚点链接
 * 
 * @param url - URL 字符串
 * @returns 锚点 ID（不含 #），非锚点链接返回 null
 */
export function extractAnchorId(url: string): string | null {
    if (!url || !url.startsWith('#')) return null;
    const id = url.substring(1).trim();
    return id.length > 0 ? id : null;
}
