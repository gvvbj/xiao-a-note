"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/modules/extensions/web-page-plugin/index.tsx
var index_exports = {};
__export(index_exports, {
  default: () => WebPagePlugin
});
module.exports = __toCommonJS(index_exports);
var import_view = require("@codemirror/view");
var import_Events = require("@/kernel/core/Events");

// src/kernel/core/ServiceId.ts
var ServiceId = {
  // ─── 核心平台服务 ──────────────────────────────────
  FILE_SYSTEM: "fileSystem",
  WINDOW: "window",
  SETTINGS: "settingsService",
  LAYOUT: "layoutService",
  MENU: "menuService",
  THEME: "themeService",
  TAB: "tabService",
  EXPLORER: "explorerService",
  EDITOR: "editorService",
  OUTLINE: "outlineService",
  WORKSPACE: "workspaceService",
  LOGGER: "loggerService",
  MARKDOWN: "markdownService",
  PLUGIN_MANAGER: "pluginManager",
  // ─── 编辑器基础设施 ────────────────────────────────
  COMMAND_REGISTRY: "commandRegistry",
  EDITOR_EXTENSION_REGISTRY: "editorExtensionRegistry",
  EDITOR_PANEL_REGISTRY: "editorPanelRegistry",
  EDITOR_TOOLBAR_REGISTRY: "editorToolbarRegistry",
  MARKDOWN_DECORATION_REGISTRY: "markdownDecorationRegistry",
  SHORTCUT_REGISTRY: "shortcutRegistry",
  EDITOR_ENGINE: "editorEngine",
  EDITOR_ACTIONS: "editorActionsService",
  WORKSPACE_ACTIONS: "workspaceActionsService",
  UI_ACTIONS: "uiActionsService",
  AI_CAPABILITY_POLICY: "aiCapabilityPolicyService",
  AI_CONTEXT: "aiContextService",
  AI_TASK: "aiTaskService",
  // ─── 插件注册的动态服务 ────────────────────────────
  SPLIT_VIEW: "splitViewService",
  LIFECYCLE: "lifecycleService",
  PERSISTENCE: "persistenceService",
  NOTE: "noteService",
  EDITOR_SYNC: "editor.sync",
  EDITOR_EXPORT: "editorExportService",
  ASSET_TRANSFORMER: "assetTransformer",
  SETTINGS_REGISTRY: "settingsRegistry",
  COMMON_CONTENT: "built-in.common.content",
  COMMON_UTILS_LOGGER: "common-utils.logger",
  WORKSPACE_FACADE: "workspace"
};

// src/modules/extensions/web-page-plugin/index.tsx
var import_types = require("@/kernel/system/plugin/types");

