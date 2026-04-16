import React from 'react';
import { WebPageController } from '../services/WebPageController';

interface WebPageViewProps {
    controller: WebPageController;
}

interface StatusState {
    kind: 'node' | 'link' | 'runtime';
    text: string;
}

interface WebPageMessageBase {
    type: string;
}

interface WebPageNodeClickMessage extends WebPageMessageBase {
    type: 'web-page:node-click';
    nodeId?: string;
    tagName?: string;
}

interface WebPageLinkHoverMessage extends WebPageMessageBase {
    type: 'web-page:link-hover';
    href?: string;
}

interface WebPageLinkLeaveMessage extends WebPageMessageBase {
    type: 'web-page:link-leave';
}

interface WebPageLinkClickMessage extends WebPageMessageBase {
    type: 'web-page:link-click';
    href?: string;
}

interface WebPageRuntimeErrorMessage extends WebPageMessageBase {
    type: 'web-page:runtime-error';
    message?: string;
}

interface WebPageTextCommitMessage extends WebPageMessageBase {
    type: 'web-page:text-commit';
    nodeId?: string;
    text?: string;
}

interface WebPageFormCommitMessage extends WebPageMessageBase {
    type: 'web-page:form-commit';
    nodeId?: string;
    tagName?: 'input' | 'textarea' | 'select';
    inputType?: string;
    value?: string;
    checked?: boolean;
}

type WebPageBridgeMessage =
    | WebPageNodeClickMessage
    | WebPageLinkHoverMessage
    | WebPageLinkLeaveMessage
    | WebPageLinkClickMessage
    | WebPageRuntimeErrorMessage
    | WebPageTextCommitMessage
    | WebPageFormCommitMessage;

