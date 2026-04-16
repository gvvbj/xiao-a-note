/**
 * 图片插件样式表
 */
export const IMAGE_PLUGIN_CSS = `
.cm-img-container { display: inline-block; position: relative; max-width: 100%; margin: 4px 0; vertical-align: top; }
.cm-img-widget { display: block; transition: outline 0.1s; width: 100%; height: auto; }
.cm-img-widget:hover { outline: 2px solid var(--primary); }
.cm-img-container:hover .cm-img-resize-wrapper { opacity: 1; visibility: visible; transform: translateY(0); }
`;
