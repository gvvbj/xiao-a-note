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
var HtmlPreviewWidget_exports = {};
__export(HtmlPreviewWidget_exports, {
  HtmlPreviewWidget: () => HtmlPreviewWidget
});
module.exports = __toCommonJS(HtmlPreviewWidget_exports);
var import_view = require("@codemirror/view");
class HtmlPreviewWidget extends import_view.WidgetType {
  constructor(htmlContent) {
    super();
    this.htmlContent = htmlContent;
  }
  eq(other) {
    return other.htmlContent === this.htmlContent;
  }
  toDOM(view) {
    const container = document.createElement("div");
    container.className = "cm-html-preview-seamless";
    container.style.display = "block";
    container.style.margin = "0";
    container.style.padding = "0";
    const shadow = container.attachShadow({ mode: "open" });
    const contentWrapper = document.createElement("div");
    contentWrapper.innerHTML = this.htmlContent;
    const style = document.createElement("style");
    style.textContent = `
            :host {
                display: block;
                width: 100%;
                box-sizing: border-box;
            }
            /* \u6062\u590D\u57FA\u7840 HTML \u5143\u7D20\u7684\u9ED8\u8BA4\u6837\u5F0F */
            h1, h2, h3, h4, h5, h6 {
                margin: 0.5em 0;
                font-weight: bold;
            }
            h1 { font-size: 2em; }
            h2 { font-size: 1.5em; }
            h3 { font-size: 1.17em; }
            p {
                margin: 0.5em 0;
            }
            a {
                color: #007bff;
                text-decoration: underline;
            }
            /* \u5141\u8BB8\u7528\u6237\u81EA\u5B9A\u4E49\u6837\u5F0F\u8986\u76D6 */
            * {
                box-sizing: border-box;
            }
        `;
    shadow.appendChild(style);
    shadow.appendChild(contentWrapper);
    return container;
  }
  ignoreEvent() {
    return false;
  }
}