function buildSrcDoc(template: string, style: string, script: string): string {
    const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src * data: blob:; media-src * data: blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; font-src * data:; connect-src https: http:;">`;
    const baseStyles = `
        *, *::before, *::after { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; min-height: 100%; }
        body { font-family: Inter, 'PingFang SC', 'Microsoft YaHei', sans-serif; background: #ffffff; color: #0f172a; line-height: 1.5; }
        img, picture, video, canvas, svg { display: block; max-width: 100%; }
        button, input, textarea, select { font: inherit; }
        a { color: inherit; }
        [contenteditable="true"][data-node-id] { outline: 1px dashed rgba(37, 99, 235, 0.28); outline-offset: 2px; }
    `;

    const bridgeScript = [
        "const getClosestLink = (target) => target instanceof Element ? target.closest('a[href]') : null;",
        "const getClosestNode = (target) => target instanceof Element ? target.closest('[data-node-id]') : null;",
        "const normalizeError = (value) => {",
        "  if (value instanceof Error) return value.message;",
        "  if (typeof value === 'string') return value;",
        "  if (value && typeof value === 'object' && 'message' in value && typeof value.message === 'string') return value.message;",
        "  return '未知脚本错误';",
        "};",
        '',
        "const emit = (payload) => window.parent.postMessage(payload, '*');",
        '',
        'const handleMouseOver = (event) => {',
        '  const link = getClosestLink(event.target);',
        '  if (!link) return;',
        "  const href = link.getAttribute('href');",
        '  if (!href) return;',
        "  emit({ type: 'web-page:link-hover', href });",
        '};',
        '',
        'const handleMouseOut = (event) => {',
        '  const currentLink = getClosestLink(event.target);',
        '  if (!currentLink) return;',
        '  const nextLink = getClosestLink(event.relatedTarget);',
        '  if (currentLink === nextLink) return;',
        "  emit({ type: 'web-page:link-leave' });",
        '};',
        '',
        'const handleClick = (event) => {',
        '  const link = getClosestLink(event.target);',
        '  if (link) {',
        '    event.preventDefault();',
        '    event.stopPropagation();',
        "    if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();",
        "    const href = link.getAttribute('href');",
        '    if (href) {',
        "      emit({ type: 'web-page:link-click', href });",
        '    }',
        '    return;',
        '  }',
        '',
        '  const node = getClosestNode(event.target);',
        '  if (!node) return;',
        "  const nodeId = node.getAttribute('data-node-id');",
        '  if (!nodeId) return;',
        "  emit({ type: 'web-page:node-click', nodeId, tagName: node.tagName.toLowerCase() });",
        '};',
        '',
        'const handleSubmit = (event) => {',
        '  const form = event.target;',
        "  if (!(form instanceof HTMLFormElement)) return;",
        '  event.preventDefault();',
        '};',
        '',
        'const emitTextCommit = (element) => {',
        "  if (!(element instanceof HTMLElement)) return;",
        "  const node = element.closest('[data-node-id][contenteditable=\"true\"]');",
        "  if (!(node instanceof HTMLElement)) return;",
        "  const nodeId = node.getAttribute('data-node-id');",
        '  if (!nodeId) return;',
        '  if (node !== element) return;',
        "  emit({ type: 'web-page:text-commit', nodeId, text: node.textContent || '' });",
        '};',
        '',
        'const emitFormCommit = (element) => {',
        "  if (!(element instanceof HTMLElement)) return;",
        "  const node = element.closest('[data-node-id]');",
        '  if (!(node instanceof HTMLElement)) return;',
        "  const nodeId = node.getAttribute('data-node-id');",
        '  if (!nodeId) return;',
        "  const tagName = node.tagName.toLowerCase();",
        "  if (tagName === 'input') {",
        '    const input = node;',
        "    const inputType = (input.getAttribute('type') || 'text').toLowerCase();",
        "    emit({ type: 'web-page:form-commit', nodeId, tagName: 'input', inputType, value: input.value, checked: input.checked });",
        '    return;',
        '  }',
        "  if (tagName === 'textarea') {",
        "    emit({ type: 'web-page:form-commit', nodeId, tagName: 'textarea', value: node.value });",
        '    return;',
        '  }',
        "  if (tagName === 'select') {",
        "    emit({ type: 'web-page:form-commit', nodeId, tagName: 'select', value: node.value });",
        '  }',
        '};',
        '',
        'const handleChange = (event) => {',
        '  const target = event.target;',
        "  if (!(target instanceof HTMLElement)) return;",
        "  const tagName = target.tagName.toLowerCase();",
        "  if (tagName === 'select') {",
        '    emitFormCommit(target);',
        '    return;',
        '  }',
        "  if (!(target instanceof HTMLInputElement)) return;",
        "  const inputType = (target.type || 'text').toLowerCase();",
        "  if (inputType === 'checkbox' || inputType === 'radio') {",
        '    emitFormCommit(target);',
        '  }',
        '};',
        '',
        'const handleBlur = (event) => {',
        '  const target = event.target;',
        "  if (!(target instanceof HTMLElement)) return;",
        "  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {",
        '    emitFormCommit(target);',
        '    return;',
        '  }',
        '  emitTextCommit(target);',
        '};',
        '',
        "window.addEventListener('error', (event) => {",
        "  emit({ type: 'web-page:runtime-error', message: normalizeError(event.error || event.message) });",
        '});',
        "window.addEventListener('unhandledrejection', (event) => {",
        "  emit({ type: 'web-page:runtime-error', message: normalizeError(event.reason) });",
        '});',
        '',
        "document.addEventListener('mouseover', handleMouseOver, true);",
        "document.addEventListener('mouseout', handleMouseOut, true);",
        "document.addEventListener('click', handleClick, true);",
        "document.addEventListener('change', handleChange, true);",
        "document.addEventListener('focusout', handleBlur, true);",
        "document.addEventListener('submit', handleSubmit, true);",
    ].join('\n');

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
${csp}
<style>${baseStyles}</style>
<style>${style}</style>
</head>
<body>
${template}
<script>${bridgeScript}</script>
<script>${script}</script>
</body>
</html>`;
}

export const WebPageView: React.FC<WebPageViewProps> = ({ controller }) => {
    const [state, setState] = React.useState(controller.getState());
    const [isFullscreen, setIsFullscreen] = React.useState(false);
    const [status, setStatus] = React.useState<StatusState | null>(null);
    const [runtimeMessage, setRuntimeMessage] = React.useState<string | null>(null);
    const overlayRef = React.useRef<HTMLDivElement | null>(null);
    const iframeRef = React.useRef<HTMLIFrameElement | null>(null);
    const hideTimerRef = React.useRef<number | null>(null);

    const clearHideTimer = React.useCallback(() => {
        if (hideTimerRef.current !== null) {
            window.clearTimeout(hideTimerRef.current);
            hideTimerRef.current = null;
        }
    }, []);

    const showTransientStatus = React.useCallback((nextStatus: StatusState, timeoutMs = 2200) => {
        clearHideTimer();
        setStatus(nextStatus);
        hideTimerRef.current = window.setTimeout(() => {
            setStatus((current) => (current?.kind === nextStatus.kind && current.text === nextStatus.text ? null : current));
            hideTimerRef.current = null;
        }, timeoutMs);
    }, [clearHideTimer]);

    React.useEffect(() => {
        return controller.subscribe(() => {
            setState({ ...controller.getState() });
        });
    }, [controller]);

    React.useEffect(() => {
        const handler = (event: MessageEvent) => {
            const frameWindow = iframeRef.current?.contentWindow;
            if (frameWindow && event.source && event.source !== frameWindow) {
                return;
            }

            const data = event.data as WebPageBridgeMessage | undefined;
            if (!data?.type) {
                return;
            }

            if (data.type === 'web-page:node-click') {
                const nodeId = data.nodeId;
                const tagName = data.tagName;
                if (typeof nodeId === 'string') {
                    controller.selectNode(nodeId);
                    const text = typeof tagName === 'string' ? `${tagName} · ${nodeId}` : nodeId;
                    showTransientStatus({ kind: 'node', text });
                }
                return;
            }

            if (data.type === 'web-page:link-hover') {
                const href = data.href;
                if (typeof href === 'string' && href.trim()) {
                    clearHideTimer();
                    setStatus({ kind: 'link', text: href });
                }
                return;
            }

            if (data.type === 'web-page:link-leave') {
                setStatus((current) => (current?.kind === 'link' ? null : current));
                return;
            }

            if (data.type === 'web-page:link-click') {
                const href = data.href;
                if (typeof href === 'string') {
                    openExternalLink(href);
                }
                return;
            }

            if (data.type === 'web-page:runtime-error') {
                const message = data.message;
                if (typeof message === 'string' && message.trim()) {
                    clearHideTimer();
                    setRuntimeMessage(message.trim());
                    setStatus({ kind: 'runtime', text: `脚本错误: ${message.trim()}` });
                }
                return;
            }

            if (data.type === 'web-page:text-commit') {
                if (typeof data.nodeId !== 'string') {
                    return;
                }

                const result = controller.writebackNodeText(data.nodeId, data.text ?? '');
                showTransientStatus({
                    kind: result.ok ? 'node' : 'runtime',
                    text: result.message,
                });
                return;
            }

            if (data.type === 'web-page:form-commit') {
                if (
                    typeof data.nodeId !== 'string'
                    || (data.tagName !== 'input' && data.tagName !== 'textarea' && data.tagName !== 'select')
                ) {
                    return;
                }

                const result = controller.writebackFormControl({
                    nodeId: data.nodeId,
                    tagName: data.tagName,
                    inputType: data.inputType,
                    value: data.value,
                    checked: data.checked,
                });

                showTransientStatus({
                    kind: result.ok ? 'node' : 'runtime',
                    text: result.message,
                });
            }
        };

        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, [clearHideTimer, controller, showTransientStatus]);

    React.useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(document.fullscreenElement === overlayRef.current);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    React.useEffect(() => {
        const className = 'web-page-view-active';
        const { body } = document;

        if (state.isActive) {
            body.classList.add(className);
        } else {
            body.classList.remove(className);
        }

        return () => body.classList.remove(className);
    }, [state.isActive]);

    React.useEffect(() => {
        return () => clearHideTimer();
    }, [clearHideTimer]);

    React.useEffect(() => {
        setRuntimeMessage(null);
    }, [state.currentPath, state.document?.script, state.document?.template]);

    const template = state.document?.template ?? '';
    const style = state.document?.style ?? '';
    const script = state.document?.script ?? '';
    const metadata = state.document?.metadata ?? {};
    const diagnostics = state.diagnostics ?? [];
    const hasRenderableTemplate = template.trim().length > 0;
    const srcDoc = React.useMemo(() => buildSrcDoc(template, style, script), [template, style, script]);

    if (!state.isActive || !state.document) {
        return null;
    }

    const handleFullscreenToggle = async () => {
        if (typeof document === 'undefined') return;

        if (document.fullscreenElement === overlayRef.current) {
            await document.exitFullscreen?.();
            return;
        }

        await overlayRef.current?.requestFullscreen?.();
    };

    return (
        <div ref={overlayRef} className="web-page-overlay">
            <div className="web-page-toolbar">
                <div className="web-page-toolbar-actions">
                    <button
                        className="web-page-exit-btn"
                        onClick={handleFullscreenToggle}
                        title={isFullscreen ? '退出全屏' : '全屏显示'}
                        aria-label={isFullscreen ? '退出全屏' : '全屏显示'}
                        type="button"
                    >
                        {isFullscreen ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                                <path d="M16 3h3a2 2 0 0 1 2 2v3" />
                                <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
                                <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                            </svg>
                        ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                                <path d="M16 3h3a2 2 0 0 1 2 2v3" />
                                <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
                                <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                                <path d="M9 9 3 3" />
                                <path d="M15 9 21 3" />
                                <path d="M9 15 3 21" />
                                <path d="M15 15 21 21" />
                            </svg>
                        )}
                    </button>
                    <button
                        className="web-page-exit-btn"
                        onClick={() => controller.toggleView()}
                        title="返回源码视图"
                        aria-label="返回源码视图"
                        type="button"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 3h6v6" />
                            <path d="M10 14L21 3" />
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        </svg>
                    </button>
                </div>
            </div>
            {(diagnostics.length > 0 || runtimeMessage) ? (
                <div className="web-page-diagnostics" role="status" aria-live="polite">
                    {diagnostics.map((diagnostic) => (
                        <div
                            key={`${diagnostic.code}-${diagnostic.message}`}
                            className={`web-page-diagnostic ${diagnostic.level}`}
                        >
                            {diagnostic.message}
                        </div>
                    ))}
                    {runtimeMessage ? (
                        <div className="web-page-diagnostic error">{`脚本运行错误：${runtimeMessage}`}</div>
                    ) : null}
                </div>
            ) : null}
            {status ? <div className="web-page-status-bar">{status.text}</div> : null}
            <div className="web-page-frame-wrap">
                {hasRenderableTemplate ? (
                    <iframe
                        ref={iframeRef}
                        className="web-page-frame"
                        sandbox="allow-scripts allow-forms"
                        srcDoc={srcDoc}
                        title={metadata.title || 'web-page-preview'}
                    />
                ) : (
                    <div className="web-page-empty">
                        当前文档缺少 &lt;template&gt; 内容，无法渲染页面视图。
                    </div>
                )}
            </div>
        </div>
    );
};

function openExternalLink(href: string) {
    const allowedProtocols = new Set(['http:', 'https:', 'mailto:']);

    try {
        const url = new URL(href);
        if (!allowedProtocols.has(url.protocol)) {
            return;
        }

        if (window.electronAPI?.openExternal) {
            void window.electronAPI.openExternal(url.toString());
            return;
        }

        window.open(url.toString(), '_blank', 'noopener,noreferrer');
    } catch {
        // ignore invalid links in preview mode
    }
}
