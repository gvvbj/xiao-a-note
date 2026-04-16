/**
 * 表格插件样式表
 * 
 * 零硬编码：所有颜色均使用 CSS 变量
 */
export const TABLE_CSS = `
/* === 表格渲染 (Table Widget) === */
.cm-table-widget {
    padding: 12px 0;
    border-radius: 8px;
    overflow: hidden;
    background: hsl(var(--background));
}
.cm-table-widget-inner {
    border: 1px solid hsl(var(--border) / 0.8);
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
    transition: box-shadow 0.2s;
}
.cm-table-widget-inner:focus-within {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08);
    border-color: hsl(var(--primary));
}
.cm-table-toolbar { 
    display: flex; 
    gap: 8px; 
    padding: 10px 16px; 
    background-color: hsl(var(--muted) / 0.8); 
    border-bottom: 1px solid hsl(var(--border));
    backdrop-filter: blur(4px);
}
.cm-table-btn { 
    padding: 4px 12px; 
    font-size: 12px; 
    border: 1px solid hsl(var(--border)); 
    border-radius: 6px; 
    background: hsl(var(--card)); 
    color: hsl(var(--foreground)); 
    cursor: pointer; 
    transition: all 0.2s;
    font-weight: 500;
}
.cm-table-btn:hover { 
    background-color: hsl(var(--accent)); 
    color: hsl(var(--accent-foreground));
    border-color: hsl(var(--border)); 
    transform: translateY(-1px); 
}
.cm-table-btn-danger { 
    color: hsl(var(--destructive)); 
    border-color: hsl(var(--destructive) / 0.3); 
}
.cm-table-btn-danger:hover { 
    background-color: hsl(var(--destructive) / 0.1); 
    border-color: hsl(var(--destructive) / 0.5); 
}
.cm-rendered-table { 
    width: 100%; 
    border-collapse: separate; 
    border-spacing: 0; 
    font-size: 14px; 
    table-layout: fixed;
    background: transparent;
}
.cm-rendered-table th, .cm-rendered-table td { 
    padding: 12px 16px; 
    text-align: left; 
    border-right: 1px solid hsl(var(--table-border, var(--border))); 
    border-bottom: 1px solid hsl(var(--table-border, var(--border))); 
    min-width: 80px;
    word-break: break-all;
    box-sizing: border-box;
}
/* 最后一列去掉右边框以适配容器边框 */
.cm-rendered-table th:last-child, .cm-rendered-table td:last-child {
    border-right: none;
}
/* 最后一行去掉底边框以适配容器圆角 */
.cm-rendered-table tr:last-child td {
    border-bottom: none;
}

.cm-rendered-table th { 
    background-color: hsl(var(--table-header-bg, var(--muted))); 
    font-weight: 600; 
    color: hsl(var(--table-header-fg, var(--foreground))); 
    position: relative; 
    border-bottom: 2px solid hsl(var(--table-border, var(--border))); 
}

.cm-table-row-handle { 
    width: 8px !important; 
    min-width: 8px !important;
    max-width: 8px !important;
    padding: 0 !important; 
    background-color: transparent; 
    cursor: pointer; 
    transition: background-color 0.2s;
    border-right: 1px solid hsl(var(--border));
    position: relative;
    z-index: 10;
}
.cm-table-row-handle:hover { background-color: hsl(var(--primary)) !important; opacity: 0.4; }
.selected-row .cm-table-row-handle { background-color: hsl(var(--primary)) !important; opacity: 0.8; }

/* 仅当表格获取焦点时显示选区高亮 */
.cm-table-widget:not(:focus-within) .selected-cell {
    background-color: transparent !important;
    box-shadow: none !important;
}
.cm-table-widget:focus-within .selected-cell { 
    background-color: hsl(var(--primary) / 0.12) !important;
    box-shadow: inset 0 0 0 1px hsl(var(--primary));
}
`;
