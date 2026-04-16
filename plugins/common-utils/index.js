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

// src/modules/extensions/common-utils/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => CommonUtilsPlugin
});
module.exports = __toCommonJS(index_exports);
var import_types = require("@/kernel/system/plugin/types");
var CommonUtilsPlugin = class {
  id = "common-utils";
  name = "Common Utilities";
  version = "1.0.0";
  description = "Provides shared services like Logger, DateUtils, etc. for other plugins.";
  category = import_types.PluginCategory.SYSTEM;
  essential = true;
  // 强制始终开启
  hidden = true;
  // 在扩展中心隐藏
  author = "Xiao A Note Team";
  activate(context) {
    context.logger.info("CommonUtilsPlugin activated (LoggerService migrated to Kernel).");
  }
  deactivate() {
  }
};
