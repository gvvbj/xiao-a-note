---
description: # 小A笔记 (Xiao A Note) 开发流程规范 (Development Process)
---

# 小A笔记 (Xiao A Note) 开发流程规范 (Development Process)

本文档基于项目现状（Electron + React + Kernel架构）制定，旨在确保项目的安全性、稳定性、扩展性、解耦性、兼容性和模块化。所有开发人员需严格遵守本规范。

## 一、技术栈约定

### 核心原则
1.  **成熟稳定**：基于 Electron + Vite + React 生态，确保长期维护性。
2.  **类型安全**：全量使用 TypeScript，严禁随意使用 `any`，核心逻辑必须定义接口（Interface）。
3.  **架构统一**：遵循 `Kernel`（内核）+ `Plugins`（插件）的架构模式，禁止绕过内核直接进行模块间强耦合。

### 选型规范

| 分类 | 选型要求 | 当前项目标准 |
| :--- | :--- | :--- |
| **构建工具** | 高性能、支持热更新 | **Vite** (配置于 `vite.config.ts`) |
| **前端框架** | 组件化、声明式UI | **React 19** + **Hooks** |
| **桌面运行时** | 跨平台、安全隔离 | **Electron** (开启 `contextIsolation`, 禁用 `nodeIntegration`) |
| **编程语言** | 静态类型检查 | **TypeScript** |
| **状态管理** | 轻量、原子化、解耦 | **Zustand** (用于组件内部) + **Kernel Events** (用于跨模块通信) |
| **样式方案** | 原子化、可定制主题 | **TailwindCSS** + **CSS Variables** (支持动态换肤) |
| **编辑器内核** | 高性能、可扩展 | **CodeMirror 6** |
| **测试框架** | 单元/集成/E2E全覆盖 | **Vitest** (单元/组件) + **Playwright** (E2E) |

---

## 二、项目结构规范

### 核心原则
1.  **核心与业务分离**：`src/kernel` 为系统核心，`src/modules` 为业务功能，严禁模块间循环依赖。
2.  **依赖倒置**：业务模块仅依赖 `Kernel` 提供的接口（`getService`, `emit`），不直接依赖其他模块的实现类。
3.  **功能内聚**：相关功能的文件（组件、Hook、Utils）应聚合在同一个模块目录下。

### 目录结构说明

```
root/
├── electron/               # [主进程] Electron 主进程代码
│   ├── handlers/           # 具体的业务处理逻辑 (如 FileSystem, WindowControl)
│   └── main.ts             # 入口文件，仅负责协调和初始化
├── src/                    # [渲染进程] 
│   ├── kernel/             # [核心] 应用微内核，定义系统契约
│   │   ├── core/           # Kernel 实现, EventBus
│   │   ├── interfaces/     # 核心接口定义 (IPlugin, IUIComponent)
│   │   ├── registry/       # 注册表
│   │   ├── adapters/       # 接口适配层 (如 ElectronAdapter 适配 web 接口)
│   │   └── index.ts        # 模块入口
│   ├── modules/            # [业务] 功能模块 (插件化)
│   │   ├── editor/         # 编辑器模块
│   │   ├── explorer/       # 文件资源管理器
│   │   └── outline/        # 大纲模块
│   │       ├── components/ # 模块内部私有组件
│   │       ├── index.ts    # 模块入口 (实现 IPlugin 接口)
│   │       └── ...
│   ├── shared/             # [共享] 通用组件、工具库、类型定义
│   ├── App.tsx             # 根组件
│   └── main.tsx            # 启动入口 (Kernel bootstrap)
└── tests/                  # 测试目录
```

### 命名规范
*   **文件/目录**：
    *   React 组件文件：大驼峰（`NoteEditor.tsx`）
    *   普通 TS 文件/工具：小驼峰（`fileSystem.ts`）或 连字符（`path-utils.ts`）
    *   目录：全小写或连字符（`modules/file-explorer`）
*   **代码实体**：
    *   组件：大驼峰（`FileExplorer`）
    *   接口：`I` 开头（`IPlugin`, `IFileSystem`）
    *   常量：全大写下划线（`DEFAULT_WINDOW_SIZE`）

---

