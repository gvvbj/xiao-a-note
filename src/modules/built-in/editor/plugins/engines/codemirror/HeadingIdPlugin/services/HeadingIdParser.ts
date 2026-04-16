/**
 * HeadingIdParser — 标题 ID 解析器
 * 
 * 职责：从标题行文本中提取 {#custom-id} 标记
 * 
 * 遵循原则:
 * - 零硬编码: 正则和常量集中管理
 * - 单一职责: 仅负责解析, 不负责装饰
 */

/** 匹配标题行末尾的 {#id} 模式（支持中文等 Unicode 字母） */
const HEADING_ID_PATTERN = /\s*\{#([\w\p{L}-]+)\}\s*$/u;

/**
 * 标题 ID 解析结果
 */
export interface IHeadingIdMatch {
    /** 提取出的 ID 值 (不含 {# }) */
    id: string;
    /** {#id} 标记在节点文本中的起始偏移 */
    markFrom: number;
    /** {#id} 标记在节点文本中的结束偏移 */
    markTo: number;
}

/**
 * 从标题行文本中解析 {#custom-id} 标记
 * 
 * @param lineText - 标题行的完整文本（不含 Markdown 标记前缀 # ）
 * @param lineFrom - 行在文档中的绝对起始位置
 * @returns 解析结果，未匹配时返回 null
 * 
 * @example
 * ```typescript
 * parseHeadingId('My Heading {#my-id}', 100);
 * // => { id: 'my-id', markFrom: 111, markTo: 120 }
 * ```
 */
export function parseHeadingId(lineText: string, lineFrom: number): IHeadingIdMatch | null {
    const match = HEADING_ID_PATTERN.exec(lineText);
    if (!match) return null;

    const matchStart = match.index;
    const matchEnd = matchStart + match[0].length;

    return {
        id: match[1],
        markFrom: lineFrom + matchStart,
        markTo: lineFrom + matchEnd,
    };
}
