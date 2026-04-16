"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/modules/extensions/html-preview/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => HtmlPreviewPlugin
});
module.exports = __toCommonJS(index_exports);

// src/modules/extensions/html-preview/services/HtmlRenderService.ts
var import_language = require("@codemirror/language");
var import_state = require("@codemirror/state");
var import_view2 = require("@codemirror/view");

// src/shared/interactive-block/BlockModeManager.ts
var BlockModeManager = class {
  /** 块状态映射 (Pos -> Mode) */
  blockModes = /* @__PURE__ */ new Map();
  /**
   * 设置指定块的模式
   * @param pos 块的文档起始位置
   * @param mode 目标模式
   */
  setMode(pos, mode) {
    this.blockModes.set(pos, mode);
  }
  /**
   * 获取指定块的模式
   * @param pos 块的文档起始位置
   * @returns 当前模式（默认 auto）
   */
  getMode(pos) {
    return this.blockModes.get(pos) || "auto";
  }
  /**
   * 判断指定块是否应该渲染预览
   *
   * 规则：
   *   - preview 模式：总是渲染
   *   - source 模式：从不渲染
   *   - auto 模式：光标不在块区域内时渲染（两端都不活跃）
   *
   * @param pos 块的文档起始位置
   * @param from 块的起始偏移
   * @param to 块的结束偏移
   * @param isLineActive 判断某行是否有光标活跃
   */
  shouldRender(pos, from, to, isLineActive) {
    const mode = this.getMode(pos);
    if (mode === "preview") return true;
    if (mode === "source") return false;
    return !(isLineActive(from) || isLineActive(to));
  }
  /**
   * 清除指定位置的模式记录
   */
  clearMode(pos) {
    this.blockModes.delete(pos);
  }
  /**
   * 清除所有模式记录
   */
  clearAll() {
    this.blockModes.clear();
  }
};

// src/shared/interactive-block/CockpitOverlay.ts
function getCockpitHtmlForIFrame(config) {
  const { from, mode, badge } = config;
  const isLockedPreview = mode === "preview";
  const isLockedSource = mode === "source";
  return `
        <div class="interactive-block-cockpit ${isLockedPreview ? "is-locked" : ""}">
            <div class="cockpit-group">
                <button class="cockpit-btn source-btn ${isLockedSource ? "active" : ""}"
                        data-mode-action="source" data-pos="${from}"
                        onmousedown="bridge.sendPulse(); bridge.sendSignal('set-block-mode', { pos: ${from}, mode: 'source' })">
                    <span class="btn-icon">\u{1F4DD}</span>
                    <span class="btn-text">Source</span>
                </button>

                <div class="cockpit-spacer"></div>

                <button class="cockpit-btn preview-btn ${isLockedPreview ? "active" : ""}"
                        data-mode-action="preview" data-pos="${from}"
                        onmousedown="bridge.sendPulse(); bridge.sendSignal('set-block-mode', { pos: ${from}, mode: 'preview' })">
                    <span class="btn-icon">\u{1F5BC}\uFE0F</span>
                    <span class="btn-text">Preview</span>
                </button>

                <div class="cockpit-spacer"></div>

                <button class="cockpit-btn unlock-btn"
                        data-mode-action="auto" data-pos="${from}"
                        onmousedown="bridge.sendPulse(); bridge.sendSignal('set-block-mode', { pos: ${from}, mode: 'auto' })"
                        style="${mode === "auto" ? "display:none" : ""}">
                    <span class="btn-icon">\u{1F513}</span>
                    <span class="btn-text">Unlock</span>
                </button>

                <div class="cockpit-spacer"></div>
                <div class="cockpit-badge">${badge}</div>
            </div>
        </div>
    `;
}
var COCKPIT_STYLES = `
    .interactive-block-cockpit {
        position: absolute; top: 4px; right: 4px; z-index: 100;
        display: flex; gap: 4px; padding: 4px;
        background: var(--editor-bg, #ffffff);
        border: 1px solid var(--border-color, #e0e0e0);
        border-radius: 6px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        opacity: 0; transition: opacity 0.2s, background 0.2s;
        user-select: none; pointer-events: auto;
    }
    /* \u60AC\u505C\u65F6\u663E\u793A\u64CD\u63A7\u9762\u677F */
    .interactive-block-wrapper:hover .interactive-block-cockpit { opacity: 1; }
    .interactive-block-cockpit.is-locked { opacity: 0.8; border-color: var(--primary-color, #007acc); }
    .interactive-block-cockpit:hover { opacity: 1; background: var(--hover-bg, #f5f5f5); }

    .cockpit-group { display: flex; align-items: center; gap: 8px; }
    .cockpit-btn {
        border: none; background: transparent; cursor: pointer;
        font-size: 11px; display: flex; align-items: center; gap: 4px;
        padding: 4px 8px; border-radius: 4px;
        color: var(--text-color, #333);
        transition: all 0.2s;
    }
    .cockpit-btn:hover { background: rgba(0,0,0,0.05); }
    .cockpit-btn.active { background: rgba(0, 122, 204, 0.1); color: #007acc; font-weight: bold; }
    .cockpit-badge { font-size: 10px; color: #999; padding-left: 4px; border-left: 1px solid #eee; }
    .cockpit-spacer { width: 1px; }

    /* \u4EA4\u4E92\u5F0F\u5757\u901A\u7528\u5305\u88F9\u5C42 */
    .interactive-block-wrapper {
        position: relative;
        margin: 4px 0;
    }
`;

