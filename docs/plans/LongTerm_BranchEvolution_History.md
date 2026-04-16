# Git 分支终极演进全景记录

本记录追踪了从修复标签页滚动故障开始，到编辑器整体架构重构的核心里程碑，包含详细的分支名、唯一 ID (Commit Hash) 及其实现说明。

---

## 1. 分支演进路线图

### 🚩 阶段一：核心故障修复
*   **分支名称**：`fix/tab-scroll-offset-issue`
*   **Commit ID**：`8b8d1580f850ed729e63a958341d94cdf9767223`
*   **详细说明**：
    *   **核心逻辑**：定稿了 **“方案 7：隔离守卫 + 滚动保存”**。
    *   **关键变更**：引入 `lastAppliedPathRef` 物理隔离视口，实现 150ms 防抖的滚动位置自动持久化。
LongTerm_BranchEvolution_History.md    *   **解决问题**：解决了在多个标签页之间快速切换时，滚动位置和光标位置因异步渲染导致的“漂移”或“丢失”。

### 🧱 阶段二：重构与解耦 (次代分支)
*   **分支名称**：`refactor/editor-decoupling-and-commands`
*   **Commit ID**：`e35928005ace2671652756cc37abc6d74054b2b6`
*   **详细说明**：
    *   **核心逻辑**：对编辑器进行“外科手术”级精简，将 600 行的上帝类拆分为 5 个专业化模块。
    *   **关键变更**：抽离 [useEditorTheme](file:///e:/require/xiao-a-note/src/modules/editor/hooks/useEditorTheme.ts#23-89), [useEditorScrolling](file:///e:/require/xiao-a-note/src/modules/editor/hooks/useEditorScrolling.ts#14-121) 等 Hook；物理隔离 [editor-layout.css](file:///e:/require/xiao-a-note/src/modules/editor/styles/editor-layout.css)；升级 [CommandService](file:///e:/require/xiao-a-note/src/kernel/services/CommandService.ts#16-87) 以支持更复杂的编辑器指令。
    *   **技术影响**：实现了编辑器与外部模块的完全解耦，为后续插件化奠定基础。

### 🚀 阶段三：主分支集成与终极锁定
*   **分支名称**：`master`
*   **Commit ID**：`560e9ad37ff1940f7a14b3d66ac1214c74315191`
*   **详细说明**：
    *   **核心逻辑**：全量集成上述重构，并在最后修复了因样式拆离导致的 **“高度链断裂”** 故障。
    *   **关键变更**：通过 `flex-1 min-h-0` 强制锁定编辑器视口高度，确保 CodeMirror 6 滚动引擎在任何嵌套环境下均能正常激活。
    *   **当前状态**：这是目前项目的 **最稳定生产版**。

---

## 2. 操作记录摘要

1.  **合并**：`fix/tab-scroll-offset-issue` 已于 `e359280` 合并入重构链条。
2.  **清理**：原 `fix/tab-scroll-offset-issue` 分支已逻辑删除，其功能已合并入 `master`。
3.  **基准**：后续所有开发建议以 `560e9ad` 为基准。

---
*记录人：Antigravity*
*归档日期：2026-01-26*