// src/modules/extensions/web-page-plugin/constants/WebPageConstants.ts
var WEB_PAGE_DOCUMENT_TYPE = "web-page";
var WEB_PAGE_DEFAULT_RUNTIME = "vanilla";
var WEB_PAGE_STYLES = `
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

// src/modules/extensions/web-page-plugin/components/WebPageToggleButton.tsx
var import_react = __toESM(require("react"), 1);
var import_jsx_runtime = require("react/jsx-runtime");
var WebPageToggleButton = ({ controller }) => {
  const [state, setState] = import_react.default.useState(controller.getState());
  import_react.default.useEffect(() => {
    return controller.subscribe(() => {
      setState({ ...controller.getState() });
    });
  }, [controller]);
  if (!state.isWebPageFile) {
    return null;
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "button",
    {
      onClick: () => controller.toggleView(),
      className: `web-page-toggle-btn ${state.isActive ? "active" : ""}`,
      title: state.isActive ? "\u5207\u6362\u5230\u6E90\u7801\u89C6\u56FE" : "\u5207\u6362\u5230\u9875\u9762\u89C6\u56FE",
      "aria-label": state.isActive ? "\u5207\u6362\u5230\u6E90\u7801\u89C6\u56FE" : "\u5207\u6362\u5230\u9875\u9762\u89C6\u56FE",
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "3", y: "4", width: "18", height: "16", rx: "2" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M8 20V8" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M8 12H21" })
      ] })
    }
  );
};

// src/modules/extensions/web-page-plugin/components/WebPageView.tsx
var import_react2 = __toESM(require("react"), 1);
var import_jsx_runtime2 = require("react/jsx-runtime");
function buildSrcDoc(template, style, script) {
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
    "  return '\u672A\u77E5\u811A\u672C\u9519\u8BEF';",
    "};",
    "",
    "const emit = (payload) => window.parent.postMessage(payload, '*');",
    "",
    "const handleMouseOver = (event) => {",
    "  const link = getClosestLink(event.target);",
    "  if (!link) return;",
    "  const href = link.getAttribute('href');",
    "  if (!href) return;",
    "  emit({ type: 'web-page:link-hover', href });",
    "};",
    "",
    "const handleMouseOut = (event) => {",
    "  const currentLink = getClosestLink(event.target);",
    "  if (!currentLink) return;",
    "  const nextLink = getClosestLink(event.relatedTarget);",
    "  if (currentLink === nextLink) return;",
    "  emit({ type: 'web-page:link-leave' });",
    "};",
    "",
    "const handleClick = (event) => {",
    "  const link = getClosestLink(event.target);",
    "  if (link) {",
    "    event.preventDefault();",
    "    event.stopPropagation();",
    "    if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();",
    "    const href = link.getAttribute('href');",
    "    if (href) {",
    "      emit({ type: 'web-page:link-click', href });",
    "    }",
    "    return;",
    "  }",
    "",
    "  const node = getClosestNode(event.target);",
    "  if (!node) return;",
    "  const nodeId = node.getAttribute('data-node-id');",
    "  if (!nodeId) return;",
    "  emit({ type: 'web-page:node-click', nodeId, tagName: node.tagName.toLowerCase() });",
    "};",
    "",
    "const handleSubmit = (event) => {",
    "  const form = event.target;",
    "  if (!(form instanceof HTMLFormElement)) return;",
    "  event.preventDefault();",
    "};",
    "",
    "const emitTextCommit = (element) => {",
    "  if (!(element instanceof HTMLElement)) return;",
    `  const node = element.closest('[data-node-id][contenteditable="true"]');`,
    "  if (!(node instanceof HTMLElement)) return;",
    "  const nodeId = node.getAttribute('data-node-id');",
    "  if (!nodeId) return;",
    "  if (node !== element) return;",
    "  emit({ type: 'web-page:text-commit', nodeId, text: node.textContent || '' });",
    "};",
    "",
    "const emitFormCommit = (element) => {",
    "  if (!(element instanceof HTMLElement)) return;",
    "  const node = element.closest('[data-node-id]');",
    "  if (!(node instanceof HTMLElement)) return;",
    "  const nodeId = node.getAttribute('data-node-id');",
    "  if (!nodeId) return;",
    "  const tagName = node.tagName.toLowerCase();",
    "  if (tagName === 'input') {",
    "    const input = node;",
    "    const inputType = (input.getAttribute('type') || 'text').toLowerCase();",
    "    emit({ type: 'web-page:form-commit', nodeId, tagName: 'input', inputType, value: input.value, checked: input.checked });",
    "    return;",
    "  }",
    "  if (tagName === 'textarea') {",
    "    emit({ type: 'web-page:form-commit', nodeId, tagName: 'textarea', value: node.value });",
    "    return;",
    "  }",
    "  if (tagName === 'select') {",
    "    emit({ type: 'web-page:form-commit', nodeId, tagName: 'select', value: node.value });",
    "  }",
    "};",
    "",
    "const handleChange = (event) => {",
    "  const target = event.target;",
    "  if (!(target instanceof HTMLElement)) return;",
    "  const tagName = target.tagName.toLowerCase();",
    "  if (tagName === 'select') {",
    "    emitFormCommit(target);",
    "    return;",
    "  }",
    "  if (!(target instanceof HTMLInputElement)) return;",
    "  const inputType = (target.type || 'text').toLowerCase();",
    "  if (inputType === 'checkbox' || inputType === 'radio') {",
    "    emitFormCommit(target);",
    "  }",
    "};",
    "",
    "const handleBlur = (event) => {",
    "  const target = event.target;",
    "  if (!(target instanceof HTMLElement)) return;",
    "  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {",
    "    emitFormCommit(target);",
    "    return;",
    "  }",
    "  emitTextCommit(target);",
    "};",
    "",
    "window.addEventListener('error', (event) => {",
    "  emit({ type: 'web-page:runtime-error', message: normalizeError(event.error || event.message) });",
    "});",
    "window.addEventListener('unhandledrejection', (event) => {",
    "  emit({ type: 'web-page:runtime-error', message: normalizeError(event.reason) });",
    "});",
    "",
    "document.addEventListener('mouseover', handleMouseOver, true);",
    "document.addEventListener('mouseout', handleMouseOut, true);",
    "document.addEventListener('click', handleClick, true);",
    "document.addEventListener('change', handleChange, true);",
    "document.addEventListener('focusout', handleBlur, true);",
    "document.addEventListener('submit', handleSubmit, true);"
  ].join("\n");
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
<script>${bridgeScript}<\/script>
<script>${script}<\/script>
</body>
</html>`;
}
var WebPageView = ({ controller }) => {
  const [state, setState] = import_react2.default.useState(controller.getState());
  const [isFullscreen, setIsFullscreen] = import_react2.default.useState(false);
  const [status, setStatus] = import_react2.default.useState(null);
  const [runtimeMessage, setRuntimeMessage] = import_react2.default.useState(null);
  const overlayRef = import_react2.default.useRef(null);
  const iframeRef = import_react2.default.useRef(null);
  const hideTimerRef = import_react2.default.useRef(null);
  const clearHideTimer = import_react2.default.useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);
  const showTransientStatus = import_react2.default.useCallback((nextStatus, timeoutMs = 2200) => {
    clearHideTimer();
    setStatus(nextStatus);
    hideTimerRef.current = window.setTimeout(() => {
      setStatus((current) => current?.kind === nextStatus.kind && current.text === nextStatus.text ? null : current);
      hideTimerRef.current = null;
    }, timeoutMs);
  }, [clearHideTimer]);
  import_react2.default.useEffect(() => {
    return controller.subscribe(() => {
      setState({ ...controller.getState() });
    });
  }, [controller]);
  import_react2.default.useEffect(() => {
    const handler = (event) => {
      const frameWindow = iframeRef.current?.contentWindow;
      if (frameWindow && event.source && event.source !== frameWindow) {
        return;
      }
      const data = event.data;
      if (!data?.type) {
        return;
      }
      if (data.type === "web-page:node-click") {
        const nodeId = data.nodeId;
        const tagName = data.tagName;
        if (typeof nodeId === "string") {
          controller.selectNode(nodeId);
          const text = typeof tagName === "string" ? `${tagName} \xB7 ${nodeId}` : nodeId;
          showTransientStatus({ kind: "node", text });
        }
        return;
      }
      if (data.type === "web-page:link-hover") {
        const href = data.href;
        if (typeof href === "string" && href.trim()) {
          clearHideTimer();
          setStatus({ kind: "link", text: href });
        }
        return;
      }
      if (data.type === "web-page:link-leave") {
        setStatus((current) => current?.kind === "link" ? null : current);
        return;
      }
      if (data.type === "web-page:link-click") {
        const href = data.href;
        if (typeof href === "string") {
          openExternalLink(href);
        }
        return;
      }
      if (data.type === "web-page:runtime-error") {
        const message = data.message;
        if (typeof message === "string" && message.trim()) {
          clearHideTimer();
          setRuntimeMessage(message.trim());
          setStatus({ kind: "runtime", text: `\u811A\u672C\u9519\u8BEF: ${message.trim()}` });
        }
        return;
      }
      if (data.type === "web-page:text-commit") {
        if (typeof data.nodeId !== "string") {
          return;
        }
        const result = controller.writebackNodeText(data.nodeId, data.text ?? "");
        showTransientStatus({
          kind: result.ok ? "node" : "runtime",
          text: result.message
        });
        return;
      }
      if (data.type === "web-page:form-commit") {
        if (typeof data.nodeId !== "string" || data.tagName !== "input" && data.tagName !== "textarea" && data.tagName !== "select") {
          return;
        }
        const result = controller.writebackFormControl({
          nodeId: data.nodeId,
          tagName: data.tagName,
          inputType: data.inputType,
          value: data.value,
          checked: data.checked
        });
        showTransientStatus({
          kind: result.ok ? "node" : "runtime",
          text: result.message
        });
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [clearHideTimer, controller, showTransientStatus]);
  import_react2.default.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === overlayRef.current);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);
  import_react2.default.useEffect(() => {
    const className = "web-page-view-active";
    const { body } = document;
    if (state.isActive) {
      body.classList.add(className);
    } else {
      body.classList.remove(className);
    }
    return () => body.classList.remove(className);
  }, [state.isActive]);
  import_react2.default.useEffect(() => {
    return () => clearHideTimer();
  }, [clearHideTimer]);
  import_react2.default.useEffect(() => {
    setRuntimeMessage(null);
  }, [state.currentPath, state.document?.script, state.document?.template]);
  const template = state.document?.template ?? "";
  const style = state.document?.style ?? "";
  const script = state.document?.script ?? "";
  const metadata = state.document?.metadata ?? {};
  const diagnostics = state.diagnostics ?? [];
  const hasRenderableTemplate = template.trim().length > 0;
  const srcDoc = import_react2.default.useMemo(() => buildSrcDoc(template, style, script), [template, style, script]);
  if (!state.isActive || !state.document) {
    return null;
  }
  const handleFullscreenToggle = async () => {
    if (typeof document === "undefined") return;
    if (document.fullscreenElement === overlayRef.current) {
      await document.exitFullscreen?.();
      return;
    }
    await overlayRef.current?.requestFullscreen?.();
  };
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { ref: overlayRef, className: "web-page-overlay", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "web-page-toolbar", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "web-page-toolbar-actions", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "button",
        {
          className: "web-page-exit-btn",
          onClick: handleFullscreenToggle,
          title: isFullscreen ? "\u9000\u51FA\u5168\u5C4F" : "\u5168\u5C4F\u663E\u793A",
          "aria-label": isFullscreen ? "\u9000\u51FA\u5168\u5C4F" : "\u5168\u5C4F\u663E\u793A",
          type: "button",
          children: isFullscreen ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M8 3H5a2 2 0 0 0-2 2v3" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M16 3h3a2 2 0 0 1 2 2v3" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M8 21H5a2 2 0 0 1-2-2v-3" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M16 21h3a2 2 0 0 0 2-2v-3" })
          ] }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M8 3H5a2 2 0 0 0-2 2v3" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M16 3h3a2 2 0 0 1 2 2v3" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M8 21H5a2 2 0 0 1-2-2v-3" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M16 21h3a2 2 0 0 0 2-2v-3" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M9 9 3 3" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M15 9 21 3" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M9 15 3 21" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M15 15 21 21" })
          ] })
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "button",
        {
          className: "web-page-exit-btn",
          onClick: () => controller.toggleView(),
          title: "\u8FD4\u56DE\u6E90\u7801\u89C6\u56FE",
          "aria-label": "\u8FD4\u56DE\u6E90\u7801\u89C6\u56FE",
          type: "button",
          children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M15 3h6v6" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M10 14L21 3" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" })
          ] })
        }
      )
    ] }) }),
    diagnostics.length > 0 || runtimeMessage ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "web-page-diagnostics", role: "status", "aria-live": "polite", children: [
      diagnostics.map((diagnostic) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "div",
        {
          className: `web-page-diagnostic ${diagnostic.level}`,
          children: diagnostic.message
        },
        `${diagnostic.code}-${diagnostic.message}`
      )),
      runtimeMessage ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "web-page-diagnostic error", children: `\u811A\u672C\u8FD0\u884C\u9519\u8BEF\uFF1A${runtimeMessage}` }) : null
    ] }) : null,
    status ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "web-page-status-bar", children: status.text }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "web-page-frame-wrap", children: hasRenderableTemplate ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      "iframe",
      {
        ref: iframeRef,
        className: "web-page-frame",
        sandbox: "allow-scripts allow-forms",
        srcDoc,
        title: metadata.title || "web-page-preview"
      }
    ) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "web-page-empty", children: "\u5F53\u524D\u6587\u6863\u7F3A\u5C11 <template> \u5185\u5BB9\uFF0C\u65E0\u6CD5\u6E32\u67D3\u9875\u9762\u89C6\u56FE\u3002" }) })
  ] });
};
function openExternalLink(href) {
  const allowedProtocols = /* @__PURE__ */ new Set(["http:", "https:", "mailto:"]);
  try {
    const url = new URL(href);
    if (!allowedProtocols.has(url.protocol)) {
      return;
    }
    if (window.electronAPI?.openExternal) {
      void window.electronAPI.openExternal(url.toString());
      return;
    }
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  } catch {
  }
}