// src/modules/built-in/editor/engines/codemirror/WidgetBridge.ts
var import_view = require("@codemirror/view");

// src/shared/interactive-block/CopyButtonWidget.ts
var CopyButtonWidget = class extends import_view.WidgetType {
  code;
  pos;
  onSetMode;
  constructor(config) {
    super();
    this.code = config.code;
    this.pos = config.pos;
    this.onSetMode = config.onSetMode;
  }
  eq(other) {
    return other.code === this.code && other.pos === this.pos;
  }
  toDOM() {
    const toolbar = document.createElement("div");
    toolbar.className = "interactive-block-source-toolbar";
    const createBtn = (icon, label, cls) => {
      const btn = document.createElement("button");
      btn.innerHTML = `<span>${icon}</span> ${label}`;
      btn.className = `source-toolbar-btn ${cls}`;
      return btn;
    };
    const copyBtn = createBtn("\u{1F4CB}", "Copy", "copy-btn");
    copyBtn.onmousedown = (e) => {
      e.preventDefault();
      navigator.clipboard.writeText(this.code).then(() => {
        copyBtn.innerHTML = "<span>\u2705</span> Copied!";
        copyBtn.classList.add("success");
        setTimeout(() => {
          copyBtn.innerHTML = "<span>\u{1F4CB}</span> Copy";
          copyBtn.classList.remove("success");
        }, 2e3);
      });
    };
    toolbar.appendChild(copyBtn);
    if (this.onSetMode) {
      const previewBtn = createBtn("\u{1F5BC}\uFE0F", "Preview", "preview-btn");
      previewBtn.onmousedown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.onSetMode?.(this.pos, "preview");
      };
      toolbar.appendChild(previewBtn);
    }
    return toolbar;
  }
  ignoreEvent() {
    return true;
  }
};

// src/modules/extensions/html-preview/templates/VfsScript.ts
var getVfsScript = () => `
(function() {
    const callbackMap = new Map();
    let queryCounter = 0;
    const WAIT_INTERVAL_MS = 25;
    const MAX_WAIT_ATTEMPTS = 80;
    
    // \u57FA\u7840\u6D88\u606F\u76D1\u542C\uFF1A\u5904\u7406\u5F02\u6B65\u56DE\u8C03
    window.addEventListener('message', (event) => {
        const data = event.data;
        if (data.type === 'fs-response' && data.queryId) {
            const cb = callbackMap.get(data.queryId);
            if (cb) {
                if (data.status === 'success') cb.resolve(data.data);
                else cb.reject(new Error(data.message));
                callbackMap.delete(data.queryId);
            }
        }
    });

    const installFsBridge = () => {
        if (!window.bridge) return false;
        if (window.bridge.fs) return true;

        // \u5728\u9694\u79BB\u6C99\u7BB1\u5185\u91CD\u5EFA fs \u955C\u50CF\u5BF9\u8C61
        window.bridge.fs = {
            list(path) {
                return new Promise((resolve, reject) => {
                    const queryId = 'fs-' + Date.now() + '-' + (queryCounter++);
                    callbackMap.set(queryId, { resolve, reject });
                    window.bridge.sendSignal('fs-query', { operation: 'list', path, queryId });
                });
            },
            read(path) {
                return new Promise((resolve, reject) => {
                    const queryId = 'fs-' + Date.now() + '-' + (queryCounter++);
                    callbackMap.set(queryId, { resolve, reject });
                    window.bridge.sendSignal('fs-query', { operation: 'read', path, queryId });
                });
            }
        };

        return true;
    };

    const waitForBridge = (attempt = 0) => {
        if (installFsBridge()) return;
        if (attempt >= MAX_WAIT_ATTEMPTS) return;
        window.setTimeout(() => waitForBridge(attempt + 1), WAIT_INTERVAL_MS);
    };

    waitForBridge();
})();
`;

