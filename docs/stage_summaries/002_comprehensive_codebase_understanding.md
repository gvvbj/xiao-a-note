# 阶段总结: 002 - 源码深度解析与架构理解报告

## 1. 核心架构：内核与插件系统 (Kernel & Plugin System)
项目采用了高度解耦的 **IoC (控制反转)** 架构，其核心是 `src/kernel/core/Kernel.ts`：
- **Kernel 作为总线**: 它继承自 `EventEmitter3`，充当全局事件总线和插件注册中心。
- **服务解耦**: 通过 `registerService` 注册底层服务（如 `fileSystem`, `window`），业务层通过 `useService` 或 `kernel.getService` 获取，不直接依赖具体实现。
- **UI 插槽**: 支持在主界面（如 `left-sidebar`, `main-editor`）预留插槽，插件可以动态注入 UI 组件。

## 2. 核心模块分析 (Core Modules)

### 2.1 编辑器模块 (Editor Module)
- **技术选型**: 基于 **CodeMirror 6**。
- **Live Preview**: 核心功能在 `src/modules/editor/cm-extensions/livePreview.ts` 中实现，通过自定义装饰器实现 Markdown 的实时预览效果。
- **集成模式**: `NoteEditor.tsx` 作为容器，集成了 `CodeMirrorEditor`、工具栏 (`EditorToolbar`) 和标签页管理 (`EditorTabs`)。

### 2.2 资源管理器模块 (Explorer Module)
- **文件管理**: `src/modules/explorer/index.ts` 注册了 `workspace` 服务。
- **状态管理**: 使用 `zustand` (`store.ts`) 管理文件树和项目根目录。

### 2.3 架构守卫 (Architectural Guard)
- **自动化检查**: `.agent/custom-mcp-servers/architectural-guard.js` 提供了一个 MCP 服务，用于自动检测跨模块非法引用（如 `editor` 模块直接引用 `explorer` 内部组件），确保代码库的长期可维护性。

## 3. 技术栈与设计原则

| 维度 | 技术栈 / 原则 | 备注 |
| :--- | :--- | :--- |
| **框架** | React + TypeScript + Electron | 现代桌面端开发组合 |
| **构建** | Vite + ES Modules | 极速的热重载与构建体验 |
| **通信** | IPC (Handlers 模式) | Electron 主/渲染进程通信模块化 |
| **原则** | 解耦、模块化、安全性 | 强制 Context Isolation 和协议保护 |

## 4. 评估与现状
- **解耦性**: 极高。插件之间通过 Kernel 事件通信，不存在循环依赖。
- **稳定性**: 良好。包含完善的 E2E 和集成测试套件。
- **扩展性**: 极佳。新增功能只需实现 `IPlugin` 接口并注入。

## 5. 后续开发建议
- 持续在 `.agent/custom-mcp-servers/` 下扩展更多的架构性约束。
- 进一步优化 `livePreview` 的性能，尤其是在超大 Markdown 文件下。