// src/modules/extensions/web-page-plugin/constants/WebPageSchema.ts
var WEB_PAGE_SCHEMA_VERSION = "1";
var WEB_PAGE_DEFAULT_EDITABLE_MODE = "structured";
var WEB_PAGE_ALLOWED_RUNTIMES = [WEB_PAGE_DEFAULT_RUNTIME];
var WEB_PAGE_ALLOWED_EDITABLE_MODES = [WEB_PAGE_DEFAULT_EDITABLE_MODE];
var WEB_PAGE_DIAGNOSTIC_CODES = {
  MISSING_TEMPLATE: "missing-template",
  DUPLICATE_NODE_ID: "duplicate-node-id",
  UNSUPPORTED_RUNTIME: "unsupported-runtime",
  UNSUPPORTED_EDITABLE_MODE: "unsupported-editable-mode",
  UNSUPPORTED_VERSION: "unsupported-version"
};
var WEB_PAGE_SCHEMA_DEFAULTS = {
  runtime: WEB_PAGE_DEFAULT_RUNTIME,
  editable: WEB_PAGE_DEFAULT_EDITABLE_MODE,
  version: WEB_PAGE_SCHEMA_VERSION
};

// src/modules/extensions/web-page-plugin/parser/WebPageDocumentParser.ts
var WebPageDocumentParser = class {
  static parse(content) {
    if (typeof content !== "string") {
      return this.emptyModel("");
    }
    const { metadata, raw, body } = this.parseFrontmatter(content);
    const template = this.extractSection(body, "template");
    const style = this.extractSection(body, "style");
    const script = this.extractSection(body, "script");
    const { nodeIds, duplicateNodeIds } = this.extractNodeInfo(template);
    return {
      isWebPageFile: metadata.type === WEB_PAGE_DOCUMENT_TYPE,
      frontmatterRaw: raw,
      body,
      metadata: {
        runtime: WEB_PAGE_SCHEMA_DEFAULTS.runtime,
        editable: WEB_PAGE_SCHEMA_DEFAULTS.editable,
        version: WEB_PAGE_SCHEMA_DEFAULTS.version,
        ...metadata
      },
      template,
      style,
      script,
      nodeIds,
      duplicateNodeIds
    };
  }
  static isWebPageFile(content) {
    return this.parse(content).isWebPageFile;
  }
  static locateTemplateNode(template, nodeId) {
    if (!template || !nodeId) {
      return null;
    }
    const attributePattern = new RegExp(`data-node-id\\s*=\\s*["']${this.escapeRegExp(nodeId)}["']`, "i");
    const openTagPattern = /<([A-Za-z][\w:-]*)(\s[^<>]*?)?>/g;
    let match;
    while ((match = openTagPattern.exec(template)) !== null) {
      const fullTag = match[0];
      if (!attributePattern.test(fullTag)) {
        continue;
      }
      const tagName = match[1];
      const start = match.index;
      if (this.isSelfClosingTag(fullTag, tagName)) {
        return {
          nodeId,
          section: "template",
          tagName,
          start,
          end: start + fullTag.length,
          snippet: fullTag
        };
      }
      const end = this.findMatchingTagEnd(template, tagName, openTagPattern.lastIndex);
      if (end === null) {
        return null;
      }
      return {
        nodeId,
        section: "template",
        tagName,
        start,
        end,
        snippet: template.slice(start, end)
      };
    }
    return null;
  }
  static parseFrontmatter(content) {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (!match) {
      return { metadata: {}, raw: "", body: content };
    }
    const raw = match[0];
    const body = content.slice(raw.length);
    const yaml = match[1];
    const metadata = {};
    for (const line of yaml.split(/\r?\n/)) {
      const fieldMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.+)\s*$/);
      if (!fieldMatch) continue;
      metadata[fieldMatch[1]] = fieldMatch[2].trim();
    }
    return { metadata, raw, body };
  }
  static extractSection(body, tag) {
    const match = body.match(new RegExp(`<${tag}>\\s*([\\s\\S]*?)\\s*<\\/${tag}>`, "i"));
    return match ? match[1].trim() : "";
  }
  static extractNodeInfo(template) {
    const ids = /* @__PURE__ */ new Set();
    const duplicateIds = /* @__PURE__ */ new Set();
    const pattern = /data-node-id\s*=\s*["']([^"']+)["']/g;
    let match;
    while ((match = pattern.exec(template)) !== null) {
      const nextId = match[1].trim();
      if (!nextId) {
        continue;
      }
      if (ids.has(nextId)) {
        duplicateIds.add(nextId);
        continue;
      }
      ids.add(nextId);
    }
    return {
      nodeIds: [...ids],
      duplicateNodeIds: [...duplicateIds]
    };
  }
  static emptyModel(content) {
    return {
      isWebPageFile: false,
      frontmatterRaw: "",
      body: content,
      metadata: {},
      template: "",
      style: "",
      script: "",
      nodeIds: [],
      duplicateNodeIds: []
    };
  }
  static findMatchingTagEnd(template, tagName, fromIndex) {
    const tokenPattern = new RegExp(`<(/?)${this.escapeRegExp(tagName)}(?:\\s[^<>]*?)?>`, "gi");
    tokenPattern.lastIndex = fromIndex;
    let depth = 1;
    let match;
    while ((match = tokenPattern.exec(template)) !== null) {
      const token = match[0];
      const isClosing = match[1] === "/";
      if (!isClosing && this.isSelfClosingTag(token, tagName)) {
        continue;
      }
      depth += isClosing ? -1 : 1;
      if (depth === 0) {
        return match.index + token.length;
      }
    }
    return null;
  }
  static isSelfClosingTag(tagSource, tagName) {
    return /\/>\s*$/.test(tagSource) || this.isVoidElement(tagName);
  }
  static isVoidElement(tagName) {
    return /^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/i.test(tagName);
  }
  static escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
};

