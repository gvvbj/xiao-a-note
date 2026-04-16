/**
 * sanitize.ts - HTML 消毒工具
 * 
 * XSS 防护
 * 
 * 使用 DOMPurify 对所有动态 HTML 内容进行消毒，
 * 防止恶意脚本注入。
 * 
 * 使用场景:
 * - innerHTML 赋值前
 * - dangerouslySetInnerHTML 使用前
 * - 任何用户生成或第三方库生成的 HTML
 */

import DOMPurify from 'dompurify';

/**
 * SVG 相关标签和属性白名单
 * 用于支持图标渲染
 */
const SVG_TAGS = ['svg', 'path', 'polyline', 'circle', 'rect', 'line', 'g', 'use', 'defs', 'clipPath'];
const SVG_ATTRS = [
    'viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
    'd', 'points', 'cx', 'cy', 'r', 'x', 'y', 'width', 'height', 'transform',
    'xmlns', 'xmlns:xlink', 'xlink:href', 'href', 'clip-path', 'id', 'class'
];

/**
 * 代码高亮相关标签白名单
 */
const CODE_TAGS = ['pre', 'code', 'span'];
const CODE_ATTRS = ['class', 'data-language'];

/**
 * 安全的 HTML 消毒函数
 * 
 * @param dirty - 未消毒的 HTML 字符串
 * @returns 消毒后的安全 HTML 字符串
 * 
 * @example
 * ```typescript
 * // 不安全:
 * element.innerHTML = userInput;
 * 
 * // 安全:
 * import { sanitizeHTML } from '@/shared/utils/sanitize';
 * element.innerHTML = sanitizeHTML(userInput);
 * ```
 */
export function sanitizeHTML(dirty: string): string {
    return DOMPurify.sanitize(dirty, {
        USE_PROFILES: { html: true, svg: true },
        ADD_TAGS: [...SVG_TAGS, ...CODE_TAGS],
        ADD_ATTR: [...SVG_ATTRS, ...CODE_ATTRS],
        // 禁止所有脚本执行
        FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
        FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover']
    });
}

/**
 * 专门用于代码高亮输出的消毒函数
 * 更宽松的配置，允许 highlight.js 生成的 class 属性
 */
export function sanitizeCodeHTML(dirty: string): string {
    return DOMPurify.sanitize(dirty, {
        USE_PROFILES: { html: true },
        ADD_TAGS: [...CODE_TAGS],
        ADD_ATTR: [...CODE_ATTRS],
        FORBID_TAGS: ['script', 'iframe'],
        FORBID_ATTR: ['onerror', 'onclick', 'onload']
    });
}

/**
 * 专门用于 SVG 图标的消毒函数
 */
export function sanitizeSVG(dirty: string): string {
    return DOMPurify.sanitize(dirty, {
        USE_PROFILES: { svg: true },
        ADD_TAGS: SVG_TAGS,
        ADD_ATTR: SVG_ATTRS
    });
}
