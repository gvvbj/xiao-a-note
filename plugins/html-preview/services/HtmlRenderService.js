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
var HtmlRenderService_exports = {};
__export(HtmlRenderService_exports, {
  HtmlRenderService: () => HtmlRenderService
});
module.exports = __toCommonJS(HtmlRenderService_exports);
var import_state = require("@codemirror/state");
var import_view = require("@codemirror/view");
var import_HtmlPreviewWidget = require("../widgets/HtmlPreviewWidget");
class HtmlRenderService {
  /**
   * 获取 CodeMirror 扩展 (StateField)
   */
  getExtension() {
    const field = import_state.StateField.define({
      create(state) {
        return buildDecorations(state.doc.toString(), state.selection);
      },
      update(decorations, tr) {
        if (tr.docChanged || tr.selectionSet) {
          return buildDecorations(tr.state.doc.toString(), tr.state.selection);
        }
        return decorations;
      },
      provide: (f) => import_view.EditorView.decorations.from(f)
    });
    return field;
  }
}
function buildDecorations(docText, selection) {
  const builder = new import_state.RangeSetBuilder();
  const codeBlockRegex = /```html-preview\n([\s\S]*?)```/g;
  let match;
  while ((match = codeBlockRegex.exec(docText)) !== null) {
    const fullMatch = match[0];
    const codeContent = match[1];
    const from = match.index;
    const to = from + fullMatch.length;
    const cursorInBlock = selection.ranges.some(
      (range) => range.from >= from && range.from <= to || range.to >= from && range.to <= to
    );
    if (cursorInBlock) {
      continue;
    }
    const replaceDecoration = import_view.Decoration.replace({
      widget: new import_HtmlPreviewWidget.HtmlPreviewWidget(codeContent.trim()),
      block: true
      // 块级替换
    });
    builder.add(from, to, replaceDecoration);
  }
  return builder.finish();
}
