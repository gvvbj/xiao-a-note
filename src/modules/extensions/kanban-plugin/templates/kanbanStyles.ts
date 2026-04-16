/**
 * 看板视图样式
 * 
 * 使用系统 CSS 变量（hsl(var(--xxx))）适配主题，支持亮色/暗色自动切换
 * 设计风格：玻璃态（Glassmorphism）+ 卡片式布局
 * 
 * 系统 CSS 变量参考：
 *   --background / --foreground / --card / --border / --primary
 *   --muted / --muted-foreground / --accent / --destructive / --radius
 *   深色模式时 <html> 自动添加 .dark 类名，CSS 变量会自动切换
 */
export const KANBAN_STYLES = `
/* ─── 切换按钮（注册到 UISlotId.EDITOR_HEADER_RIGHT 插槽） ──────── */
.kanban-toggle-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: hsl(var(--muted-foreground));
    cursor: pointer;
    transition: all 0.15s ease;
}

.kanban-toggle-btn:hover {
    background: hsl(var(--accent));
    color: hsl(var(--foreground));
}

.kanban-toggle-btn.active {
    background: hsl(var(--primary) / 0.12);
    color: hsl(var(--primary));
}

/* ─── 覆盖层容器（注册到 UISlotId.EDITOR_MODALS，全屏覆盖编辑器） ── */
.kanban-overlay {
    position: absolute;
    inset: 0;
    z-index: 100;
    background-color: hsl(var(--background));
    overflow: hidden;
    display: flex;
    flex-direction: column;
    /* 隔离层：确保编辑器内容不会穿透 */
    isolation: isolate;
}

/* ─── 看板顶部工具栏 ──────────────────────────── */
.kanban-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    border-bottom: 1px solid hsl(var(--border));
    background: hsl(var(--background));
    flex-shrink: 0;
}

.kanban-toolbar-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
    font-weight: 600;
    color: hsl(var(--foreground));
}

.kanban-toolbar-title svg {
    color: hsl(var(--primary));
}

.kanban-toolbar-actions {
    display: flex;
    align-items: center;
    gap: 6px;
}

.kanban-exit-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius);
    background: transparent;
    color: hsl(var(--muted-foreground));
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.15s ease;
}

.kanban-exit-btn:hover {
    background: hsl(var(--accent));
    color: hsl(var(--foreground));
    border-color: hsl(var(--foreground) / 0.2);
}

/* ─── 看板容器 ─────────────────────────────────── */
.kanban-root {
    width: 100%;
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 24px;
}

/* ─── 分组标题 ─────────────────────────────────── */
.kanban-board-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: hsl(var(--foreground));
    margin: 0 0 16px 0;
    padding-bottom: 8px;
    border-bottom: 1px solid hsl(var(--border));
    cursor: default;
}

/* ─── 分组头部（标题 + 操作按钮） ───────────────── */
.kanban-board-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid hsl(var(--border));
}

.kanban-board-actions {
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.15s ease;
}

.kanban-board-header:hover .kanban-board-actions {
    opacity: 1;
}

.kanban-board-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: hsl(var(--muted-foreground));
    cursor: pointer;
    transition: all 0.15s ease;
}

.kanban-board-action-btn:hover {
    background: hsl(var(--accent));
    color: hsl(var(--foreground));
}

.kanban-board-delete-btn:hover {
    color: hsl(var(--destructive));
    background: hsl(var(--destructive) / 0.1);
}

.kanban-board-title-input {
    font-size: 1.25rem;
    font-weight: 700;
    flex: 1;
    margin-right: 8px;
}

/* ─── 水平布局容器（≤3 列） ────────────────────── */
.kanban-columns-horizontal {
    display: flex;
    gap: 16px;
    margin-bottom: 32px;
}

.kanban-columns-horizontal > .kanban-column {
    flex: 1;
    min-width: 0;
}

/* ─── 竖向布局容器（>3 列） ────────────────────── */
.kanban-columns-vertical {
    display: flex;
    flex-direction: column;
    gap: 20px;
    margin-bottom: 32px;
}

.kanban-columns-vertical > .kanban-column {
    width: 100%;
}

/* ─── 列面板 ──────────────────────────────────── */
.kanban-column {
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: 12px;
    padding: 12px;
    min-height: 80px;
    transition: border-color 0.2s ease;
}

.kanban-column.drag-over {
    border-color: hsl(var(--primary));
    background: hsl(var(--primary) / 0.05);
}

/* ─── 列标题 ──────────────────────────────────── */
.kanban-column-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
    padding: 4px 6px;
}

.kanban-column-title {
    font-size: 0.85rem;
    font-weight: 600;
    color: hsl(var(--foreground));
    letter-spacing: 0.02em;
}

.kanban-column-count {
    font-size: 0.7rem;
    color: hsl(var(--muted-foreground));
    background: hsl(var(--muted));
    padding: 2px 8px;
    border-radius: 10px;
}

/* ─── 卡片 ────────────────────────────────────── */
.kanban-card {
    background: hsl(var(--background));
    border: 1px solid hsl(var(--border));
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 8px;
    cursor: grab;
    transition: all 0.15s ease;
    user-select: none;
}

.kanban-card:hover {
    border-color: hsl(var(--foreground) / 0.2);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px hsl(var(--foreground) / 0.05);
}

.kanban-card:active {
    cursor: grabbing;
}

.kanban-card.dragging {
    opacity: 0.5;
    transform: scale(0.98);
}

.kanban-card.done .kanban-card-text {
    text-decoration: line-through;
    opacity: 0.5;
}

/* ─── 卡片内容区 ──────────────────────────────── */
.kanban-card-content {
    display: flex;
    align-items: flex-start;
    gap: 8px;
}

.kanban-card-checkbox {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 2px solid hsl(var(--muted-foreground));
    margin-top: 2px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    background: transparent;
    padding: 0;
}

.kanban-card-checkbox:hover {
    border-color: hsl(var(--primary));
}

.kanban-card-checkbox.checked {
    background: hsl(142 76% 36%);
    border-color: hsl(142 76% 36%);
}

.kanban-card-checkbox.doing {
    border-color: hsl(38 92% 50%);
}

.kanban-card-checkbox svg {
    width: 10px;
    height: 10px;
    color: white;
}

.kanban-card-text {
    flex: 1;
    font-size: 0.85rem;
    color: hsl(var(--foreground));
    line-height: 1.5;
    word-break: break-word;
}

/* ─── 卡片描述 ────────────────────────────────── */
.kanban-card-description {
    font-size: 0.75rem;
    color: hsl(var(--muted-foreground));
    margin-top: 6px;
    padding-left: 24px;
    line-height: 1.4;
    border-left: 2px solid hsl(var(--border));
    padding: 2px 0 2px 8px;
    margin-left: 24px;
}

/* ─── 卡片子项 ────────────────────────────────── */
.kanban-card-children {
    margin-top: 6px;
    padding-left: 24px;
}

.kanban-card-child {
    font-size: 0.75rem;
    color: hsl(var(--muted-foreground));
    line-height: 1.6;
    position: relative;
    padding-left: 12px;
}

.kanban-card-child::before {
    content: '•';
    position: absolute;
    left: 0;
    color: hsl(var(--muted-foreground));
}

/* ─── 新增按钮 ────────────────────────────────── */
.kanban-add-card {
    width: 100%;
    padding: 8px;
    border: 1px dashed hsl(var(--border));
    border-radius: 8px;
    background: transparent;
    color: hsl(var(--muted-foreground));
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    margin-top: 4px;
}

.kanban-add-card:hover {
    border-color: hsl(var(--primary));
    color: hsl(var(--primary));
    background: hsl(var(--primary) / 0.05);
}

/* ─── 内联编辑输入框 ──────────────────────────── */
.kanban-input {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid hsl(var(--primary));
    border-radius: 8px;
    background: hsl(var(--background));
    color: hsl(var(--foreground));
    font-size: 0.85rem;
    outline: none;
    margin-bottom: 8px;
}

.kanban-input::placeholder {
    color: hsl(var(--muted-foreground));
}

/* ─── 删除按钮 ────────────────────────────────── */
.kanban-card-delete {
    opacity: 0;
    flex-shrink: 0;
    background: none;
    border: none;
    color: hsl(var(--muted-foreground));
    cursor: pointer;
    padding: 2px;
    border-radius: 4px;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
}

.kanban-card:hover .kanban-card-delete {
    opacity: 1;
}

.kanban-card-delete:hover {
    color: hsl(var(--destructive));
    background: hsl(var(--destructive) / 0.1);
}

/* ─── 空状态 ──────────────────────────────────── */
.kanban-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    color: hsl(var(--muted-foreground));
    font-size: 0.8rem;
    font-style: italic;
}

/* ─── 拖拽插入指示器 ──────────────────────────── */
.kanban-drop-indicator {
    height: 2px;
    background: hsl(var(--primary));
    border-radius: 1px;
    margin: 2px 0;
    opacity: 0.8;
}

/* ─── 新建分组按钮 ────────────────────────────── */
.kanban-add-board {
    width: 100%;
    padding: 12px;
    border: 2px dashed hsl(var(--border));
    border-radius: 12px;
    background: transparent;
    color: hsl(var(--muted-foreground));
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: 8px;
}

.kanban-add-board:hover {
    border-color: hsl(var(--primary));
    color: hsl(var(--primary));
    background: hsl(var(--primary) / 0.05);
}

.kanban-add-board-input-wrapper {
    margin-top: 8px;
}

.kanban-add-board-input {
    font-size: 0.9rem;
    font-weight: 600;
}

/* ─── 列标题编辑 ──────────────────────────────── */
.kanban-column-title-input {
    flex: 1;
    font-size: 0.85rem;
    font-weight: 600;
    padding: 2px 6px;
    margin: -2px 0;
}

.kanban-column-title {
    cursor: default;
}

/* ─── 列操作按钮 ───────────────────────────────── */
.kanban-column-actions {
    display: flex;
    gap: 2px;
    margin-left: auto;
    opacity: 0;
    transition: opacity 0.15s ease;
}

.kanban-column-header:hover .kanban-column-actions {
    opacity: 1;
}

.kanban-column-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 3px;
    border: none;
    border-radius: 3px;
    background: transparent;
    color: hsl(var(--muted-foreground));
    cursor: pointer;
    transition: all 0.15s ease;
}

.kanban-column-action-btn:hover {
    background: hsl(var(--accent));
    color: hsl(var(--foreground));
}

.kanban-column-delete-btn:hover {
    color: hsl(var(--destructive));
    background: hsl(var(--destructive) / 0.1);
}

/* ─── 新建列 ───────────────────────────────────── */
.kanban-add-column {
    min-width: 180px;
    min-height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 16px;
    border: 2px dashed hsl(var(--border));
    border-radius: 12px;
    background: transparent;
    color: hsl(var(--muted-foreground));
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.15s ease;
    flex-shrink: 0;
}

.kanban-add-column:hover {
    border-color: hsl(var(--primary));
    color: hsl(var(--primary));
    background: hsl(var(--primary) / 0.05);
}

.kanban-add-column-input {
    min-width: 180px;
    justify-content: flex-start;
    align-items: flex-start;
    flex-shrink: 0;
}

/* ─── 自定义确认弹窗 ────────────────────────────── */
.kanban-confirm-overlay {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    background: hsl(0 0% 0% / 0.4);
    backdrop-filter: blur(4px);
    animation: kanban-fade-in 0.15s ease;
}

.kanban-confirm-dialog {
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: 12px;
    padding: 24px;
    min-width: 320px;
    max-width: 420px;
    box-shadow: 0 8px 32px hsl(0 0% 0% / 0.2);
    animation: kanban-slide-up 0.15s ease;
}

.kanban-confirm-message {
    margin: 0 0 20px 0;
    font-size: 0.95rem;
    line-height: 1.5;
    color: hsl(var(--foreground));
}

.kanban-confirm-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
}

.kanban-confirm-btn {
    padding: 8px 20px;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid hsl(var(--border));
    transition: all 0.15s ease;
}

.kanban-confirm-cancel {
    background: transparent;
    color: hsl(var(--muted-foreground));
}

.kanban-confirm-cancel:hover {
    background: hsl(var(--accent));
    color: hsl(var(--foreground));
}

.kanban-confirm-ok {
    background: hsl(var(--destructive));
    color: white;
    border-color: hsl(var(--destructive));
}

.kanban-confirm-ok:hover {
    opacity: 0.9;
}

@keyframes kanban-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes kanban-slide-up {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
}
`;
