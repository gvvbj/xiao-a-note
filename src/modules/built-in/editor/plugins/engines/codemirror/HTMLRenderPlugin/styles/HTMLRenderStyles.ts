/**
 * HTMLRenderPlugin 样式定义
 * 
 * 所有 HTML 内联标签对应的 CodeMirror 装饰样式
 * 
 * 遵循原则:
 * - 使用 CSS 变量适配主题
 * - 视觉效果与标准 HTML 渲染一致
 */
export const HTML_RENDER_CSS = `
/* ─── mark: 高亮背景 ─── */
.cm-html-mark {
    background-color: rgba(255, 230, 0, 0.3);
    border-radius: 2px;
    padding: 0.05em 0.1em;
}

/* ─── kbd: 键盘按键 ─── */
.cm-html-kbd {
    background: var(--code-bg, #f0f0f0);
    border: 1px solid var(--border-color, #ccc);
    border-bottom-width: 2px;
    border-radius: 3px;
    padding: 0.1em 0.35em;
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
    font-size: 0.88em;
    line-height: 1;
    white-space: nowrap;
}

/* ─── sub: 下标 ─── */
.cm-html-sub {
    vertical-align: sub;
    font-size: 0.8em;
    line-height: 0;
}

/* ─── sup: 上标 ─── */
.cm-html-sup {
    vertical-align: super;
    font-size: 0.8em;
    line-height: 0;
}

/* ─── u: 下划线 ─── */
.cm-html-u {
    text-decoration: underline;
    text-decoration-color: currentColor;
}

/* ─── ins: 插入标记 ─── */
.cm-html-ins {
    text-decoration: underline;
    text-decoration-color: var(--text-success, #22c55e);
    text-decoration-style: solid;
}

/* ─── del / s: 删除线 ─── */
.cm-html-del {
    text-decoration: line-through;
    opacity: 0.7;
}

/* ─── small: 小号文字 ─── */
.cm-html-small {
    font-size: 0.85em;
}

/* ─── abbr: 缩写 ─── */
.cm-html-abbr {
    text-decoration: underline dotted;
    text-decoration-color: var(--text-muted, #888);
    cursor: help;
}

/* ─── var: 变量 ─── */
.cm-html-var {
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
    font-style: italic;
    font-size: 0.95em;
}
`;
