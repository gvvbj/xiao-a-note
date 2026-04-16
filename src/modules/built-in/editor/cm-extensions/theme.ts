import { EditorView } from '@codemirror/view';

/**
 * Excel 风格表格的主题扩展
 * 
 * 零硬编码：所有颜色均使用 CSS 变量
 */
export const excelTableTheme = EditorView.baseTheme({
    ".cm-table-widget": {
        display: "block",
        margin: "0",
        padding: "16px 0",
        fontFamily: "Inter, system-ui, sans-serif",
    },
    ".cm-table-toolbar": {
        display: "flex",
        gap: "4px",
        marginBottom: "4px",
        opacity: "0",
        transition: "opacity 0.2s",
        pointerEvents: "none",
    },
    ".cm-table-widget:hover .cm-table-toolbar, .cm-table-widget:focus-within .cm-table-toolbar": {
        opacity: "1",
        pointerEvents: "auto",
    },
    ".cm-table-btn": {
        background: "hsl(var(--muted))",
        border: "1px solid hsl(var(--border))",
        borderRadius: "4px",
        padding: "2px 8px",
        fontSize: "12px",
        cursor: "pointer",
        color: "hsl(var(--foreground))",
        transition: "all 0.1s",
        userSelect: "none",
    },
    ".cm-table-btn:hover": {
        background: "hsl(var(--accent))",
        color: "hsl(var(--accent-foreground))",
    },
    ".cm-table-btn-danger": {
        color: "hsl(var(--destructive))",
        borderColor: "hsl(var(--destructive) / 0.3)",
        background: "hsl(var(--destructive) / 0.1)",
    },
    ".cm-table-btn-danger:hover": {
        background: "hsl(var(--destructive) / 0.2)",
        color: "hsl(var(--destructive))",
    },
    ".cm-rendered-table": {
        borderCollapse: "collapse",
        width: "100%",
        fontSize: "14px",
        lineHeight: "1.5",
        border: "1px solid hsl(var(--border))",
    },
    ".cm-rendered-table th": {
        background: "hsl(var(--table-header-bg, var(--muted)))",
        fontWeight: "600",
        textAlign: "left",
        padding: "8px 12px",
        border: "1px solid hsl(var(--border))",
        position: "relative",
        cursor: "pointer",
        userSelect: "none",
    },
    ".cm-rendered-table td": {
        padding: "8px 12px",
        border: "1px solid hsl(var(--border))",
        background: "transparent",
        minWidth: "120px",
        verticalAlign: "top",
    },
    ".selected-cell": {
        backgroundColor: "hsl(var(--primary) / 0.2) !important",
        outline: "2px solid hsl(var(--primary)) !important",
        outlineOffset: "-2px",
    },
    ".selected-row td": {
        backgroundColor: "hsl(var(--primary) / 0.2) !important",
    },
    ".cm-rendered-table th:focus, .cm-rendered-table td:focus": {
        outline: "2px solid hsl(var(--primary))",
        outlineOffset: "-1px",
        zIndex: "10",
        backgroundColor: "hsl(var(--background))",
    }
});

/**
 * 编辑器核心布局辅助样式 (透明背景、滚动条、内间距等)
 */
export const editorCoreLayout = EditorView.theme({
    "&": {
        display: "flex !important",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "transparent !important"
    },
    ".cm-scroller": {
        overflow: "auto !important",
        scrollbarGutter: "stable",
        height: "100%",
        flex: "1",
        flexShrink: "1",
        outline: "none",
        minHeight: "0"
    },
    ".cm-content": {
        padding: "2rem 0 !important",
        paddingBottom: "30vh !important",
        minHeight: "100%",
        maxWidth: "900px",
        margin: "0 auto",
        lineHeight: "1.6"
    },
    ".cm-line": {
        paddingLeft: "2rem !important",
        paddingRight: "2rem !important"
    },
    ".cm-searchMatch": {
        backgroundColor: "hsl(var(--search-match-bg, 48 96% 53%) / 0.35)",
        outline: "1px solid hsl(var(--search-match-bg, 48 96% 53%) / 0.6)",
        borderRadius: "2px"
    },
    ".cm-searchMatch-selected": {
        backgroundColor: "hsl(var(--search-match-active-bg, 25 95% 53%) / 0.6)",
        outline: "2px solid hsl(var(--search-match-active-bg, 25 95% 53%) / 0.8)",
        borderRadius: "2px"
    }
});
