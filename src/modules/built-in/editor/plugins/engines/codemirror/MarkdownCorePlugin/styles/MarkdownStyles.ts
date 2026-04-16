/**
 * Markdown 核心样式表
 * 定义编辑器中 Markdown 语法的视觉样式
 * 
 * 零硬编码：所有颜色均使用 CSS 变量
 */
export const MARKDOWN_CORE_CSS = `
.cm-heading-line {
    font-weight: bold;
    color: hsl(var(--foreground));
    line-height: 1.3;
    padding-top: 0.4em;
    padding-bottom: 0.2em;
}
.cm-heading-1 { font-size: 1.8em; color: hsl(var(--syntax-h1, var(--foreground))) !important; }
.cm-heading-2 { font-size: 1.5em; color: hsl(var(--syntax-h2, var(--foreground))) !important; }
.cm-heading-3 { font-size: 1.25em; color: hsl(var(--syntax-h3, var(--foreground))) !important; }
.cm-header-mark {
    color: hsl(var(--primary));
    font-weight: normal;
    font-size: 0.5em;
    vertical-align: middle;
    opacity: 0.6;
    margin-right: 4px;
}
.cm-bold-text { font-weight: bold; color: hsl(var(--syntax-bold, var(--foreground))) !important; }
.cm-italic-text { font-style: italic; color: hsl(var(--syntax-italic, var(--foreground))) !important; }
.cm-strikethrough { text-decoration: line-through !important; opacity: 0.8; color: hsl(var(--syntax-strikethrough, var(--muted-foreground))) !important; }
.cm-md-mark {
    color: hsl(var(--muted-foreground)) !important;
    opacity: 0.5;
    font-weight: normal;
    font-size: 0.9em;
}
.cm-quote-line {
    border-left: 4px solid hsl(var(--syntax-blockquote-border, var(--border))) !important;
    padding-left: 12px;
}
.cm-quote-text {
    color: hsl(var(--syntax-blockquote, var(--muted-foreground))) !important;
    padding-left: 12px;
    font-style: italic;
}
.cm-inline-code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.85em;
    color: hsl(var(--code-inline-fg));
    background-color: hsl(var(--code-inline-bg));
    box-shadow: inset 0 0 0 1px hsl(var(--code-inline-fg) / 0.25);
    padding: 2px 4px;
    border-radius: 4px;
    font-weight: 500;
}
.cm-hr-widget {
    height: 2px;
    background-color: hsl(var(--syntax-hr, var(--border)));
    margin: 1.5em 0;
    border: none;
    display: block;
    width: 100%;
}
.cm-list-bullet {
    display: inline-block;
    width: 20px;
    text-align: center;
    color: hsl(var(--syntax-list-marker, var(--primary)));
    font-weight: bold;
    line-height: 1;
    vertical-align: baseline;
    position: relative;
    top: -1px;
    margin-right: 6px;
}
.cm-task-checkbox {
    margin-right: 6px;
    vertical-align: text-bottom;
    cursor: pointer;
    accent-color: hsl(var(--primary));
}
.cm-soft-hide {
    display: inline-block;
    width: 0;
    height: 0;
    font-size: 0;
    line-height: 0;
    overflow: hidden;
    vertical-align: middle;
    color: transparent;
    pointer-events: none;
}
.cm-soft-hide-text {
    color: hsl(var(--muted-foreground));
    font-size: 0.8em;
    vertical-align: text-top;
    font-family: monospace;
}

/* Heading Numbering */
.show-heading-numbering .cm-content { counter-reset: h1; }
.show-heading-numbering .cm-header-1 { counter-reset: h2; }
.show-heading-numbering .cm-header-1::before {
    counter-increment: h1;
    content: counter(h1) ". ";
    color: hsl(var(--muted-foreground));
    margin-right: 4px;
    font-size: 0.8em;
    opacity: 0.7;
}
.show-heading-numbering .cm-header-2 { counter-reset: h3; }
.show-heading-numbering .cm-header-2::before {
    counter-increment: h2;
    content: counter(h1) "." counter(h2) ". ";
    color: hsl(var(--muted-foreground));
    margin-right: 4px;
    font-size: 0.8em;
    opacity: 0.7;
}
.show-heading-numbering .cm-header-3 { counter-reset: h4; }
.show-heading-numbering .cm-header-3::before {
    counter-increment: h3;
    content: counter(h1) "." counter(h2) "." counter(h3) ". ";
    color: hsl(var(--muted-foreground));
    margin-right: 4px;
    font-size: 0.8em;
    opacity: 0.7;
}
`;