// src/modules/extensions/web-page-plugin/services/WebPageSchemaValidator.ts
var WebPageSchemaValidator = class {
  static validate(document2) {
    if (!document2.isWebPageFile) {
      return [];
    }
    const diagnostics = [];
    if (!document2.template.trim()) {
      diagnostics.push({
        code: WEB_PAGE_DIAGNOSTIC_CODES.MISSING_TEMPLATE,
        level: "error",
        message: "\u5F53\u524D\u6587\u6863\u7F3A\u5C11 <template> \u533A\u5757\uFF0C\u9875\u9762\u89C6\u56FE\u65E0\u6CD5\u6E32\u67D3\u3002"
      });
    }
    if (document2.duplicateNodeIds.length > 0) {
      diagnostics.push({
        code: WEB_PAGE_DIAGNOSTIC_CODES.DUPLICATE_NODE_ID,
        level: "error",
        message: `\u53D1\u73B0\u91CD\u590D\u7684 data-node-id\uFF1A${document2.duplicateNodeIds.join(", ")}`
      });
    }
    if (!this.isSupportedRuntime(document2.metadata.runtime)) {
      diagnostics.push({
        code: WEB_PAGE_DIAGNOSTIC_CODES.UNSUPPORTED_RUNTIME,
        level: "warning",
        message: `runtime=${document2.metadata.runtime} \u5F53\u524D\u672A\u6B63\u5F0F\u652F\u6301\uFF0C\u5C06\u6309 ${WEB_PAGE_SCHEMA_DEFAULTS.runtime} \u9884\u89C8\u3002`
      });
    }
    if (!this.isSupportedEditableMode(document2.metadata.editable)) {
      diagnostics.push({
        code: WEB_PAGE_DIAGNOSTIC_CODES.UNSUPPORTED_EDITABLE_MODE,
        level: "warning",
        message: `editable=${document2.metadata.editable} \u5F53\u524D\u672A\u6B63\u5F0F\u652F\u6301\uFF0C\u5C06\u6309 ${WEB_PAGE_SCHEMA_DEFAULTS.editable} \u5904\u7406\u3002`
      });
    }
    if (!this.isSupportedVersion(document2.metadata.version)) {
      diagnostics.push({
        code: WEB_PAGE_DIAGNOSTIC_CODES.UNSUPPORTED_VERSION,
        level: "warning",
        message: `version=${document2.metadata.version} \u5F53\u524D\u672A\u6B63\u5F0F\u652F\u6301\uFF0C\u63A8\u8350\u4F7F\u7528 ${WEB_PAGE_SCHEMA_VERSION}\u3002`
      });
    }
    return diagnostics;
  }
  static isSupportedRuntime(value) {
    return WEB_PAGE_ALLOWED_RUNTIMES.includes(value ?? WEB_PAGE_SCHEMA_DEFAULTS.runtime);
  }
  static isSupportedEditableMode(value) {
    return WEB_PAGE_ALLOWED_EDITABLE_MODES.includes(value ?? WEB_PAGE_SCHEMA_DEFAULTS.editable);
  }
  static isSupportedVersion(value) {
    return (value ?? WEB_PAGE_SCHEMA_DEFAULTS.version) === WEB_PAGE_SCHEMA_VERSION;
  }
};