// src/modules/extensions/html-preview/templates/ModeChangeScript.ts
var MODE_CHANGE_MESSAGE_TYPE = "html-preview-mode-change";
function getModeChangeScript() {
  return `
(function() {
    var MSG_TYPE = '${MODE_CHANGE_MESSAGE_TYPE}';

    // \u5728 cockpit \u5BB9\u5668\u4E0A\u76D1\u542C mousedown\uFF08capture phase\uFF09
    // \u56E0\u4E3A bridge.js \u7684 tunnelEvent \u5728 window capture \u4E0A\u5DF2\u6CE8\u518C\uFF0C
    // \u6B64\u5904\u4E0D\u963B\u6B62\u900F\u4F20\uFF0C\u4EC5\u8865\u53D1\u4E00\u6761 raw postMessage \u786E\u4FDD\u6D88\u606F\u4E0D\u4E22\u5931
    document.addEventListener('mousedown', function(e) {
        var btn = e.target.closest ? e.target.closest('[data-mode-action]') : null;
        if (!btn) return;

        var pos = parseInt(btn.getAttribute('data-pos'), 10);
        var mode = btn.getAttribute('data-mode-action');

        if (!isNaN(pos) && mode) {
            window.parent.postMessage({
                type: MSG_TYPE,
                pos: pos,
                mode: mode
            }, '*');
        }
    }, true);
})();
`;
}

// src/modules/extensions/html-preview/services/HtmlRenderService.ts
var HtmlRenderService = class {
  constructor(onSetMode) {
    this.onSetMode = onSetMode;
  }
  /** 使用共享 BlockModeManager 替代内部 blockModes */
  modeManager = new BlockModeManager();
  getPayload(node, context) {
    const { state, isLineActive } = context;
    const { from, to } = node;
    const shouldRender = this.modeManager.shouldRender(from, from, to, isLineActive);
    if (!shouldRender) return null;
    const firstLine = state.doc.lineAt(from);
    const firstLineText = firstLine.text;
    if (!firstLineText.startsWith("```html-preview")) return null;
    const content = state.sliceDoc(from, to);
    const lines = content.split("\n");
    if (lines.length < 2) return null;
    const codeContent = lines.slice(1, lines.length - 1).join("\n");
    const mode = this.modeManager.getMode(from);
    return {
      html: `
                ${getCockpitHtmlForIFrame({ from, mode, badge: "HTML Preview" })}
                <div class="content-wrapper">${codeContent.trim()}</div>
            `,
      css: COCKPIT_STYLES,
      scripts: [getVfsScript(), getModeChangeScript()]
    };
  }
  /**
   * 设置特定块的运行模式（委托给共享 BlockModeManager）
   */
  setMode(pos, mode) {
    this.modeManager.setMode(pos, mode);
  }
  /**
   * 获取原子化范围集 (供编辑器扩展使用)
   */
  getAtomicRanges(state) {
    const builder = [];
    (0, import_language.syntaxTree)(state).iterate({
      enter: (node) => {
        if (node.name === "FencedCode" && this.modeManager.getMode(node.from) === "preview") {
          builder.push(import_view2.Decoration.replace({}).range(node.from, node.to));
        }
      }
    });
    return import_state.RangeSet.of(builder.sort((a, b) => a.from - b.from));
  }
  /**
   * 获取源码态复制挂件（使用共享 CopyButtonWidget）
   */
  getCopyDecoration(node, context) {
    const { from, to } = node;
    const { state } = context;
    if (this.getPayload(node, context)) return { decorations: [] };
    const content = state.sliceDoc(from, to);
    const lines = content.split("\n");
    if (!lines[0]?.startsWith("```html-preview")) return { decorations: [] };
    const codeOnly = lines.slice(1, lines.length - 1).join("\n");
    return {
      decorations: [
        import_view2.Decoration.widget({
          widget: new CopyButtonWidget({
            code: codeOnly,
            pos: from,
            onSetMode: this.onSetMode
          }),
          side: -1,
          block: true
        }).range(from)
      ]
    };
  }
};

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

