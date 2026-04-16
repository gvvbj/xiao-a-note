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
var TimestampButton_exports = {};
__export(TimestampButton_exports, {
  TimestampButton: () => TimestampButton
});
module.exports = __toCommonJS(TimestampButton_exports);
var import_jsx_runtime = require("react/jsx-runtime");
var import_react = __toESM(require("react"), 1);
var import_lucide_react = require("lucide-react");
var import_KernelContext = require("@/kernel/core/KernelContext");
var import_Events = require("@/kernel/core/Events");
const TIMEZONE_CONFIG = {
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
      className: "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-all ml-2 border border-transparent hover:border-border",
      title: "\u70B9\u51FB\u63D2\u5165\u5F53\u524D\u65F6\u95F4",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Clock, { className: "w-3.5 h-3.5 text-blue-500" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-mono", children: time })
      ]
    }
  );
}
