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

// src/modules/extensions/kanban-plugin/index.tsx
var index_exports = {};
__export(index_exports, {
  default: () => KanbanPlugin
});
module.exports = __toCommonJS(index_exports);
var import_types = require("@/kernel/system/plugin/types");
var import_Events2 = require("@/kernel/core/Events");

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

// src/modules/extensions/kanban-plugin/index.tsx
var import_view = require("@codemirror/view");

// src/modules/extensions/kanban-plugin/services/KanbanController.ts
var import_Events = require("@/kernel/core/Events");

// src/modules/built-in/editor/constants/ProgrammaticTransactionSources.ts
var PROGRAMMATIC_TRANSACTION_SOURCES = {
  SYNC_PROTOCOL: "sync-protocol",
  SYNC_EDITOR_CONTENT: "sync-editor-content",
  EDITOR_SET_CONTENT: "editor-set-content",
  EDITOR_RESET_STATE: "editor-reset-state",
  KANBAN_DEACTIVATE_VIEW: "kanban-deactivate-view"
};

// src/modules/extensions/kanban-plugin/services/KanbanParser.ts
var KanbanParser = class {
  /** 状态字符到 CardStatus 的映射 */
  static STATUS_MAP = {
    " ": "todo",
    "/": "doing",
    "x": "done"
  };
  /** CardStatus 到状态字符的映射 */
  static STATUS_CHAR_MAP = {
    todo: " ",
    doing: "/",
    done: "x"
  };
  /**
   * 解析 YAML frontmatter
   * 返回 type 字段值、原始 frontmatter 文本、正文内容
   */
  static parseFrontmatter(content) {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (!match) {
      return { raw: "", body: content };
    }
    const raw = match[0];
    const body = content.slice(raw.length);
    const yaml = match[1];
    const typeMatch = yaml.match(/^type:\s*(.+)$/m);
    const type = typeMatch ? typeMatch[1].trim() : void 0;
    return { type, raw, body };
  }
  /**
   * 判断内容是否为看板文件
   * 对非字符串输入做安全处理（编辑器事件可能传入 undefined/null）
   */
  static isKanbanFile(content) {
    if (typeof content !== "string") return false;
    const { type } = this.parseFrontmatter(content);
    return type === "kanban";
  }
  /**
   * 解析 Markdown 内容为看板数据结构
   * 
   * 规则：
   * - # 一级标题 → 看板分组 (Board)
   * - ## 二级标题 → 列 (Column)，标题含 ✅ 标识为已完成列
   * - - [ ] / - [x] / - [/] → 卡片 (Card)
   * - 缩进的 - 子列表 → 卡片子项 (children)
   * - 缩进的 > 引用块 → 卡片描述 (description)
   */
  static parseKanban(content) {
    const { raw, body } = this.parseFrontmatter(content);
    const lines = body.split(/\r?\n/);
    const boards = [];
    let currentBoard = null;
    let currentColumn = null;
    let currentCard = null;
    let boardIndex = 0;
    let columnIndex = 0;
    let cardIndex = 0;
    for (const line of lines) {
      if (/^# /.test(line)) {
        const title = line.replace(/^# /, "").trim();
        columnIndex = 0;
        cardIndex = 0;
        currentBoard = {
          id: `board-${boardIndex++}`,
          title,
          columns: []
        };
        boards.push(currentBoard);
        currentColumn = null;
        currentCard = null;
        continue;
      }
      if (/^## /.test(line) && currentBoard) {
        const title = line.replace(/^## /, "").trim();
        cardIndex = 0;
        currentColumn = {
          id: `${currentBoard.id}-col-${columnIndex++}`,
          title,
          isDone: title.includes("\u2705"),
          isDoing: title.includes("\u{1F504}"),
          cards: []
        };
        currentBoard.columns.push(currentColumn);
        currentCard = null;
        continue;
      }
      const cardMatch = line.match(/^- \[([ x/])\] (.+)/);
      if (cardMatch && currentColumn) {
        currentCard = {
          id: `${currentColumn.id}-card-${cardIndex++}`,
          text: cardMatch[2].trim(),
          status: this.STATUS_MAP[cardMatch[1]] || "todo",
          children: [],
          description: ""
        };
        currentColumn.cards.push(currentCard);
        continue;
      }
      if (currentCard && /^ {2}- /.test(line)) {
        currentCard.children.push(line.replace(/^ {2}- /, "").trim());
        continue;
      }
      if (currentCard && /^ {2}> /.test(line)) {
        const desc = line.replace(/^ {2}> /, "").trim();
        currentCard.description = currentCard.description ? currentCard.description + "\n" + desc : desc;
        continue;
      }
    }
    return { boards, frontmatter: raw };
  }
  /**
   * 将看板数据序列化为 Markdown 文本
   */
  static serializeKanban(data) {
    const parts = [];
    if (data.frontmatter) {
      parts.push(data.frontmatter);
    }
    for (const board of data.boards) {
      parts.push(`# ${board.title}`);
      parts.push("");
      for (const column of board.columns) {
        parts.push(`## ${column.title}`);
        for (const card of column.cards) {
          const statusChar = this.STATUS_CHAR_MAP[card.status];
          parts.push(`- [${statusChar}] ${card.text}`);
          if (card.description) {
            for (const descLine of card.description.split("\n")) {
              parts.push(`  > ${descLine}`);
            }
          }
          for (const child of card.children) {
            parts.push(`  - ${child}`);
          }
        }
        parts.push("");
      }
    }
    return parts.join("\n");
  }
};

// src/modules/built-in/editor/utils/InternalSyncTransaction.ts
var import_state2 = require("@codemirror/state");

// src/modules/built-in/editor/constants/Annotations.ts
var import_state = require("@codemirror/state");
var InternalSyncAnnotation = import_state.Annotation.define();
var ProgrammaticTransactionSourceAnnotation = import_state.Annotation.define();

// src/modules/built-in/editor/utils/InternalSyncTransaction.ts
function createInternalSyncTransaction(spec, options) {
  return {
    ...spec,
    annotations: [
      InternalSyncAnnotation.of(true),
      ProgrammaticTransactionSourceAnnotation.of(options.source),
      import_state2.Transaction.addToHistory.of(false)
    ]
  };
}

// src/modules/extensions/kanban-plugin/services/KanbanController.ts
var KanbanController = class {
  constructor(context) {
    this.context = context;
  }
  state = {
    isKanbanFile: false,
    isActive: false,
    data: null
  };
  listeners = /* @__PURE__ */ new Set();
  currentContent = "";
  activePath = "";
  pendingPath = null;
  /** 防止 deactivateView → dispatch → DOCUMENT_CHANGED → handleContentChange 循环 */
  _syncing = false;
  /** CodeMirror EditorView 引用（由 index.tsx 通过编辑器扩展注入） */
  editorView = null;
  /** 注入当前活跃的 EditorView 引用 */
  setEditorView(view) {
    this.editorView = view;
  }
  // ─── 状态读取 API ───────────────────────────────
  /** 获取当前状态快照 */
  getState() {
    return this.state;
  }
  /** 订阅状态变化，返回取消订阅函数 */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  // ─── 内容检测 ───────────────────────────────────
  /** 处理文档内容变化，检测是否为看板文件 */
  handleContentChange(content, filePath, authoritative = false) {
    if (this._syncing) {
      return;
    }
    const pathChanged = filePath !== void 0 && filePath !== this.activePath;
    if (!authoritative && pathChanged && content.trim().length === 0) {
      this.pendingPath = filePath ?? null;
      return;
    }
    const previousPath = this.activePath;
    this.currentContent = content;
    if (filePath) {
      this.activePath = filePath;
    }
    if (filePath && this.pendingPath === filePath) {
      this.pendingPath = null;
    }
    const isKanbanFile = KanbanParser.isKanbanFile(content);
    const wasKanbanFile = this.state.isKanbanFile;
    this.state.isKanbanFile = isKanbanFile;
    if (!isKanbanFile && this.state.isActive) {
      this.deactivateView(previousPath);
      return;
    }
    if (isKanbanFile && this.state.isActive) {
      this.state.data = KanbanParser.parseKanban(content);
      this.notifyListeners();
      return;
    }
    if (isKanbanFile && !this.state.isActive && (authoritative || pathChanged || this.pendingPath === filePath)) {
      this.activateView();
      return;
    }
    if (isKanbanFile !== wasKanbanFile || pathChanged) {
      this.notifyListeners();
    }
  }
  // ─── 视图切换 ───────────────────────────────────
  /** 切换看板视图 */
  toggleView() {
    if (this.state.isActive) {
      this.deactivateView();
    } else {
      if (this.editorView) {
        this.currentContent = this.editorView.state.doc.toString();
      }
      if (this.currentContent) {
        this.state.isKanbanFile = KanbanParser.isKanbanFile(this.currentContent);
      }
      if (!this.state.isKanbanFile) {
        return;
      }
      try {
        this.activateView();
      } catch (err) {
        this.context.logger.error("[Kanban] toggleView: \u6FC0\u6D3B\u5931\u8D25:", err);
        this.state.isActive = false;
        this.state.data = null;
        this.notifyListeners();
      }
    }
  }
  /** 激活看板视图 */
  activateView() {
    if (!this.state.isKanbanFile) return;
    const data = KanbanParser.parseKanban(this.currentContent);
    this.state.data = data;
    this.state.isActive = true;
    this.notifyListeners();
  }
  /**
   * 停用看板视图并回写内容
   * @param savePath 可选的保存目标路径（切换文件时由 handleContentChange 传入原始看板文件路径）
   */
  deactivateView(savePath) {
    if (!this.state.isActive) return;
    let serializedContent = null;
    if (this.state.data) {
      try {
        serializedContent = KanbanParser.serializeKanban(this.state.data);
        this.currentContent = serializedContent;
        this.syncToFile(savePath);
        if (savePath) {
          this._syncing = true;
          try {
            this.context.emit(import_Events.CoreEvents.DOCUMENT_CHANGED, {
              path: savePath,
              content: serializedContent,
              isInitial: true
            });
          } finally {
            this._syncing = false;
          }
        }
      } catch (err) {
        this.context.logger.error("\u9000\u51FA\u770B\u677F\u65F6\u4FDD\u5B58\u5931\u8D25:", err);
      }
    }
    this.state.isActive = false;
    this.state.data = null;
    this.notifyListeners();
    const isFileSwitched = savePath !== void 0 && savePath !== this.activePath;
    if (serializedContent && this.editorView && !isFileSwitched) {
      const view = this.editorView;
      const content = serializedContent;
      requestAnimationFrame(() => {
        this._syncing = true;
        try {
          view.dispatch(createInternalSyncTransaction(
            {
              changes: {
                from: 0,
                to: view.state.doc.length,
                insert: content
              },
              selection: { anchor: 0 }
            },
            { source: PROGRAMMATIC_TRANSACTION_SOURCES.KANBAN_DEACTIVATE_VIEW }
          ));
          view.focus();
        } catch (err) {
          this.context.logger.error("\u540C\u6B65\u5185\u5BB9\u5230\u7F16\u8F91\u5668\u5931\u8D25:", err);
        } finally {
          this._syncing = false;
        }
      });
    }
  }
  // ─── 卡片操作 ───────────────────────────────────
  /** 移动卡片到目标列 */
  moveCard(cardId, toColumnId, position) {
    if (!this.state.data) return;
    const { card, sourceColumn } = this.findCard(cardId);
    const targetColumn = this.findColumn(toColumnId);
    if (!card || !sourceColumn || !targetColumn) return;
    sourceColumn.cards = sourceColumn.cards.filter((c) => c.id !== cardId);
    const clampedPos = Math.min(position, targetColumn.cards.length);
    targetColumn.cards.splice(clampedPos, 0, card);
    if (targetColumn.isDone) {
      card.status = "done";
    } else if (targetColumn.isDoing) {
      card.status = "doing";
    } else {
      card.status = "todo";
    }
    this.regenerateIds();
    this.notifyAndSync();
  }
  /** 切换卡片状态（复选框） */
  toggleCardStatus(cardId) {
    if (!this.state.data) return;
    const { card, sourceColumn } = this.findCard(cardId);
    if (!card || !sourceColumn) return;
    if (card.status === "done") {
      card.status = "todo";
    } else {
      card.status = "done";
    }
    if (card.status === "done") {
      const board = this.findBoardByColumn(sourceColumn.id);
      if (board) {
        const doneColumn = board.columns.find((col) => col.isDone && col.id !== sourceColumn.id);
        if (doneColumn) {
          sourceColumn.cards = sourceColumn.cards.filter((c) => c.id !== cardId);
          doneColumn.cards.push(card);
        }
      }
    }
    this.regenerateIds();
    this.notifyAndSync();
  }
  /** 新增卡片 */
  addCard(columnId, text) {
    if (!this.state.data || !text.trim()) return;
    const column = this.findColumn(columnId);
    if (!column) return;
    const card = {
      id: `${columnId}-card-${column.cards.length}`,
      text: text.trim(),
      status: column.isDone ? "done" : "todo",
      children: [],
      description: ""
    };
    column.cards.push(card);
    this.regenerateIds();
    this.notifyAndSync();
  }
  /** 删除卡片 */
  deleteCard(cardId) {
    if (!this.state.data) return;
    const { sourceColumn } = this.findCard(cardId);
    if (!sourceColumn) return;
    sourceColumn.cards = sourceColumn.cards.filter((c) => c.id !== cardId);
    this.regenerateIds();
    this.notifyAndSync();
  }
  /** 编辑卡片文本 */
  editCard(cardId, text) {
    if (!this.state.data) return;
    const { card } = this.findCard(cardId);
    if (!card) return;
    card.text = text;
    this.notifyAndSync();
  }
  /** 新建看板分组（带默认三列） */
  addBoard(title) {
    if (!this.state.data || !title.trim()) return;
    const boardId = `board-${this.state.data.boards.length}`;
    const board = {
      id: boardId,
      title: title.trim(),
      columns: [
        { id: `${boardId}-col-0`, title: "\u5F85\u529E \u{1F4CB}", isDone: false, isDoing: false, cards: [] },
        { id: `${boardId}-col-1`, title: "\u8FDB\u884C\u4E2D \u{1F504}", isDone: false, isDoing: true, cards: [] },
        { id: `${boardId}-col-2`, title: "\u5DF2\u5B8C\u6210 \u2705", isDone: true, isDoing: false, cards: [] }
      ]
    };
    this.state.data.boards.push(board);
    this.regenerateIds();
    this.notifyAndSync();
  }
  /** 编辑列标题 */
  editColumnTitle(columnId, title) {
    if (!this.state.data || !title.trim()) return;
    const column = this.findColumn(columnId);
    if (!column) return;
    column.title = title.trim();
    column.isDone = column.title.includes("\u2705");
    column.isDoing = column.title.includes("\u{1F504}");
    this.notifyAndSync();
  }
  /** 删除看板分组 */
  deleteBoard(boardId) {
    if (!this.state.data) return;
    this.state.data.boards = this.state.data.boards.filter((b) => b.id !== boardId);
    this.regenerateIds();
    this.notifyAndSync();
  }
  /** 重命名看板分组 */
  renameBoard(boardId, title) {
    if (!this.state.data || !title.trim()) return;
    const board = this.state.data.boards.find((b) => b.id === boardId);
    if (!board) return;
    board.title = title.trim();
    this.notifyAndSync();
  }
  /** 新建列 */
  addColumn(boardId, title) {
    if (!this.state.data || !title.trim()) return;
    const board = this.state.data.boards.find((b) => b.id === boardId);
    if (!board) return;
    const colTitle = title.trim();
    const column = {
      id: `${boardId}-col-${board.columns.length}`,
      title: colTitle,
      isDone: colTitle.includes("\u2705"),
      isDoing: colTitle.includes("\u{1F504}"),
      cards: []
    };
    board.columns.push(column);
    this.regenerateIds();
    this.notifyAndSync();
  }
  /** 删除列 */
  deleteColumn(columnId) {
    if (!this.state.data) return;
    const board = this.findBoardByColumn(columnId);
    if (!board) return;
    board.columns = board.columns.filter((c) => c.id !== columnId);
    this.regenerateIds();
    this.notifyAndSync();
  }
  // ─── 保存相关 ───────────────────────────────────
  /** 手动保存（Ctrl+S 时调用） */
  save() {
    if (this.state.isActive && this.state.data) {
      this.syncToFile();
    }
  }
  // ─── 内部方法 ───────────────────────────────────
  /** 通知 UI 并自动同步到磁盘 */
  notifyAndSync() {
    this.notifyListeners();
    this.syncToFile();
  }
  /**
   * 同步看板数据到文件（仅写磁盘，不触碰编辑器缓冲区）
   * 使用 ServiceId.FILE_SYSTEM 获取文件系统服务（通过沙箱代理）
   * 注意：不能使用 EditorView.dispatch()，因为看板覆盖层激活期间 dispatch 会导致崩溃
   * @param overridePath 可选的目标路径（切换文件停用看板时传入原始看板文件路径）
   */
  syncToFile(overridePath) {
    const targetPath = overridePath || this.activePath;
    if (!this.state.data || !targetPath) return;
    const markdown = KanbanParser.serializeKanban(this.state.data);
    this.currentContent = markdown;
    const fs = this.context.getService(ServiceId.FILE_SYSTEM);
    if (fs?.saveFile) {
      fs.saveFile(targetPath, markdown).catch((err) => {
        this.context.logger.error("\u770B\u677F\u4FDD\u5B58\u5931\u8D25:", err);
      });
    }
  }
  /** 查找卡片及其所在列 */
  findCard(cardId) {
    if (!this.state.data) return { card: null, sourceColumn: null };
    for (const board of this.state.data.boards) {
      for (const column of board.columns) {
        const card = column.cards.find((c) => c.id === cardId);
        if (card) {
          return { card, sourceColumn: column };
        }
      }
    }
    return { card: null, sourceColumn: null };
  }
  /** 查找列 */
  findColumn(columnId) {
    if (!this.state.data) return null;
    for (const board of this.state.data.boards) {
      const column = board.columns.find((c) => c.id === columnId);
      if (column) return column;
    }
    return null;
  }
  /** 查找列所属的分组 */
  findBoardByColumn(columnId) {
    if (!this.state.data) return null;
    for (const board of this.state.data.boards) {
      if (board.columns.some((c) => c.id === columnId)) {
        return board;
      }
    }
    return null;
  }
  /** 重新生成所有 ID（操作后保持一致性） */
  regenerateIds() {
    if (!this.state.data) return;
    let boardIdx = 0;
    for (const board of this.state.data.boards) {
      board.id = `board-${boardIdx++}`;
      let colIdx = 0;
      for (const column of board.columns) {
        column.id = `${board.id}-col-${colIdx++}`;
        let cardIdx = 0;
        for (const card of column.cards) {
          card.id = `${column.id}-card-${cardIdx++}`;
        }
      }
    }
  }
  /** 通知所有订阅者 */
  notifyListeners() {
    this.listeners.forEach((fn) => fn());
  }
  /** 清理资源 */
  dispose() {
    this.listeners.clear();
    this.pendingPath = null;
    this.state = { isKanbanFile: false, isActive: false, data: null };
  }
};

// src/modules/extensions/kanban-plugin/components/KanbanToggleButton.tsx
var import_react = __toESM(require("react"), 1);
var import_jsx_runtime = require("react/jsx-runtime");
var KanbanToggleButton = ({ controller }) => {
  const [state, setState] = import_react.default.useState(controller.getState());
  import_react.default.useEffect(() => {
    return controller.subscribe(() => {
      setState({ ...controller.getState() });
    });
  }, [controller]);
  if (!state.isKanbanFile) {
    return null;
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "button",
    {
      onClick: () => controller.toggleView(),
      className: `kanban-toggle-btn ${state.isActive ? "active" : ""}`,
      title: state.isActive ? "\u5207\u6362\u5230\u6E90\u7801\u89C6\u56FE" : "\u5207\u6362\u5230\u770B\u677F\u89C6\u56FE",
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "2", y: "3", width: "6", height: "18", rx: "1" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "9", y: "3", width: "6", height: "13", rx: "1" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "16", y: "3", width: "6", height: "8", rx: "1" })
      ] })
    }
  );
};