## 三、代码风格要求

### 通用规则
1.  **模块化开发**：
    *   新功能必须封装为 **Plugin**（插件）。
    *   通过 `kernel.loadPlugin()` 在 `main.tsx` 中注册。
    *   UI 注入必须通过 `kernel.registerUI()` 到指定的 Slot（插槽），禁止硬编码到 `App.tsx`。

2.  **安全性（Security）**：
    *   **IPC 安全**：禁止在渲染进程直接使用 `electron` 模块（除了类型）。所有原生能力必须封装在 `ElectronAdapter` 中，通过 `window.electron` 桥接。
    *   **XSS 防护**：使用 `DOMPurify` 处理所有 HTML 渲染内容（尤其是 Markdown 预览）。
    *   **文件访问**：严格限制文件读取范围，仅允许访问用户明确打开的文件/目录。

3.  **稳定性（Stability）**：
    *   **错误边界**：每个核心模块（Plugin）的 UI 入口应包裹 `ErrorBoundary`。
    *   **空值检查**：使用 Optional Chaining (`?.`) 和 Nullish Coalescing (`??`) 处理不可靠数据。

4.  **开放接口（Open Interfaces）**：
    *   **事件驱动**：模块间通信优先使用 `kernel.emit()` 和 `kernel.on()`。
    *   **Service 模式**：通用能力（如文件读写、弹窗）必须注册为 Service，通过 `kernel.getService('id')` 调用。

### 格式规范
*   **缩进**：2个空格。
*   **分号**：必须使用分号。
*   **Lint**：提交前必须通过 `npm run lint` (ESLint 9+ Flat Config)。

---

## 四、测试覆盖要求

### 核心原则
1.  **核心逻辑必测**：`kernel` 目录下的核心逻辑和 `electron/handlers` 下的主进程逻辑必须有单元测试。
2.  **关键路径 E2E**：App 启动、文件打开、编辑保存、导出功能必须包含在 E2E 测试中。

### 覆盖范围表

| 测试类型 | 框架 | 覆盖对象/目录 | 覆盖率目标 |
| :--- | :--- | :--- | :--- |
| **单元测试** | Vitest | `src/kernel/core`, `src/shared/utils` | ≥ 90% |
| **组件测试** | Vitest + React Testing Library | `src/shared/components`, 各 Module 核心组件 | ≥ 80% |
| **E2E 测试** | Playwright | 完整用户流程 (启动 -> 编辑 -> 保存) | 覆盖 P0 级用例 |

### 执行要求
1.  **开发自测**：提交代码前本地执行 `npm run test` 和 `npm run test:e2e`（关键变更时）。
2.  **CI 门禁**：GitHub Actions/GitLab CI 中，Merge Request 必须通过所有测试才可合并。

---

## 五、版本控制和回滚机制

### 分支管理
1.  **Main 分支**：保护分支，仅允许通过 PR 合并，时刻保持可发布状态。
2.  **Dev/Next 分支**：日常开发主线，功能开发完成后合并至此。
3.  **Feature 分支**：`feat/功能名`，从 Dev 切出，开发完成后提 PR 回 Dev。
4.  **Fix 分支**：`fix/bug描述`，修复特定 Bug。

### 提交规范 (Conventional Commits)
格式：`type(scope): subject`
*   `feat`: 新功能 (integration of new module)
*   `fix`: 修复 Bug
*   `docs`: 文档变更
*   `refactor`: 代码重构（无功能变更）
*   `test`: 测试用例增删
*   `chore`: 构建/依赖/配置变动

### 发布与回滚
1.  **版本号**：遵循 Semantic Versioning (X.Y.Z)。
    *   X: 架构重大升级/破坏性变更
    *   Y: 新特性发布
    *   Z: Bug修复/补丁
2.  **Tag 管理**：每次发布并在 `main` 分支合并后，打上 `vX.Y.Z` 标签。
3.  **回滚策略**：
    *   若生产环境发现致命 Bug，通过 Revert Commit 回滚 `main` 分支代码，并发布 `vX.Y.Z+1` 热修复版本。
    *   Electron 客户端回滚依赖于自动更新服务（如 electron-updater），需确保构建产物保留历史版本以便回退配置。