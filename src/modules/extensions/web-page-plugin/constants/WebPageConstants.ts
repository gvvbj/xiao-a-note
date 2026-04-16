export const WEB_PAGE_DOCUMENT_TYPE = 'web-page';
export const WEB_PAGE_DEFAULT_RUNTIME = 'vanilla';

export const WEB_PAGE_STYLES = `
.web-page-toggle-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border: 1px solid var(--border-color, #d1d5db);
    border-radius: 7px;
    background: var(--bg-secondary, #fff);
    color: var(--text-primary, #111827);
    cursor: pointer;
    transition: all 0.15s ease;
}

.web-page-toggle-btn:hover {
    background: var(--bg-hover, #f3f4f6);
}

.web-page-toggle-btn.active {
    border-color: var(--accent-color, #2563eb);
    color: var(--accent-color, #2563eb);
    background: rgba(37, 99, 235, 0.08);
}

.web-page-overlay {
    position: absolute;
    inset: 0;
    z-index: 19;
    background: #ffffff;
    overflow: hidden;
    isolation: isolate;
}

.web-page-toolbar {
    position: absolute;
    top: 12px;
    left: 16px;
    right: 16px;
    z-index: 2;
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    padding: 0;
    pointer-events: none;
}

.web-page-exit-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border: 1px solid var(--border-color, #cbd5e1);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.88);
    color: var(--text-primary, #0f172a);
    cursor: pointer;
    backdrop-filter: blur(14px);
    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
    pointer-events: auto;
}

.web-page-toolbar-actions {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    pointer-events: auto;
}

.web-page-diagnostics {
    position: absolute;
    top: 16px;
    left: 16px;
    z-index: 2;
    display: grid;
    gap: 8px;
    max-width: min(560px, calc(100vw - 96px));
}

.web-page-diagnostic {
    padding: 10px 12px;
    border: 1px solid rgba(148, 163, 184, 0.22);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.92);
    color: #0f172a;
    font-size: 12px;
    line-height: 1.5;
    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
    backdrop-filter: blur(14px);
}

.web-page-diagnostic.warning {
    border-color: rgba(245, 158, 11, 0.28);
    background: rgba(255, 251, 235, 0.96);
    color: #92400e;
}

.web-page-diagnostic.error {
    border-color: rgba(239, 68, 68, 0.24);
    background: rgba(254, 242, 242, 0.96);
    color: #991b1b;
}

.web-page-frame-wrap {
    position: absolute;
    inset: 0;
    z-index: 1;
}

.web-page-frame {
    width: 100%;
    height: 100%;
    border: none;
    background: white;
    display: block;
}

.web-page-empty {
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    color: var(--text-secondary, #64748b);
    background: rgba(255, 255, 255, 0.72);
    font-size: 14px;
}

.web-page-status-bar {
    position: absolute;
    left: 16px;
    bottom: 16px;
    z-index: 2;
    max-width: min(60vw, 560px);
    padding: 8px 12px;
    border: 1px solid rgba(148, 163, 184, 0.18);
    border-radius: 10px;
    background: rgba(15, 23, 42, 0.88);
    color: #f8fafc;
    font-size: 12px;
    line-height: 1.4;
    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.18);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    pointer-events: none;
}

.web-page-snippet-card {
    position: absolute;
    right: 16px;
    bottom: 16px;
    z-index: 2;
    width: min(460px, calc(100vw - 32px));
    border: 1px solid rgba(148, 163, 184, 0.18);
    border-radius: 14px;
    background: rgba(15, 23, 42, 0.94);
    color: #e2e8f0;
    box-shadow: 0 18px 48px rgba(15, 23, 42, 0.22);
    overflow: hidden;
}

.web-page-snippet-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.16);
    font-size: 12px;
}

.web-page-snippet-card-title {
    color: #f8fafc;
    font-weight: 600;
}

.web-page-snippet-card-meta {
    color: #94a3b8;
}

.web-page-snippet-card-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: #cbd5e1;
    cursor: pointer;
}

.web-page-snippet-card-close:hover {
    background: rgba(148, 163, 184, 0.14);
}

.web-page-snippet-card pre {
    margin: 0;
    padding: 12px;
    overflow: auto;
    max-height: 220px;
    font-size: 12px;
    line-height: 1.6;
    font-family: 'Cascadia Code', 'Fira Code', Consolas, monospace;
    white-space: pre-wrap;
    word-break: break-word;
}

body.web-page-view-active footer {
    display: none !important;
}

body.web-page-view-active .bg-editor.overflow-hidden.relative .custom-scrollbar.h-9,
body.web-page-view-active .bg-editor.overflow-hidden.relative .h-10.border-b.border-glass-border,
body.web-page-view-active .bg-editor.overflow-hidden.relative .sticky.top-0.z-20 {
    display: none !important;
}

body.web-page-view-active .bg-editor .cm-editor,
body.web-page-view-active .bg-editor .cm-scroller {
    pointer-events: none !important;
}
`;