// src/modules/extensions/kanban-plugin/components/KanbanView.tsx
var import_react2 = __toESM(require("react"), 1);
var import_jsx_runtime2 = require("react/jsx-runtime");
var ConfirmDialog = ({ message, onConfirm, onCancel }) => {
  import_react2.default.useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "kanban-confirm-overlay", onClick: onCancel, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "kanban-confirm-dialog", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "kanban-confirm-message", children: message }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "kanban-confirm-actions", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { className: "kanban-confirm-btn kanban-confirm-cancel", onClick: onCancel, children: "\u53D6\u6D88" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { className: "kanban-confirm-btn kanban-confirm-ok", onClick: onConfirm, children: "\u786E\u5B9A" })
    ] })
  ] }) });
};
var KanbanView = ({ controller }) => {
  const [state, setState] = import_react2.default.useState(controller.getState());
  const [dragCardId, setDragCardId] = import_react2.default.useState(null);
  const [dragOverColumnId, setDragOverColumnId] = import_react2.default.useState(null);
  const [dropIndex, setDropIndex] = import_react2.default.useState(-1);
  import_react2.default.useEffect(() => {
    return controller.subscribe(() => {
      setState({ ...controller.getState() });
    });
  }, [controller]);
  if (!state.isActive || !state.data) {
    return null;
  }
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "kanban-overlay", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "kanban-toolbar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "kanban-toolbar-title", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("rect", { x: "2", y: "3", width: "6", height: "18", rx: "1" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("rect", { x: "9", y: "3", width: "6", height: "13", rx: "1" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("rect", { x: "16", y: "3", width: "6", height: "8", rx: "1" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: "\u770B\u677F\u89C6\u56FE" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "kanban-toolbar-actions", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
        "button",
        {
          className: "kanban-exit-btn",
          onClick: () => controller.toggleView(),
          title: "\u9000\u51FA\u770B\u677F\u89C6\u56FE\uFF0C\u8FD4\u56DE\u6E90\u7801\u7F16\u8F91",
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M15 3h6v6" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M10 14L21 3" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" })
            ] }),
            "\u9000\u51FA\u770B\u677F"
          ]
        }
      ) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "kanban-root", children: [
      state.data.boards.map((board) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        BoardSection,
        {
          board,
          controller,
          dragCardId,
          dragOverColumnId,
          dropIndex,
          onDragStart: setDragCardId,
          onDragOverColumn: setDragOverColumnId,
          onDropIndexChange: setDropIndex,
          onDragEnd: () => {
            setDragCardId(null);
            setDragOverColumnId(null);
            setDropIndex(-1);
          }
        },
        board.id
      )),
      state.data.boards.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "kanban-empty", children: "\u6682\u65E0\u770B\u677F\u6570\u636E\uFF0C\u8BF7\u70B9\u51FB\u4E0B\u65B9\u6309\u94AE\u65B0\u5EFA\u5206\u7EC4" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(AddBoardButton, { controller })
    ] })
  ] });
};
var AddBoardButton = ({ controller }) => {
  const [isAdding, setIsAdding] = import_react2.default.useState(false);
  const [title, setTitle] = import_react2.default.useState("");
  const inputRef = import_react2.default.useRef(null);
  import_react2.default.useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);
  const handleSubmit = () => {
    if (title.trim()) {
      controller.addBoard(title);
      setTitle("");
      setIsAdding(false);
    } else {
      setIsAdding(false);
      setTitle("");
    }
  };
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSubmit();
    } else if (e.key === "Escape") {
      setIsAdding(false);
      setTitle("");
    }
  };
  if (isAdding) {
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "kanban-add-board-input-wrapper", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      "input",
      {
        ref: inputRef,
        className: "kanban-input kanban-add-board-input",
        value: title,
        onChange: (e) => setTitle(e.target.value),
        onKeyDown: handleKeyDown,
        onBlur: handleSubmit,
        placeholder: "\u8F93\u5165\u5206\u7EC4\u6807\u9898\uFF0C\u56DE\u8F66\u786E\u8BA4\uFF08\u9ED8\u8BA4\u751F\u6210 \u5F85\u529E/\u8FDB\u884C\u4E2D/\u5DF2\u5B8C\u6210 \u4E09\u5217\uFF09..."
      }
    ) });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("button", { className: "kanban-add-board", onClick: () => setIsAdding(true), children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: "+" }),
    " \u65B0\u5EFA\u5206\u7EC4"
  ] });
};
var BoardSection = ({
  board,
  controller,
  dragCardId,
  dragOverColumnId,
  dropIndex,
  onDragStart,
  onDragOverColumn,
  onDropIndexChange,
  onDragEnd
}) => {
  const isHorizontal = board.columns.length <= 3;
  const [isRenaming, setIsRenaming] = import_react2.default.useState(false);
  const [renameText, setRenameText] = import_react2.default.useState(board.title);
  const renameRef = import_react2.default.useRef(null);
  const [confirmTarget, setConfirmTarget] = import_react2.default.useState(null);
  const [deleteColumnId, setDeleteColumnId] = import_react2.default.useState(null);
  import_react2.default.useEffect(() => {
    if (isRenaming && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [isRenaming]);
  const handleRenameSubmit = () => {
    if (renameText.trim() && renameText !== board.title) {
      controller.renameBoard(board.id, renameText.trim());
    }
    setIsRenaming(false);
  };
  const handleRenameKeyDown = (e) => {
    if (e.key === "Enter") {
      handleRenameSubmit();
    } else if (e.key === "Escape") {
      setRenameText(board.title);
      setIsRenaming(false);
    }
  };
  const handleDeleteBoard = () => setConfirmTarget("board");
  const handleDeleteColumn = (colId) => {
    setDeleteColumnId(colId);
    setConfirmTarget("column");
  };
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "kanban-board-header", children: [
      isRenaming ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "input",
        {
          ref: renameRef,
          className: "kanban-input kanban-board-title-input",
          value: renameText,
          onChange: (e) => setRenameText(e.target.value),
          onKeyDown: handleRenameKeyDown,
          onBlur: handleRenameSubmit
        }
      ) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "h2",
        {
          className: "kanban-board-title",
          onDoubleClick: () => {
            setRenameText(board.title);
            setIsRenaming(true);
          },
          title: "\u53CC\u51FB\u91CD\u547D\u540D\u5206\u7EC4",
          children: board.title
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "kanban-board-actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            className: "kanban-board-action-btn",
            onClick: () => {
              setRenameText(board.title);
              setIsRenaming(true);
            },
            title: "\u91CD\u547D\u540D\u5206\u7EC4",
            children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" }) })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            className: "kanban-board-action-btn kanban-board-delete-btn",
            onClick: handleDeleteBoard,
            title: "\u5220\u9664\u5206\u7EC4",
            children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("polyline", { points: "3 6 5 6 21 6" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" })
            ] })
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: isHorizontal ? "kanban-columns-horizontal" : "kanban-columns-vertical", children: [
      board.columns.map((column) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        ColumnPanel,
        {
          column,
          controller,
          dragCardId,
          isDragOver: dragOverColumnId === column.id,
          dropIndex: dragOverColumnId === column.id ? dropIndex : -1,
          onDragStart,
          onDragOverColumn,
          onDropIndexChange,
          onDragEnd,
          onDeleteColumn: handleDeleteColumn
        },
        column.id
      )),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(AddColumnButton, { boardId: board.id, controller })
    ] }),
    confirmTarget === "board" && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      ConfirmDialog,
      {
        message: `\u786E\u5B9A\u5220\u9664\u5206\u7EC4\u300C${board.title}\u300D\u53CA\u5176\u6240\u6709\u5185\u5BB9\u5417\uFF1F`,
        onConfirm: () => {
          controller.deleteBoard(board.id);
          setConfirmTarget(null);
        },
        onCancel: () => setConfirmTarget(null)
      }
    ),
    confirmTarget === "column" && deleteColumnId && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      ConfirmDialog,
      {
        message: `\u786E\u5B9A\u5220\u9664\u6B64\u5217\u53CA\u5176\u6240\u6709\u5361\u7247\u5417\uFF1F`,
        onConfirm: () => {
          controller.deleteColumn(deleteColumnId);
          setConfirmTarget(null);
          setDeleteColumnId(null);
        },
        onCancel: () => {
          setConfirmTarget(null);
          setDeleteColumnId(null);
        }
      }
    )
  ] });
};
var AddColumnButton = ({ boardId, controller }) => {
  const [isAdding, setIsAdding] = import_react2.default.useState(false);
  const [title, setTitle] = import_react2.default.useState("");
  const inputRef = import_react2.default.useRef(null);
  import_react2.default.useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);
  const handleSubmit = () => {
    if (title.trim()) {
      controller.addColumn(boardId, title);
      setTitle("");
      setIsAdding(false);
    } else {
      setIsAdding(false);
      setTitle("");
    }
  };
  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSubmit();
    else if (e.key === "Escape") {
      setIsAdding(false);
      setTitle("");
    }
  };
  if (isAdding) {
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "kanban-column kanban-add-column-input", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      "input",
      {
        ref: inputRef,
        className: "kanban-input",
        value: title,
        onChange: (e) => setTitle(e.target.value),
        onKeyDown: handleKeyDown,
        onBlur: handleSubmit,
        placeholder: "\u8F93\u5165\u5217\u6807\u9898..."
      }
    ) });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("button", { className: "kanban-add-column", onClick: () => setIsAdding(true), children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: "+" }),
    " \u65B0\u5EFA\u5217"
  ] });
};
var ColumnPanel = ({
  column,
  controller,
  dragCardId,
  isDragOver,
  dropIndex,
  onDragStart,
  onDragOverColumn,
  onDropIndexChange,
  onDragEnd,
  onDeleteColumn
}) => {
  const [isAdding, setIsAdding] = import_react2.default.useState(false);
  const [newCardText, setNewCardText] = import_react2.default.useState("");
  const [isEditingTitle, setIsEditingTitle] = import_react2.default.useState(false);
  const [editTitle, setEditTitle] = import_react2.default.useState(column.title);
  const inputRef = import_react2.default.useRef(null);
  const titleInputRef = import_react2.default.useRef(null);
  const columnRef = import_react2.default.useRef(null);
  import_react2.default.useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);
  import_react2.default.useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);
  const handleDragOver = (e) => {
    e.preventDefault();
    onDragOverColumn(column.id);
    const target = e.target;
    const isOnCard = target.closest(".kanban-card");
    if (!isOnCard) {
      onDropIndexChange(column.cards.length);
    }
  };
  const handleDragLeave = (e) => {
    const relatedTarget = e.relatedTarget;
    if (columnRef.current && !columnRef.current.contains(relatedTarget)) {
      onDragOverColumn(null);
      onDropIndexChange(-1);
    }
  };
  const handleDrop = (e) => {
    e.preventDefault();
    if (dragCardId) {
      const pos = dropIndex >= 0 ? dropIndex : column.cards.length;
      controller.moveCard(dragCardId, column.id, pos);
    }
    onDragEnd();
  };
  const handleAddCard = () => {
    if (newCardText.trim()) {
      controller.addCard(column.id, newCardText);
      setNewCardText("");
      setIsAdding(false);
    }
  };
  const handleAddKeyDown = (e) => {
    if (e.key === "Enter") {
      handleAddCard();
    } else if (e.key === "Escape") {
      setIsAdding(false);
      setNewCardText("");
    }
  };
  const handleTitleSubmit = () => {
    if (editTitle.trim() && editTitle !== column.title) {
      controller.editColumnTitle(column.id, editTitle.trim());
    }
    setIsEditingTitle(false);
  };
  const handleTitleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleTitleSubmit();
    } else if (e.key === "Escape") {
      setEditTitle(column.title);
      setIsEditingTitle(false);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
    "div",
    {
      ref: columnRef,
      className: `kanban-column ${isDragOver ? "drag-over" : ""}`,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "kanban-column-header", children: [
          isEditingTitle ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "input",
            {
              ref: titleInputRef,
              className: "kanban-input kanban-column-title-input",
              value: editTitle,
              onChange: (e) => setEditTitle(e.target.value),
              onKeyDown: handleTitleKeyDown,
              onBlur: handleTitleSubmit
            }
          ) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "span",
            {
              className: "kanban-column-title",
              onDoubleClick: () => {
                setEditTitle(column.title);
                setIsEditingTitle(true);
              },
              title: "\u53CC\u51FB\u7F16\u8F91\u5217\u540D",
              children: column.title
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "kanban-column-count", children: column.cards.length }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "kanban-column-actions", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "button",
              {
                className: "kanban-column-action-btn",
                onClick: () => {
                  setEditTitle(column.title);
                  setIsEditingTitle(true);
                },
                title: "\u91CD\u547D\u540D\u5217",
                children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" }) })
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "button",
              {
                className: "kanban-column-action-btn kanban-column-delete-btn",
                onClick: () => onDeleteColumn(column.id),
                title: "\u5220\u9664\u5217",
                children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("line", { x1: "6", y1: "6", x2: "18", y2: "18" })
                ] })
              }
            )
          ] })
        ] }),
        column.cards.map((card, index) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_react2.default.Fragment, { children: [
          isDragOver && dropIndex === index && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "kanban-drop-indicator" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            CardItem,
            {
              card,
              index,
              controller,
              isDragging: dragCardId === card.id,
              onDragStart,
              onDragEnd,
              onDragOverCard: (idx) => {
                onDragOverColumn(column.id);
                onDropIndexChange(idx);
              }
            }
          )
        ] }, card.id)),
        isDragOver && dropIndex === column.cards.length && column.cards.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "kanban-drop-indicator" }),
        isAdding ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "input",
          {
            ref: inputRef,
            className: "kanban-input",
            value: newCardText,
            onChange: (e) => setNewCardText(e.target.value),
            onKeyDown: handleAddKeyDown,
            onBlur: () => {
              if (newCardText.trim()) {
                handleAddCard();
              } else {
                setIsAdding(false);
                setNewCardText("");
              }
            },
            placeholder: "\u8F93\u5165\u4EFB\u52A1\u5185\u5BB9..."
          }
        ) : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("button", { className: "kanban-add-card", onClick: () => setIsAdding(true), children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: "+" }),
          " \u6DFB\u52A0\u5361\u7247"
        ] })
      ]
    }
  );
};
var CardItem = ({
  card,
  index,
  controller,
  isDragging,
  onDragStart,
  onDragEnd,
  onDragOverCard
}) => {
  const [isEditing, setIsEditing] = import_react2.default.useState(false);
  const [editText, setEditText] = import_react2.default.useState(card.text);
  const cardRef = import_react2.default.useRef(null);
  const handleEditSubmit = () => {
    if (editText.trim() && editText !== card.text) {
      controller.editCard(card.id, editText.trim());
    }
    setIsEditing(false);
  };
  const handleEditKeyDown = (e) => {
    if (e.key === "Enter") {
      handleEditSubmit();
    } else if (e.key === "Escape") {
      setEditText(card.text);
      setIsEditing(false);
    }
  };
  const handleDragStart = (e) => {
    e.dataTransfer.effectAllowed = "move";
    onDragStart(card.id);
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    if (e.clientY < midY) {
      onDragOverCard(index);
    } else {
      onDragOverCard(index + 1);
    }
  };
  const checkboxClass = card.status === "done" ? "checked" : card.status === "doing" ? "doing" : "";
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
    "div",
    {
      ref: cardRef,
      className: `kanban-card ${isDragging ? "dragging" : ""} ${card.status === "done" ? "done" : ""}`,
      draggable: !isEditing,
      onDragStart: handleDragStart,
      onDragEnd,
      onDragOver: handleDragOver,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "kanban-card-content", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "button",
            {
              className: `kanban-card-checkbox ${checkboxClass}`,
              onClick: () => controller.toggleCardStatus(card.id),
              children: card.status === "done" && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "3", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("polyline", { points: "20 6 9 17 4 12" }) })
            }
          ),
          isEditing ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "input",
            {
              className: "kanban-input",
              value: editText,
              onChange: (e) => setEditText(e.target.value),
              onKeyDown: handleEditKeyDown,
              onBlur: handleEditSubmit,
              autoFocus: true
            }
          ) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "span",
            {
              className: "kanban-card-text",
              onDoubleClick: () => {
                setEditText(card.text);
                setIsEditing(true);
              },
              children: card.text
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "button",
            {
              className: "kanban-card-delete",
              onClick: () => controller.deleteCard(card.id),
              title: "\u5220\u9664\u5361\u7247",
              children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("line", { x1: "6", y1: "6", x2: "18", y2: "18" })
              ] })
            }
          )
        ] }),
        card.description && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "kanban-card-description", children: card.description }),
        card.children.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "kanban-card-children", children: card.children.map((child, i) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "kanban-card-child", children: child }, i)) })
      ]
    }
  );
};

