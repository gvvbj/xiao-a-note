# 影响分析报告：表格与代码块功能的插件化 (Impact Analysis: Table & Code Block Pluginization)

## 1. 变更背景
用户希望将“表格 (Table)”和“代码块 (Code Block)”功能从核心或潜在的硬编码逻辑中剥离，转为**插件化实现**。这也是进一步验证“插件优先”架构的实战演练。

参考已有的 `KaTeXPlugin`（数学公式）模式，我们将创建两个新的 Core 插件来分别管理这两个功能。

## 2. 现状分析
### 2.1 表格功能 (Table)
*   **语法解析**: 目前 `MarkedMarkdownService` 中实例化 `markdown-it` 时未显式配置 GFM 表格插件（虽然 `markdown-it` 默认 preset 通常包含 table，但显式引入更好）。
*   **UI 入口**: `InternalToolbarPlugin.tsx` 中**没有**发现插入表格的按钮。用户目前只能手写 Markdown 表格语法。

### 2.2 代码块功能 (Code Block)
*   **语法解析**: `markdown-it` 原生支持 fence code block。
*   **代码高亮**: 目前 `MarkedMarkdownService` **没有配置 `highlight` 选项**。这意味着导出的 HTML 中代码块没有语法高亮类名或高亮处理。
*   **UI 入口**: `InternalToolbarPlugin.tsx` 中**没有**发现插入代码块的按钮。
*   **编辑器支持**: `CodeMirror` 本身支持各种语言的高亮（这是编辑态），但从 Markdown 导出（预览/导出态）的角度看，缺少 `highlight.js` 或类似库的支持。

## 3. 变更方案

### 3.1 新增插件
我们将创建两个新的插件文件，位于 `src/modules/markdown-extra/` 目录：

#### A. `TablePlugin.ts`
*   **分类**: `CORE` (隐式语法支持，不显示在扩展列表)。
*   **职责**:
    1.  **语法**: 显式启用 `markdown-it` 的表格支持（如果需要引入 `markdown-it-multimd-table` 或确认默认行为）。
    2.  **UI**: 注册“插入表格”工具栏按钮（使用 `registerEditorToolbarItem`）。
    3.  **样式**: 注入基础的表格 CSS（边框、间距）。

#### B. `CodeBlockPlugin.ts`
*   **分类**: `CORE`。
*   **职责**:
    1.  **语法**: 配置 `markdown-it` 的 `highlight` 选项，集成 `highlight.js` 实现导出时的高亮。
    2.  **UI**: 注册“插入代码块”工具栏按钮。
    3.  **样式**: 注入代码块主题 CSS（如 GitHub Dark 代码块样式）。

### 3.2 核心代码修改
*   **`MarkedMarkdownService.ts`**:
    *   现状：其 `init()` 方法中直接 `new MarkdownIt(...)`。
    *   变更：不需要修改。因为我们刚刚实现的 `PluginManager` 已经支持通过 `registerMarkdownUsage` 把配置注入进去。
    *   **结论：核心代码零修改 (Zero Core Modification)。**

## 4. 影响范围 (Impact Scope)
*   **Markdown 渲染/导出**:
    *   表格将具有统一的样式（之前可能依赖浏览器默认）。
    *   代码块将新增语法高亮（之前是纯文本）。
*   **编辑器工具栏**:
    *   将新增两个按钮：“插入表格”和“插入代码块”。
*   **兼容性**:
    *   向后兼容，不影响现有文档。

## 5. 详细步骤预览
1.  创建 `src/modules/markdown-extra/TablePlugin.ts`。
2.  创建 `src/modules/markdown-extra/CodeBlockPlugin.ts`。
3.  在插件中实现 `activate` 方法，注册语法和按钮。
4.  (可选) 如果需要 `highlight.js`，可能需要 `npm install highlight.js`。

## 6. 风险评估
*   **Highlight.js 体积**: 引入高亮库可能会增加 Bundle 体积。建议按需加载或使用动态 import（我们的架构通过 `await import` 已经支持了这一点）。
*   **样式冲突**: 需要确保注入的 CSS 不会破坏编辑器内部的 CodeMirror 样式（通常两者作用域不同，Export 用于预览/导出，Editor 用于编辑，互不干扰）。

---
**确认**: 本次变更将严格遵守《插件开发规范指南》，把所有逻辑包含在插件文件内，不动 `src/kernel` 或 `src/editor` 的任何代码。
