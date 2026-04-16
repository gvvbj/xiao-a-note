# 插件日志重构计划 (Logger Refactoring Plan)

## 1. 现状分析 (Current State)
经过代码扫描，目前系统中的插件（包括内置和扩展）普遍直接使用 `console.log`, `console.warn`, `console.error` 进行日志输出。
这种方式存在以下问题：
*   **格式不统一**: 缺乏统一的时间戳、命名空间前缀。
*   **难以管理**: 无法统一控制日志级别（如关闭某个插件的日志）。
*   **无法持久化**: 仅依靠浏览器控制台，难以收集用户日志文件。

## 2. 重构目标 (Objectives)
将插件中的 `console.*` 调用替换为 `common-utils` 提供的 `LoggerService`。

**优势**:
*   **标准化**: 自动附加 `[Namespace]` 前缀。
*   **可扩展**: 未来可轻松扩展为写入文件或上传服务器。
*   **解耦**: 插件不再依赖底层控制台 API。

## 3. 实施步骤 (Action Plan)

### 3.1 目标插件
作为试点，我们将优先重构以下两个具有代表性的插件：

1.  **Timestamp Plugin** (`src/modules/extensions/timestamp-plugin/index.ts`)
    *   类型: 扩展插件 (Extension)
    *   包含: `activate`, `deactivate` 时的日志。

2.  **Theme Plugin** (`src/modules/built-in/theme/index.tsx`)
    *   类型: 系统插件 (System)
    *   包含: 主题切换、激活等关键生命周期日志。

### 3.2 修改细节

对于每个目标插件：

1.  **声明依赖**: 在 `dependencies` 列表中添加 `'common-utils'`。
2.  **获取服务**: 在 `activate` 方法中获取 Logger。
    ```typescript
    const logger = context.kernel.getService<LoggerService>('common-utils.logger');
    // 创建子 Logger (可选，如果不直接用 root logger)
    const myLogger = logger.create('MyPlugin'); 
    ```
3.  **替换调用**:
    *   `console.log(...)` -> `logger.info(...)`
    *   `console.warn(...)` -> `logger.warn(...)`
    *   `console.error(...)` -> `logger.error(...)`

## 4. 验证 (Verification)
重构完成后，通过控制台观察日志输出。
*   **Before**: `[ThemePlugin] Activated`
*   **After**: `[Kernel] [Theme] Activated` (假设 LoggerService 实现了格式化)

*注：目前的 `LoggerService` 默认实现只是简单的封装，我们可能需要先稍微增强一下 `LoggerService` 的 `create` 方法以支持前缀自动附加，才能真正体现价值。*

## 5. 建议增强 (Enhancement)
在开始通过替换前，建议先优化 `src/modules/extensions/common-utils/services/LoggerService.ts`：
*   支持 `create(namespace)` 返回一个新的 Logger 实例，该实例的所有输出自动带上 `[namespace]` 前缀。
