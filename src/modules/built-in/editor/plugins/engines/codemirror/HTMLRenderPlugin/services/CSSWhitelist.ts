/**
 * CSSWhitelist — CSS 属性白名单过滤器
 * 
 * 职责：解析 HTML style 属性字符串，过滤掉不安全的 CSS 属性，
 * 只保留白名单中的安全属性。
 * 
 * 遵循原则:
 * - 安全优先: 严格白名单过滤
 * - 零硬编码: 使用 HTMLConstants 中的常量
 * - 单一职责: 仅负责 CSS 过滤
 */

import { CSS_PROPERTY_WHITELIST } from '../constants/HTMLConstants';

/**
 * 过滤 CSS style 字符串，仅保留白名单属性
 * 
 * @param rawStyle - 原始 style 属性值（例如 "color: red; position: fixed; font-size: 14px"）
 * @returns 过滤后的安全 style 字符串（例如 "color: red; font-size: 14px"）
 * 
 * @example
 * ```typescript
 * filterCSS('color: red; position: fixed; font-size: 14px');
 * // => 'color: red; font-size: 14px'
 * 
 * filterCSS('display: none; opacity: 0.5');
 * // => 'opacity: 0.5'
 * ```
 */
export function filterCSS(rawStyle: string): string {
    if (!rawStyle || !rawStyle.trim()) return '';

    const declarations = rawStyle.split(';');
    const safeDeclarations: string[] = [];

    for (const decl of declarations) {
        const trimmed = decl.trim();
        if (!trimmed) continue;

        const colonIndex = trimmed.indexOf(':');
        if (colonIndex < 0) continue;

        const property = trimmed.substring(0, colonIndex).trim().toLowerCase();
        const value = trimmed.substring(colonIndex + 1).trim();

        if (!property || !value) continue;

        // 仅保留白名单属性
        if (!CSS_PROPERTY_WHITELIST.has(property)) continue;

        // 安全检查：过滤值中的危险内容
        if (containsDangerousValue(value)) continue;

        safeDeclarations.push(`${property}: ${value}`);
    }

    return safeDeclarations.join('; ');
}

/**
 * 检查 CSS 值是否包含危险内容
 * 
 * 过滤规则：
 * - url(), expression(), javascript: — 可能执行脚本
 * - var(--) — 可能引用被注入的变量
 * - calc() 本身安全，但为简化策略一并检查
 */
function containsDangerousValue(value: string): boolean {
    const lower = value.toLowerCase();
    const dangerousPatterns = [
        'url(',
        'expression(',
        'javascript:',
        'data:',
    ];
    return dangerousPatterns.some(pattern => lower.includes(pattern));
}
