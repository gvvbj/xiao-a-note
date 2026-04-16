# 插件架构验证与测试计划 (Test Plan)

## 目标 (Goal)
1.  **共享逻辑**: 验证插件间能否正确享用公共服务 (Shared Services)。
2.  **冲突解决**: 验证同一冲突组的插件能否互斥，独占插槽能否正确排序。
3.  **容错性**: 验证单个插件崩溃（加载失败或运行时错误）是否不影响主程序和其他插件运行。

## 用户审查 (User Review Required)
> [!IMPORTANT]
> **容错性测试**: 我们将故意引入“崩溃插件”进行测试。请确保测试在受控环境下进行，虽然架构设计了隔离，但预期的错误日志输出是正常的。


## 详细测试用例 (Test Cases)

### 1. 共享逻辑调用 (Shared Logic)
*   **目标**: 验证插件 `test-consumer` 能调用 `common-utils` 提供的 `LoggerService`。
*   **机制**:
    1.  **Provider**: `CommonUtils` 注册 `common-utils.logger` 服务。
    2.  **Consumer**: `TestConsumer` 依赖并调用该服务。
*   **动作 (Action)**:
    - [NEW] 创建 `src/modules/extensions/test-shared-consumer/index.ts`。
    - [CODE] 调用 `context.kernel.getService('common-utils.logger').info('Success')`。
*   **预期**: 控制台输出 `[Kernel] Success`。

### 2. 冲突解决 (Conflict Resolution)
*   **目标**: 验证冲突组机制。
*   **机制**:
    1.  **Conflict Group**: 两个插件声明相同的 `conflictGroup: 'mutex-test'`。
    2.  **Order**: 插件 A (Order 10) vs 插件 B (Order 20)。
*   **动作 (Action)**:
    - [NEW] 创建 `src/modules/extensions/test-conflict-alpha/index.ts` (Group A)。
    - [NEW] 创建 `src/modules/extensions/test-conflict-beta/index.ts` (Group B)。
    - [MANUAL] 手动在扩展中心切换激活状态。
*   **预期**: 激活其中一个时，另一个自动变为“已禁用”。

### 3. 容错性测试 (Fault Tolerance)
*   **目标**: 验证已有的 `try-catch` 隔离机制。
*   **机制**: 插件内部抛出未捕获异常，`PluginManager` 应捕获并记录错误，但不影响核心功能。
*   **动作 (Action)**:
    - [NEW] 创建 `src/modules/extensions/test-crash-load/index.ts` (Top-level crash)。
    - [NEW] 创建 `src/modules/extensions/test-crash-activate/index.ts` (Activate crash)。
*   **预期**:
    - App 正常启动。
    - 侧边栏/设置/大纲等功能可用。
    - 控制台显示红色 `Failed to load plugin` 错误。

## 文件修改清单 (Files to Modify)
我们将创建以下**临时测试插件** (位于 `src/modules/extensions/`)：

1.  `test-shared-consumer/index.ts`
2.  `test-conflict-alpha/index.ts`
3.  `test-conflict-beta/index.ts`
4.  `test-crash-load/index.ts`
5.  `test-crash-activate/index.ts`

## 规范检查 (Compliance)
*   [x] **No Hardcoding**: 测试插件仅使用标准 API。
*   [x] **Plugin-First**: 测试代码完全隔离在插件内部，不修改 Kernel。