// src/modules/extensions/html-preview/handlers/SignalHandler.ts
var SignalHandler = class {
  constructor(context, service) {
    this.context = context;
    this.service = service;
  }
  /**
   * 注册所有处理器
   */
  register() {
    this.context.registerIFrameSignal("fs-query", (iframe, data) => this.handleFsQuery(iframe, data));
    this.context.registerIFrameSignal("copy-code", (iframe, data) => this.handleCopyCode(iframe, data));
  }
  async handleFsQuery(iframe, data) {
    const { queryId, operation, path: relPath } = data;
    try {
      const workspaceService = this.context.getService(ServiceId.WORKSPACE);
      const fileSystem = this.context.getService(ServiceId.FILE_SYSTEM);
      if (!workspaceService) {
        throw new Error("Workspace service unavailable");
      }
      if (!fileSystem) {
        throw new Error("File system service unavailable");
      }
      const projectRoot = workspaceService.getProjectRoot();
      if (!projectRoot) throw new Error("Project root not found");
      let targetPath = await fileSystem.pathJoin(projectRoot, relPath);
      if (!targetPath.startsWith(projectRoot)) {
        throw new Error("Access denied: Out of project root");
      }
      let result = null;
      if (operation === "list") {
        const tree = await fileSystem.readDirectoryTree(targetPath);
        result = Array.isArray(tree) ? tree : tree.children || [];
      } else if (operation === "read") {
        const raw = await fileSystem.readFile(targetPath);
        result = typeof raw === "object" ? JSON.stringify(raw, null, 2) : String(raw || "");
      }
      this.postToIFrame(iframe, {
        type: "fs-response",
        queryId,
        status: "success",
        data: result
      });
    } catch (e) {
      this.postToIFrame(iframe, {
        type: "fs-response",
        queryId,
        status: "error",
        message: e.message
      });
    }
  }
  async handleCopyCode(iframe, data) {
    const { content } = data;
    if (content) {
      try {
        await navigator.clipboard.writeText(content);
      } catch (e) {
        this.context.logger.error("Failed to copy code:", e);
      }
    }
  }
  postToIFrame(iframe, payload) {
    iframe.contentWindow?.postMessage(payload, "*");
  }
};

// src/modules/extensions/html-preview/index.ts
var import_Events = require("@/kernel/core/Events");
var HtmlPreviewPlugin = class {
  id = "html-preview-plugin";
  name = "HTML Preview";
  version = "2.1.0";
  description = "Isolated HTML/CSS preview with tri-state locking logic.";
  internal = false;
  activate(context) {
    const onSetMode = (pos, mode) => {
      service.setMode(pos, mode);
      context.emit(import_Events.CoreEvents.EDITOR_REQUEST_REFRESH);
    };
    const service = new HtmlRenderService(onSetMode);
    const handler = new SignalHandler(context, service);
    const messageHandler = (event) => {
      const data = event.data;
      if (!data || data.type !== MODE_CHANGE_MESSAGE_TYPE) return;
      const { pos, mode } = data;
      if (typeof pos === "number" && mode) {
        onSetMode(pos, mode);
      }
    };
    window.addEventListener("message", messageHandler);
    handler.register();
    context.registerIsolatedRenderer({
      nodeTypes: ["FencedCode"],
      getPayload: (node, ctx) => service.getPayload(node, ctx)
    });
    context.registerMarkdownDecorationProvider({
      nodeTypes: ["FencedCode"],
      render: (node, ctx) => service.getCopyDecoration(node, ctx)
    });
    context.logger.info("Activated with interactive block infrastructure (v2.1).");
  }
  deactivate() {
  }
};