// src/modules/extensions/web-page-plugin/services/WebPageSourcePatchService.ts
var WebPageSourcePatchService = class {
  getNodeLocation(document2, nodeId) {
    const template = document2?.template;
    if (!template || !nodeId) {
      return null;
    }
    return WebPageDocumentParser.locateTemplateNode(template, nodeId);
  }
  createReplaceNodeTextPlan(nodeId) {
    return {
      operation: "replace-node-text",
      nodeId,
      section: "template"
    };
  }
  createReplaceNodeAttributesPlan(nodeId) {
    return {
      operation: "replace-node-attributes",
      nodeId,
      section: "template"
    };
  }
  createMoveNodePlan(nodeId) {
    return {
      operation: "move-node",
      nodeId,
      section: "template"
    };
  }
  replaceNodeText(document2, request) {
    return this.patchTemplateNode(document2, request.nodeId, (snippet, location) => {
      if (!snippet.includes(`</${location.tagName}>`)) {
        return {
          ok: false,
          message: `\u8282\u70B9 ${request.nodeId} \u662F\u81EA\u95ED\u5408\u8282\u70B9\uFF0C\u5F53\u524D\u4E0D\u652F\u6301\u6587\u672C\u56DE\u5199\u3002`
        };
      }
      const match = snippet.match(
        new RegExp(`^(<${location.tagName}\\b[^>]*>)([\\s\\S]*?)(</${location.tagName}>$)`, "i")
      );
      if (!match) {
        return {
          ok: false,
          message: `\u8282\u70B9 ${request.nodeId} \u7ED3\u6784\u4E0D\u7B26\u5408\u6587\u672C\u56DE\u5199\u6761\u4EF6\u3002`
        };
      }
      const [, openTag, innerContent, closeTag] = match;
      if (this.containsNestedElements(innerContent)) {
        return {
          ok: false,
          message: `\u8282\u70B9 ${request.nodeId} \u5305\u542B\u5D4C\u5957\u7ED3\u6784\uFF0C\u5F53\u524D\u4EC5\u652F\u6301\u7EAF\u6587\u672C\u8282\u70B9\u56DE\u5199\u3002`
        };
      }
      const nextInnerContent = this.replaceInnerTextPreservingPadding(
        innerContent,
        this.escapeHtmlText(request.text)
      );
      return {
        ok: true,
        snippet: `${openTag}${nextInnerContent}${closeTag}`
      };
    });
  }
  syncFormControlValue(document2, request) {
    return this.patchTemplateNode(document2, request.nodeId, (snippet, location) => {
      switch (request.tagName) {
        case "input":
          return this.patchInput(snippet, request, location);
        case "textarea":
          return this.patchTextarea(snippet, request, location);
        case "select":
          return this.patchSelect(snippet, request, location);
        default:
          return {
            ok: false,
            message: `\u8282\u70B9 ${request.nodeId} \u7684\u63A7\u4EF6\u7C7B\u578B\u6682\u4E0D\u652F\u6301\u56DE\u5199\u3002`
          };
      }
    });
  }
  replaceNodeAttributes(document2, request) {
    return this.patchTemplateNode(document2, request.nodeId, (snippet) => {
      const nextSnippet = this.applyAttributesToTagSource(snippet, request.attributes);
      if (!nextSnippet) {
        return {
          ok: false,
          message: `\u8282\u70B9 ${request.nodeId} \u7684\u5C5E\u6027\u56DE\u5199\u8BF7\u6C42\u65E0\u6548\u3002`
        };
      }
      return {
        ok: true,
        snippet: nextSnippet
      };
    });
  }
  patchTemplateNode(document2, nodeId, patcher) {
    if (!document2?.isWebPageFile) {
      return {
        ok: false,
        message: "\u5F53\u524D\u6587\u6863\u4E0D\u662F web-page\uFF0C\u65E0\u6CD5\u6267\u884C\u6E90\u7801\u56DE\u5199\u3002"
      };
    }
    const location = this.getNodeLocation(document2, nodeId);
    if (!location) {
      return {
        ok: false,
        message: `\u672A\u627E\u5230\u8282\u70B9 ${nodeId} \u5BF9\u5E94\u7684\u6E90\u7801\u4F4D\u7F6E\u3002`
      };
    }
    const patched = patcher(location.snippet, location);
    if (!patched.ok) {
      return patched;
    }
    const nextTemplate = document2.template.slice(0, location.start) + patched.snippet + document2.template.slice(location.end);
    const nextBody = this.replaceSectionContent(document2.body, "template", nextTemplate);
    if (nextBody === null) {
      return {
        ok: false,
        message: "\u672A\u80FD\u5728\u6E90\u7801\u4E2D\u5B9A\u4F4D <template> \u533A\u5757\uFF0C\u65E0\u6CD5\u5B8C\u6210\u56DE\u5199\u3002"
      };
    }
    return {
      ok: true,
      content: `${document2.frontmatterRaw}${nextBody}`
    };
  }
  patchInput(snippet, request, location) {
    if (location.tagName.toLowerCase() !== "input") {
      return {
        ok: false,
        message: `\u8282\u70B9 ${request.nodeId} \u5B9E\u9645\u4E0D\u662F input\uFF0C\u65E0\u6CD5\u6309\u8F93\u5165\u6846\u65B9\u5F0F\u56DE\u5199\u3002`
      };
    }
    const normalizedType = (request.inputType ?? "").toLowerCase();
    if (normalizedType === "checkbox" || normalizedType === "radio") {
      const nextSnippet2 = this.setBooleanAttribute(snippet, "checked", Boolean(request.checked));
      return {
        ok: true,
        snippet: nextSnippet2
      };
    }
    const nextSnippet = this.setAttribute(
      snippet,
      "value",
      this.escapeAttributeValue(request.value ?? "")
    );
    return {
      ok: true,
      snippet: nextSnippet
    };
  }
  patchTextarea(snippet, request, location) {
    if (location.tagName.toLowerCase() !== "textarea") {
      return {
        ok: false,
        message: `\u8282\u70B9 ${request.nodeId} \u5B9E\u9645\u4E0D\u662F textarea\uFF0C\u65E0\u6CD5\u6309\u6587\u672C\u57DF\u65B9\u5F0F\u56DE\u5199\u3002`
      };
    }
    const match = snippet.match(/^<textarea\b[^>]*>([\s\S]*?)<\/textarea>$/i);
    if (!match) {
      return {
        ok: false,
        message: `\u8282\u70B9 ${request.nodeId} \u7684 textarea \u7ED3\u6784\u5F02\u5E38\uFF0C\u65E0\u6CD5\u56DE\u5199\u3002`
      };
    }
    const nextInner = this.replaceInnerTextPreservingPadding(
      match[1],
      this.escapeHtmlText(request.value ?? "")
    );
    return {
      ok: true,
      snippet: snippet.replace(match[1], nextInner)
    };
  }
  patchSelect(snippet, request, location) {
    if (location.tagName.toLowerCase() !== "select") {
      return {
        ok: false,
        message: `\u8282\u70B9 ${request.nodeId} \u5B9E\u9645\u4E0D\u662F select\uFF0C\u65E0\u6CD5\u6309\u4E0B\u62C9\u6846\u65B9\u5F0F\u56DE\u5199\u3002`
      };
    }
    let matched = false;
    const targetValue = request.value ?? "";
    const nextSnippet = snippet.replace(
      /<option\b([^>]*)>([\s\S]*?)<\/option>/gi,
      (fullMatch, rawAttributes, innerContent) => {
        const attributes = rawAttributes.replace(/\sselected(?:=(["']).*?\1)?/gi, "");
        const optionValueMatch = attributes.match(/\svalue\s*=\s*(["'])(.*?)\1/i);
        const optionValue = optionValueMatch?.[2] ?? this.decodeHtmlText(innerContent.trim());
        const shouldSelect = !matched && optionValue === targetValue;
        if (shouldSelect) {
          matched = true;
          return `<option${attributes} selected>${innerContent}</option>`;
        }
        return `<option${attributes}>${innerContent}</option>`;
      }
    );
    if (!matched) {
      return {
        ok: false,
        message: `\u8282\u70B9 ${request.nodeId} \u672A\u627E\u5230\u503C\u4E3A ${targetValue} \u7684 option\uFF0C\u65E0\u6CD5\u56DE\u5199\u3002`
      };
    }
    return {
      ok: true,
      snippet: nextSnippet
    };
  }
  replaceSectionContent(body, tag, nextContent) {
    const pattern = new RegExp(`(<${tag}>)([\\s\\S]*?)(<\\/${tag}>)`, "i");
    if (!pattern.test(body)) {
      return null;
    }
    return body.replace(pattern, (_fullMatch, openTag, innerContent, closeTag) => {
      const nextInner = this.preserveSectionSpacing(innerContent, nextContent);
      return `${openTag}${nextInner}${closeTag}`;
    });
  }
  preserveSectionSpacing(originalInnerContent, nextContent) {
    const hasLeadingNewline = /^\s*\r?\n/.test(originalInnerContent);
    const hasTrailingNewline = /\r?\n\s*$/.test(originalInnerContent);
    if (!nextContent.trim()) {
      return "";
    }
    const prefix = hasLeadingNewline || nextContent.includes("\n") ? "\n" : "";
    const suffix = hasTrailingNewline || nextContent.includes("\n") ? "\n" : "";
    return `${prefix}${nextContent}${suffix}`;
  }
  containsNestedElements(innerContent) {
    return /<[A-Za-z][\w:-]*\b/.test(innerContent);
  }
  replaceInnerTextPreservingPadding(originalInnerContent, nextText) {
    const leadingWhitespace = originalInnerContent.match(/^\s*/)?.[0] ?? "";
    const trailingWhitespace = originalInnerContent.match(/\s*$/)?.[0] ?? "";
    return `${leadingWhitespace}${nextText}${trailingWhitespace}`;
  }
  applyAttributesToTagSource(snippet, attributes) {
    const openingTagMatch = snippet.match(/^<([A-Za-z][\w:-]*)(\s[^<>]*?)?(\/?)>/);
    if (!openingTagMatch) {
      return null;
    }
    const openingTag = openingTagMatch[0];
    let nextOpeningTag = openingTag;
    for (const [attributeName, attributeValue] of Object.entries(attributes)) {
      if (!this.isWritableAttributeName(attributeName)) {
        return null;
      }
      if (attributeName === "data-node-id") {
        return null;
      }
      if (typeof attributeValue === "boolean") {
        nextOpeningTag = this.setBooleanAttribute(nextOpeningTag, attributeName, attributeValue);
        continue;
      }
      if (attributeValue === null || attributeValue === void 0) {
        nextOpeningTag = this.removeAttribute(nextOpeningTag, attributeName);
        continue;
      }
      nextOpeningTag = this.setAttribute(
        nextOpeningTag,
        attributeName,
        this.escapeAttributeValue(attributeValue)
      );
    }
    return `${nextOpeningTag}${snippet.slice(openingTag.length)}`;
  }
  setAttribute(tagSource, attributeName, attributeValue) {
    const attributePattern = new RegExp(`\\s${attributeName}\\s*=\\s*(["']).*?\\1`, "i");
    if (attributePattern.test(tagSource)) {
      return tagSource.replace(attributePattern, ` ${attributeName}="${attributeValue}"`);
    }
    return tagSource.replace(/\s*(\/?>)$/, (_tail, closer) => {
      const suffix = closer === "/>" ? " />" : ">";
      return ` ${attributeName}="${attributeValue}"${suffix}`;
    });
  }
  setBooleanAttribute(tagSource, attributeName, enabled) {
    const attributePattern = new RegExp(`\\s${attributeName}(?:\\s*=\\s*(["']).*?\\1)?`, "i");
    if (enabled) {
      if (attributePattern.test(tagSource)) {
        return tagSource.replace(attributePattern, ` ${attributeName}`);
      }
      return tagSource.replace(/\s*(\/?>)$/, (_tail, closer) => {
        const suffix = closer === "/>" ? " />" : ">";
        return ` ${attributeName}${suffix}`;
      });
    }
    return tagSource.replace(attributePattern, "");
  }
  removeAttribute(tagSource, attributeName) {
    const attributePattern = new RegExp(`\\s${attributeName}(?:\\s*=\\s*(["']).*?\\1)?`, "i");
    return tagSource.replace(attributePattern, "");
  }
  isWritableAttributeName(attributeName) {
    return /^[A-Za-z_][A-Za-z0-9_:-]*$/.test(attributeName);
  }
  escapeHtmlText(value) {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  decodeHtmlText(value) {
    return value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
  }
  escapeAttributeValue(value) {
    return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  }
};

// src/modules/extensions/web-page-plugin/services/WebPageController.ts
var WebPageController = class {
  constructor(context) {
    this.context = context;
  }
  listeners = /* @__PURE__ */ new Set();
  sourcePatchService = new WebPageSourcePatchService();
  editorView = null;
  resolutionNonce = 0;
  state = {
    isWebPageFile: false,
    isActive: false,
    currentPath: null,
    document: null,
    diagnostics: [],
    selectedNodeId: null
  };
  getState() {
    return this.state;
  }
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  setEditorView(view) {
    this.editorView = view;
  }
  handleContentChange(content, path) {
    const currentNonce = ++this.resolutionNonce;
    void this.resolveDocument(content, path ?? this.state.currentPath ?? null, currentNonce);
  }
  toggleView() {
    if (!this.state.isWebPageFile) {
      return;
    }
    this.state = {
      ...this.state,
      isActive: !this.state.isActive
    };
    this.notify();
  }
  selectNode(nodeId) {
    if (this.state.selectedNodeId === nodeId) {
      return;
    }
    this.state = {
      ...this.state,
      selectedNodeId: nodeId
    };
    this.notify();
  }
  getNodeLocation(nodeId) {
    return this.sourcePatchService.getNodeLocation(this.state.document, nodeId);
  }
  writebackNodeText(nodeId, text) {
    const result = this.sourcePatchService.replaceNodeText(this.state.document, {
      nodeId,
      text
    });
    return this.applyPatchedDocument(result, `\u5DF2\u5199\u56DE\u8282\u70B9\u6587\u672C\uFF1A${nodeId}`);
  }
  writebackFormControl(request) {
    const result = this.sourcePatchService.syncFormControlValue(this.state.document, request);
    return this.applyPatchedDocument(result, `\u5DF2\u5199\u56DE\u63A7\u4EF6\u503C\uFF1A${request.nodeId}`);
  }
  writebackNodeAttributes(request) {
    const result = this.sourcePatchService.replaceNodeAttributes(this.state.document, request);
    return this.applyPatchedDocument(result, `\u5DF2\u5199\u56DE\u8282\u70B9\u5C5E\u6027\uFF1A${request.nodeId}`);
  }
  dispose() {
    this.listeners.clear();
    this.editorView = null;
  }
  notify() {
    for (const listener of this.listeners) {
      listener();
    }
  }
  async resolveDocument(content, path, nonce) {
    const previousState = this.state;
    let nextDocument = WebPageDocumentParser.parse(content);
    if (!nextDocument.isWebPageFile && path) {
      const recoveredDocument = await this.tryRecoverDocument(content, path, previousState);
      if (recoveredDocument) {
        nextDocument = recoveredDocument;
      }
    }
    if (nonce !== this.resolutionNonce) {
      return;
    }
    const pathChanged = path !== void 0 && path !== previousState.currentPath;
    const wasWebPage = previousState.isWebPageFile;
    const diagnostics = nextDocument.isWebPageFile ? WebPageSchemaValidator.validate(nextDocument) : [];
    const selectedNodeId = previousState.selectedNodeId && nextDocument.nodeIds.includes(previousState.selectedNodeId) ? previousState.selectedNodeId : null;
    const shouldAutoActivate = pathChanged && nextDocument.isWebPageFile;
    this.state = {
      ...previousState,
      isWebPageFile: nextDocument.isWebPageFile,
      isActive: shouldAutoActivate ? true : previousState.isActive && nextDocument.isWebPageFile,
      currentPath: path ?? previousState.currentPath ?? null,
      document: nextDocument.isWebPageFile ? nextDocument : null,
      diagnostics,
      selectedNodeId
    };
    if (this.state.isActive && !nextDocument.isWebPageFile) {
      this.state = {
        ...this.state,
        isActive: false,
        diagnostics: [],
        selectedNodeId: null
      };
    }
    if (pathChanged && wasWebPage !== nextDocument.isWebPageFile) {
      this.context.logger.info(
        `web-page document state changed: ${path ?? "unknown"} -> ${nextDocument.isWebPageFile ? "web-page" : "non-web-page"}`
      );
    }
    this.notify();
  }
  applyPatchedDocument(result, successMessage) {
    if (!result.ok || !result.content) {
      return {
        ok: false,
        message: result.message ?? "\u6E90\u7801\u56DE\u5199\u5931\u8D25\u3002"
      };
    }
    if (!this.editorView) {
      return {
        ok: false,
        message: "\u5F53\u524D\u6CA1\u6709\u53EF\u5199\u5165\u7684\u7F16\u8F91\u5668\u89C6\u56FE\uFF0C\u65E0\u6CD5\u6267\u884C\u6E90\u7801\u56DE\u5199\u3002"
      };
    }
    const view = this.editorView;
    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: result.content
      }
    });
    this.handleContentChange(result.content, this.state.currentPath ?? void 0);
    this.context.logger.info(successMessage);
    return {
      ok: true,
      message: successMessage
    };
  }
  async tryRecoverDocument(content, path, previousState) {
    if (!this.shouldRecoverFromPartialContent(content, path, previousState)) {
      return null;
    }
    const diskDocument = await this.readDiskDocument(path);
    if (diskDocument?.isWebPageFile && diskDocument.frontmatterRaw) {
      return WebPageDocumentParser.parse(`${diskDocument.frontmatterRaw}${content}`);
    }
    if (previousState.isWebPageFile && previousState.document) {
      return previousState.document;
    }
    return null;
  }
  shouldRecoverFromPartialContent(content, path, previousState) {
    const samePathAsCurrent = path === previousState.currentPath;
    if (!samePathAsCurrent || !previousState.isWebPageFile) {
      return this.looksLikeWebPageBody(content);
    }
    const { raw } = WebPageDocumentParser.parseFrontmatter(content);
    if (raw) {
      return false;
    }
    const trimmed = content.trim();
    if (trimmed.length === 0) {
      return true;
    }
    return this.looksLikeWebPageSections(content);
  }
  async readDiskDocument(path) {
    const fileSystem = this.context.getService(ServiceId.FILE_SYSTEM);
    const diskContent = await fileSystem?.readFile?.(path).catch(() => "");
    return diskContent ? WebPageDocumentParser.parse(diskContent) : null;
  }
  looksLikeWebPageBody(content) {
    return /<template>[\s\S]*<\/template>/i.test(content);
  }
  looksLikeWebPageSections(content) {
    return /<(template|style|script)>[\s\S]*<\/(template|style|script)>/i.test(content);
  }
};

// src/modules/extensions/web-page-plugin/index.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
var WebPagePlugin = class {
  id = "web-page-plugin";
  name = "\u9875\u9762\u6587\u6863\u89C6\u56FE";
  version = "1.0.0";
  category = import_types.PluginCategory.EDITOR;
  description = "\u4E3A type: web-page \u6587\u6863\u63D0\u4F9B\u6E90\u7801/\u9875\u9762\u53CC\u89C6\u56FE\u6E32\u67D3\u80FD\u529B\u3002";
  internal = false;
  controller = null;
  cleanups = [];
  activate(context) {
    this.controller = new WebPageController(context);
    const controller = this.controller;
    context.registerStyle("web-page-plugin-styles", WEB_PAGE_STYLES);
    context.registerEditorHeaderRightItem("web-page-toggle", () => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(WebPageToggleButton, { controller }), void 0, 41);
    context.registerEditorModal("web-page-view", () => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(WebPageView, { controller }), void 0, 101);
    const editorViewPlugin = import_view.ViewPlugin.fromClass(class {
      constructor(view) {
        controller.setEditorView(view);
        try {
          const editorService = context.getService(ServiceId.EDITOR);
          const currentFileId = editorService?.getState?.().currentFileId;
          controller.handleContentChange(view.state.doc.toString(), currentFileId ?? void 0);
        } catch {
        }
      }
      update(update) {
        controller.setEditorView(update.view);
      }
      destroy() {
        controller.setEditorView(null);
      }
    });
    const editorViewCapture = import_view.EditorView.updateListener.of((update) => {
      controller.setEditorView(update.view);
    });
    context.registerEditorExtension([editorViewPlugin, editorViewCapture]);
    this.cleanups.push(context.on(import_Events.CoreEvents.DOCUMENT_CHANGED, (payload) => {
      if (payload?.content !== void 0) {
        controller.handleContentChange(payload.content, payload.path ?? void 0);
      }
    }));
    this.cleanups.push(context.on(import_Events.CoreEvents.LIFECYCLE_FILE_LOADED, (payload) => {
      if (payload?.content !== void 0) {
        controller.handleContentChange(payload.content, payload.path ?? void 0);
      }
    }));
    this.cleanups.push(context.on(import_Events.CoreEvents.EDITOR_CONTENT_INPUT, (payload) => {
      controller.handleContentChange(payload?.newContent ?? "", payload?.path ?? void 0);
    }));
    this.cleanups.push(context.on(import_Events.CoreEvents.MAIN_VIEW_READY, () => {
      this.scheduleProbeCurrentContent(context, controller);
    }));
    this.cleanups.push(context.on(import_Events.CoreEvents.SPLIT_VIEW_CHANGED, () => {
      this.scheduleProbeCurrentContent(context, controller);
    }));
    this.cleanups.push(context.on(import_Events.CoreEvents.SPLIT_VIEW_TAB, () => {
      this.scheduleProbeCurrentContent(context, controller);
    }));
    this.cleanups.push(context.on(import_Events.CoreEvents.CLOSE_SPLIT_VIEW, () => {
      this.scheduleProbeCurrentContent(context, controller);
    }));
    this.probeCurrentContent(context, controller);
    context.logger.info("\u9875\u9762\u6587\u6863\u89C6\u56FE\u63D2\u4EF6\u5DF2\u6FC0\u6D3B (v1.0.0)");
  }
  deactivate() {
    this.cleanups.forEach((fn) => fn());
    this.cleanups = [];
    this.controller?.dispose();
    this.controller = null;
  }
  probeCurrentContent(context, controller) {
    try {
      const editorService = context.getService(ServiceId.EDITOR);
      const state = editorService?.getState?.();
      const content = state?.currentContent || editorService?.getCurrentContent?.() || editorService?.getEditorView?.()?.state?.doc?.toString();
      const fileId = state?.currentFileId;
      if (content && fileId) {
        controller.handleContentChange(content, fileId);
      }
    } catch {
    }
  }
  scheduleProbeCurrentContent(context, controller) {
    const run = () => this.probeCurrentContent(context, controller);
    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => run());
      return;
    }
    setTimeout(run, 0);
  }
};