// src/modules/extensions/kanban-plugin/templates/kanbanStyles.ts
var KANBAN_STYLES = `
/* \u2500\u2500\u2500 \u5207\u6362\u6309\u94AE\uFF08\u6CE8\u518C\u5230 UISlotId.EDITOR_HEADER_RIGHT \u63D2\u69FD\uFF09 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* \u2500\u2500\u2500 \u8986\u76D6\u5C42\u5BB9\u5668\uFF08\u6CE8\u518C\u5230 UISlotId.EDITOR_MODALS\uFF0C\u5168\u5C4F\u8986\u76D6\u7F16\u8F91\u5668\uFF09 \u2500\u2500 */
.kanban-overlay {
    position: absolute;
    inset: 0;
    z-index: 100;
    background-color: hsl(var(--background));
    overflow: hidden;
    display: flex;
    flex-direction: column;
    /* \u9694\u79BB\u5C42\uFF1A\u786E\u4FDD\u7F16\u8F91\u5668\u5185\u5BB9\u4E0D\u4F1A\u7A7F\u900F */
    isolation: isolate;
}

/* \u2500\u2500\u2500 \u770B\u677F\u9876\u90E8\u5DE5\u5177\u680F \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* \u2500\u2500\u2500 \u770B\u677F\u5BB9\u5668 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.kanban-root {
    width: 100%;
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 24px;
}

/* \u2500\u2500\u2500 \u5206\u7EC4\u6807\u9898 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.kanban-board-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: hsl(var(--foreground));
    margin: 0 0 16px 0;
    padding-bottom: 8px;
    border-bottom: 1px solid hsl(var(--border));
    cursor: default;
}

/* \u2500\u2500\u2500 \u5206\u7EC4\u5934\u90E8\uFF08\u6807\u9898 + \u64CD\u4F5C\u6309\u94AE\uFF09 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* \u2500\u2500\u2500 \u6C34\u5E73\u5E03\u5C40\u5BB9\u5668\uFF08\u22643 \u5217\uFF09 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.kanban-columns-horizontal {
    display: flex;
    gap: 16px;
    margin-bottom: 32px;
}

.kanban-columns-horizontal > .kanban-column {
    flex: 1;
    min-width: 0;
}

/* \u2500\u2500\u2500 \u7AD6\u5411\u5E03\u5C40\u5BB9\u5668\uFF08>3 \u5217\uFF09 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.kanban-columns-vertical {
    display: flex;
    flex-direction: column;
    gap: 20px;
    margin-bottom: 32px;
}

.kanban-columns-vertical > .kanban-column {
    width: 100%;
}

/* \u2500\u2500\u2500 \u5217\u9762\u677F \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* \u2500\u2500\u2500 \u5217\u6807\u9898 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* \u2500\u2500\u2500 \u5361\u7247 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* \u2500\u2500\u2500 \u5361\u7247\u5185\u5BB9\u533A \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* \u2500\u2500\u2500 \u5361\u7247\u63CF\u8FF0 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* \u2500\u2500\u2500 \u5361\u7247\u5B50\u9879 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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
    content: '\u2022';
    position: absolute;
    left: 0;
    color: hsl(var(--muted-foreground));
}

/* \u2500\u2500\u2500 \u65B0\u589E\u6309\u94AE \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* \u2500\u2500\u2500 \u5185\u8054\u7F16\u8F91\u8F93\u5165\u6846 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* \u2500\u2500\u2500 \u5220\u9664\u6309\u94AE \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* \u2500\u2500\u2500 \u7A7A\u72B6\u6001 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.kanban-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    color: hsl(var(--muted-foreground));
    font-size: 0.8rem;
    font-style: italic;
}

/* \u2500\u2500\u2500 \u62D6\u62FD\u63D2\u5165\u6307\u793A\u5668 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.kanban-drop-indicator {
    height: 2px;
    background: hsl(var(--primary));
    border-radius: 1px;
    margin: 2px 0;
    opacity: 0.8;
}

/* \u2500\u2500\u2500 \u65B0\u5EFA\u5206\u7EC4\u6309\u94AE \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* \u2500\u2500\u2500 \u5217\u6807\u9898\u7F16\u8F91 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* \u2500\u2500\u2500 \u5217\u64CD\u4F5C\u6309\u94AE \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* \u2500\u2500\u2500 \u65B0\u5EFA\u5217 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* \u2500\u2500\u2500 \u81EA\u5B9A\u4E49\u786E\u8BA4\u5F39\u7A97 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

// src/modules/extensions/kanban-plugin/index.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
var KanbanPlugin = class {
  id = "kanban-plugin";
  name = "\u770B\u677F\u89C6\u56FE";
  version = "1.0.0";
  category = import_types.PluginCategory.EDITOR;
  description = "\u5C06 Markdown \u5185\u5BB9\u6E32\u67D3\u4E3A\u53EF\u4EA4\u4E92\u7684\u770B\u677F\u89C6\u56FE";
  internal = false;
  controller = null;
  cleanups = [];
  activate(context) {
    this.controller = new KanbanController(context);
    const controller = this.controller;
    context.registerStyle("kanban-plugin-styles", KANBAN_STYLES);
    context.registerEditorHeaderRightItem("kanban-toggle", () => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(KanbanToggleButton, { controller }), void 0, 40);
    context.registerEditorModal("kanban-view", () => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(KanbanView, { controller }), void 0, 100);
    const editorViewPlugin = import_view.ViewPlugin.fromClass(class {
      constructor(view) {
        controller.setEditorView(view);
        try {
          const editorService = context.getService(ServiceId.EDITOR);
          const currentFileId = editorService?.getState?.().currentFileId;
          const initialContent = view.state.doc.toString();
          if (initialContent.trim().length > 0) {
            controller.handleContentChange(initialContent, currentFileId ?? void 0);
          }
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
    this.cleanups.push(context.on(import_Events2.CoreEvents.DOCUMENT_CHANGED, (payload) => {
      if (payload?.content !== void 0) {
        controller.handleContentChange(payload.content, payload.path ?? void 0);
      }
    }));
    this.cleanups.push(context.on(import_Events2.CoreEvents.LIFECYCLE_FILE_LOADED, (payload) => {
      if (payload?.content !== void 0) {
        controller.handleContentChange(payload.content, payload.path ?? void 0, true);
      }
    }));
    this.cleanups.push(context.on(import_Events2.CoreEvents.EDITOR_CONTENT_INPUT, (payload) => {
      if (!controller.getState().isActive) {
        controller.handleContentChange(payload?.newContent ?? "", payload?.path ?? void 0);
      }
    }));
    const reprobeCurrentDocument = () => {
      this.scheduleProbeCurrentContent(context, controller);
    };
    this.cleanups.push(context.on(import_Events2.CoreEvents.MAIN_VIEW_READY, reprobeCurrentDocument));
    this.cleanups.push(context.on(import_Events2.CoreEvents.SPLIT_VIEW_CHANGED, reprobeCurrentDocument));
    this.cleanups.push(context.on(import_Events2.CoreEvents.SPLIT_VIEW_TAB, reprobeCurrentDocument));
    this.cleanups.push(context.on(import_Events2.CoreEvents.CLOSE_SPLIT_VIEW, reprobeCurrentDocument));
    this.cleanups.push(context.on(import_Events2.CoreEvents.APP_CMD_SAVE, () => {
      controller.save();
    }));
    this.probeCurrentContent(context, controller);
    context.logger.info("\u770B\u677F\u89C6\u56FE\u63D2\u4EF6\u5DF2\u6FC0\u6D3B (v1.0.0)");
  }
  deactivate() {
    this.cleanups.forEach((fn) => fn());
    this.cleanups = [];
    this.controller?.dispose();
    this.controller = null;
  }
  /**
   * 主动探测当前已打开文档的内容。
   * 外部插件加载时机晚于内置插件，首次 DOCUMENT_CHANGED 可能已错过。
   */
  probeCurrentContent(context, controller) {
    try {
      const editorService = context.getService(ServiceId.EDITOR);
      const state = editorService?.getState?.();
      const content = editorService?.getEditorView?.()?.state?.doc?.toString() || editorService?.getCurrentContent?.() || state?.currentContent;
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
