/**
 * HTMLConstants — HTML 标签与 CSS 属性白名单常量
 * 
 * 集中管理所有允许渲染的 HTML 标签及其对应的装饰 class，
 * 以及允许内联渲染的 CSS 属性白名单。
 * 
 * 遵循原则:
 * - 零硬编码: 所有标签/属性集中在此，插件其他文件引用常量
 * - 安全优先: 只允许语义化内联标签，禁止脚本/交互元素
 */

/**
 * 标签 → CSS class 映射
 * 
 * key: 小写标签名
 * value: 编辑器内应用的 CSS class 名
 */
export const HTML_TAG_CLASS_MAP: Record<string, string> = {
    'mark': 'cm-html-mark',
    'kbd': 'cm-html-kbd',
    'sub': 'cm-html-sub',
    'sup': 'cm-html-sup',
    'u': 'cm-html-u',
    'ins': 'cm-html-ins',
    'del': 'cm-html-del',
    's': 'cm-html-del',       // <s> 和 <del> 共享同一样式
    'small': 'cm-html-small',
    'abbr': 'cm-html-abbr',
    'var': 'cm-html-var',
};

/**
 * 所有允许渲染的标签名集合（小写）
 */
export const ALLOWED_TAGS = new Set(Object.keys(HTML_TAG_CLASS_MAP));

/**
 * 支持带 style 属性的标签（仅 span）
 */
export const STYLE_CAPABLE_TAGS = new Set(['span']);

/**
 * CSS 属性白名单
 * 
 * 仅这些 CSS 属性允许在编辑器内渲染。
 * 危险属性（position, display, z-index 等）一律过滤。
 */
export const CSS_PROPERTY_WHITELIST = new Set([
    'color',
    'background-color',
    'background',
    'font-size',
    'font-weight',
    'font-style',
    'text-decoration',
    'text-decoration-line',
    'text-decoration-color',
    'text-decoration-style',
    'opacity',
    'letter-spacing',
    'text-align',
    'vertical-align',
    'border',
    'border-radius',
    'padding',
]);

/**
 * DOMPurify 白名单配置
 * 
 * 用于导出时告知 DOMPurify 允许这些标签和属性
 */
export const HTML_PURIFY_TAGS = [
    ...Object.keys(HTML_TAG_CLASS_MAP),
    'span',
    'ruby', 'rt', 'rp', // 注音支持
];

export const HTML_PURIFY_ATTRS = [
    'style',
    'title',  // <abbr title="...">
    'class',
];
