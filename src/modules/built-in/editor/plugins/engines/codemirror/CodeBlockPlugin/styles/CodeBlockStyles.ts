/**
 * 代码块插件样式表
 * 
 * 零硬编码：所有颜色均使用 CSS 变量
 */
export const CODEBLOCK_CSS = `
/* Block Header Widget */
.cm-codeblock-header {
    display: flex;
    align-items: center;
    background-color: hsl(var(--card));
    padding: 0 16px;
    border-radius: 8px 8px 0 0;
    margin-top: 0;
    margin-bottom: 0;
    user-select: none;
    height: 36px;
    box-sizing: border-box;
    position: relative;
    z-index: 2;
    width: 100%;
    border: 1px solid hsl(var(--border));
    border-bottom: none;
}

.cm-codeblock-lang-group { display: flex; align-items: center; gap: 8px; flex: 1; }
.cm-codeblock-icon { display: flex; align-items: center; color: hsl(var(--primary)); opacity: 0.8; }

.cm-codeblock-header * {
    pointer-events: auto;
}

.cm-codeblock-controls {
    display: flex;
    gap: 6px;
    margin-right: 18px;
}

.cm-codeblock-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
}

.cm-codeblock-lang-input {
    background: transparent;
    border: none;
    outline: none;
    color: hsl(var(--primary));
    font-size: 13px;
    font-family: 'JetBrains Mono', monospace;
    width: 100px;
    padding: 2px 4px;
    border-radius: 4px;
}

.cm-codeblock-lang-input:hover,
.cm-codeblock-lang-input:focus {
    background-color: hsl(var(--accent) / 0.2);
}

.cm-codeblock-copy-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    background: transparent;
    border: none;
    color: hsl(var(--muted-foreground));
    cursor: pointer;
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 4px;
    transition: all 0.2s;
}

.cm-codeblock-copy-btn:hover {
    color: hsl(var(--primary));
    background-color: hsl(var(--accent) / 0.2);
}

.cm-codeblock-line {
    position: relative;
    font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    font-size: 0.9em;
    line-height: 1.6;
    color: hsl(var(--foreground));
    padding-left: 16px !important;
    padding-right: 16px !important;
    user-select: text !important;
    cursor: text;
    background-color: transparent !important;
}

.cm-codeblock-line::before {
    content: "";
    position: absolute;
    inset: 0;
    background-color: hsl(var(--card));
    z-index: -3;
    pointer-events: none;
}

.cm-codeblock-first {
    height: 0 !important;
    min-height: 0 !important;
    line-height: 0 !important;
    padding: 0 !important;
    margin: 0 !important;
    overflow: hidden !important;
}

.cm-codeblock-last {
    border-radius: 0 0 8px 8px;
    padding-bottom: 12px !important;
}

.cm-codeblock-last::before {
    border-bottom: 1px solid hsl(var(--border));
    border-left: 1px solid hsl(var(--border));
    border-right: 1px solid hsl(var(--border));
    border-radius: 0 0 8px 8px;
}

.cm-codeblock-line::before {
    border-left: 1px solid hsl(var(--border));
    border-right: 1px solid hsl(var(--border));
}

.cm-copy-btn {
    float: right;
    margin-right: 12px;
    margin-top: 2px;
    cursor: pointer;
    opacity: 0.4;
    transition: opacity 0.2s, color 0.2s;
    z-index: 10;
    position: relative;
    color: hsl(var(--muted-foreground));
    padding: 4px;
    border-radius: 4px;
}
.cm-copy-btn:hover {
    opacity: 1;
    color: hsl(var(--primary));
    background-color: hsl(var(--accent) / 0.1);
}
`;
