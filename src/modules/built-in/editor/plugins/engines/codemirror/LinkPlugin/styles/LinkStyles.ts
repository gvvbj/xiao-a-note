/**
 * 链接插件样式表
 * 
 * 零硬编码：所有颜色均使用 CSS 变量
 */
export const LINK_CSS = `
.cm-link-text {
    color: hsl(var(--syntax-link, var(--primary))) !important;
    text-decoration: underline;
    text-underline-offset: 3px;
    cursor: pointer;
    font-weight: 500;
}
.cm-link-text:hover {
    color: hsl(var(--syntax-link-hover, var(--primary))) !important;
}
`;
