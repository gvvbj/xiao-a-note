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

// src/modules/extensions/timestamp-plugin/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => TimestampPlugin
});
module.exports = __toCommonJS(index_exports);

// src/kernel/core/Constants.ts
var UISlotId = /* @__PURE__ */ ((UISlotId2) => {
  UISlotId2["LEFT_SIDEBAR"] = "left-sidebar";
  UISlotId2["RIGHT_SIDEBAR"] = "right-sidebar";
  UISlotId2["SIDEBAR_BOTTOM"] = "sidebar-bottom";
  UISlotId2["MAIN_EDITOR"] = "main-editor";
  UISlotId2["TITLE_BAR"] = "title-bar";
  UISlotId2["EDITOR_TABS"] = "editor-tabs";
  UISlotId2["EDITOR_HEADER"] = "editor-header";
  UISlotId2["EDITOR_HEADER_RIGHT"] = "editor-header-right";
  UISlotId2["EDITOR_TOOLBAR"] = "editor-toolbar";
  UISlotId2["EDITOR_TOOLBAR_ITEMS"] = "editor-toolbar-items";
  UISlotId2["EDITOR_MODALS"] = "editor-modals";
  UISlotId2["EDITOR_SIDE_COMPANION"] = "editor-side-companion";
  UISlotId2["STATUS_BAR"] = "status-bar";
  UISlotId2["STATUS_BAR_LEFT"] = "status-bar-left";
  UISlotId2["STATUS_BAR_RIGHT"] = "status-bar-right";
  return UISlotId2;
})(UISlotId || {});
var UI_SLOT_ID_SET = new Set(Object.values(UISlotId));

// src/modules/extensions/timestamp-plugin/TimestampButton.tsx
var import_react = __toESM(require("react"), 1);
var import_lucide_react = require("lucide-react");
var import_KernelContext = require("@/kernel/core/KernelContext");
var import_Events = require("@/kernel/core/Events");
var import_jsx_runtime = require("react/jsx-runtime");
var TIMEZONE_CONFIG = {
  locale: "zh-CN",
  timezone: "Asia/Shanghai"
};
function TimestampButton() {
  const kernel = (0, import_KernelContext.useKernel)();
  const [time, setTime] = import_react.default.useState(
    (/* @__PURE__ */ new Date()).toLocaleTimeString(TIMEZONE_CONFIG.locale, { timeZone: TIMEZONE_CONFIG.timezone })
  );
  import_react.default.useEffect(() => {
    const timer = setInterval(() => {
      setTime((/* @__PURE__ */ new Date()).toLocaleTimeString(TIMEZONE_CONFIG.locale, { timeZone: TIMEZONE_CONFIG.timezone }));
    }, 1e3);
    return () => clearInterval(timer);
  }, []);
  const handleClick = () => {
    const timeStr = (/* @__PURE__ */ new Date()).toLocaleString(TIMEZONE_CONFIG.locale, { timeZone: TIMEZONE_CONFIG.timezone }) + " ";
    kernel.emit(import_Events.CoreEvents.EDITOR_INSERT_TEXT, timeStr);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "button",
    {
      onClick: handleClick,
      className: "flex items-center gap-1 px-1.5 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors",
      title: "\u70B9\u51FB\u63D2\u5165\u5F53\u524D\u65F6\u95F4",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Clock, { className: "w-3.5 h-3.5 text-blue-500" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-mono text-[11px] leading-none", children: time })
      ]
    }
  );
}

// src/modules/extensions/timestamp-plugin/index.ts
var TimestampPlugin = class {
  id = "timestamp-plugin";
  name = "\u63D2\u5165\u5F53\u524D\u65F6\u95F4";
  version = "1.0.0";
  description = "\u5728\u7F16\u8F91\u5668\u4E2D\u5FEB\u901F\u63D2\u5165\u5F53\u524D\u65F6\u95F4\u6233\u3002";
  order = 100;
  dependencies = [];
  cleanup;
  logger;
  activate(context) {
    this.logger = context.logger;
    this.logger.info("Activating TimestampPlugin...");
    this.cleanup = context.registerUI("editor-header-right" /* EDITOR_HEADER_RIGHT */, {
      id: "timestamp-btn",
      component: TimestampButton,
      order: 110
    });
    this.logger.info("TimestampPlugin activated successfully");
  }
  deactivate() {
    if (this.cleanup) {
      this.cleanup();
      this.cleanup = void 0;
    }
    this.logger?.info("TimestampPlugin deactivated");
    this.logger = void 0;
  }
};
