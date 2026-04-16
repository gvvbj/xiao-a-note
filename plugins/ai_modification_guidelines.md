# AI 修改规范与架构保护宪章 (Guardrails for AI)

> [!CAUTION]
> **AI 必读**：本项目内核已通过 Phase 1-6 全面合规性审计，达到 **100% 纯净状态**。以下规范具有最高优先级，任何违反将导致全部修改被拒绝。

---

## 一、架构铁律 (Absolute Architecture Laws)

### 1.1 插件优先原则 (Plugin-First Principle)

**内核只负责排线，不负责任何功能实现。插件实现一切 (Everything)。**

- 内核 (`src/kernel/`) 只提供**接口、事件契约、服务注册机制**
- 所有业务逻辑、UI 功能、编辑器增强**必须**在插件内实现
- 内核代码中**严禁**出现 `if (pluginId === 'xxx')` 等硬编码判断

### 1.2 零核心修改原则 (Zero Core Modification)

**添加任何新功能、修复任何 Bug，首先且唯一的方案是通过插件解决。**

核心文件**唯一允许**的修改（且需要明确说明理由）：

| 允许的操作 | 文件 | 说明 |
|-----------|------|------|
| 添加事件常量 | `src/kernel/core/Events.ts` | 仅添加一行常量声明 |
| 添加事件签名 | `src/kernel/core/Kernel.ts` | 仅在 `KernelEvents` 接口加一行签名 |
| 修复内核自身 Bug | 对应核心文件 | 必须先提交《影响分析报告》 |

### 1.3 类型安全原则 (Type Safety)

- **严禁** `as any` 类型逃逸（事件名、服务访问、插件属性）
- **严禁** 字符串字面量事件名（必须使用 `CoreEvents` 常量）
- **严禁** `console.log`（必须使用 `LoggerService`，引导阶段除外）
- **严禁** `(kernel as any).xxx` 访问非公开属性
- **严禁** `window.dispatchEvent` 使用硬编码字符串事件名

---

## 二、核心文件禁区 (Forbidden Zones)

> [!WARNING]
> 以下文件已通过 Phase 1-6 审计，处于**锁定状态**。未经用户授权，禁止修改。

### 2.1 绝对禁区（不允许添加业务逻辑）

```
src/kernel/core/Kernel.ts          — 内核主体
src/kernel/core/Events.ts          — 事件常量（仅允许追加声明）
src/kernel/core/KernelContext.tsx   — React Context
src/kernel/core/Constants.ts       — 全局常量
src/kernel/system/plugin/          — 插件系统（整个目录，capabilities.ts 和 RestrictedPluginContext.ts 已批准开放 registerMarkdownUsage 给第三方）
src/kernel/services/               — 核心服务（整个目录）
src/kernel/adapters/               — 平台适配器（整个目录）
src/kernel/registries/             — 注册表（整个目录）
src/main.tsx                       — 引导入口
```

### 2.2 结构禁区（不允许注入非架构代码）

```
src/modules/built-in/editor/components/CodeMirrorEditor.tsx  — 纯架构壳
src/modules/built-in/editor/framework/types.ts               — 类型定义
src/modules/built-in/editor/constants/                       — 常量/Facets
```

### 2.3 判断核心修改必要性的检查表

当 AI 声称"必须修改核心文件"时，用户应按此检查：

```
□ 是否在 CoreEvents.ts 添加事件常量？ → ✅ 允许
□ 是否在 Kernel.ts KernelEvents 添加签名？ → ✅ 允许
□ 是否修复内核自身的 Bug（如 emit 不工作）？ → ⚠️ 需要影响分析报告
□ 是否在核心文件中添加 if/else 业务逻辑？ → ❌ 严禁
□ 是否在核心文件中 import 插件模块？ → ❌ 严禁
□ 是否在核心文件中直接操作 DOM？ → ❌ 严禁
□ 是否"为了方便"把插件逻辑写进核心？ → ❌ 严禁
```

---

## 三、插件开发规范 (Plugin Development Standards)

### 3.1 插件结构规范

```
plugins/MyPlugin/
├── index.ts          — 注册入口（仅 activate/deactivate，零业务逻辑）
├── services/         — 业务逻辑（Controller、Service 等）
├── components/       — UI 组件（React 组件）
├── hooks/            — React Hooks
└── constants/        — 插件内部常量
```

**`index.ts` 严格规范：**
- 只允许：`context.registerXxx()`、`context.kernel.on()`、cleanup 逻辑
- 不允许：业务逻辑、条件判断、数据处理、DOM 操作

### 3.2 插件 class 规范

```typescript
// ✅ 正确：class 模式 + private 字段
export default class MyPlugin implements IPlugin {
    id = 'my-plugin';
    name = '我的插件';
    version = '1.0.0';
    order = 50;            // 可选：加载优先级
    
    private controller: MyController | null = null;
    
    activate(context: IPluginContext) {
        this.controller = new MyController(context);
        // 注册逻辑...
    }
    
    deactivate() {
        this.controller?.dispose();
        this.controller = null;
    }
}

// ❌ 错误：对象字面量 + (Plugin as any)._xxx
const MyPlugin: IPlugin = {
    activate: (context) => {
        (MyPlugin as any)._controller = new MyController(); // 严禁
    }
};
```

### 3.3 服务注册规范

```typescript
// ✅ 正确：通过 context 注册
context.registerService('myService', new MyService());

// ❌ 错误：直接操作 kernel
kernel.registerService('myService', new MyService());
```

### 3.4 事件使用规范

```typescript
// ✅ 正确：使用 CoreEvents 常量
context.kernel.on(CoreEvents.APP_CMD_SAVE, handler);
context.kernel.emit(CoreEvents.SETTING_CHANGED, { id, value });

// ✅ 正确：插件内部事件（无需注册到 CoreEvents）
context.kernel.emit('myPlugin:internal-event', data);

// ❌ 错误：字符串字面量 + as any
kernel.emit('APP_CMD_SAVE' as any);
kernel.on('SETTING_CHANGED' as any, handler);
```

---

## 四、行为准则与响应规范

### 4.1 修改前置要求

1. **理解优先**：修改前必须通过 `view_file` 充分理解文件的职责、依赖关系
2. **影响分析**：涉及多文件修改时，必须先提交影响分析
3. **最小修改**：每次修改范围尽可能小，禁止"顺手"优化不相关代码

### 4.2 修改红线

- **"停止修改"** = 禁止调用任何写操作工具
- **严禁**在同一个 Task 中混杂 Bug 修复和架构优化
- **严禁**盲目猜测：推理超过 **2 轮**仍无法确定根因时，必须切换到**日志注入调试法**（见 4.3）
- **严禁**重复尝试失败方案：若修复无效，必须先提交《深度分析报告》

### 4.3 Bug 修复流程

1. **描述 Bug**：用自己的理解描述 Bug 的现象和影响
2. **分析原因**：追踪 Context、Facet、Event 链路，确定根因
3. **日志注入调试**（当推理无法定位根因时）：
   - 在可疑函数的入口、分支、异步操作前后注入 `console.log`
   - 使用统一前缀 `[DEBUG][模块名]`，记录：参数值、返回值、状态
   - 让用户复现问题并提供控制台输出
   - 根据实际数据定位根因
   - **修复后必须清除所有临时日志**
4. **编写文档**：列出需要修改的文件，如涉及核心文件**必须重点说明理由**
5. **获得授权**：等待用户确认后再动手
6. **验证修复**：编译通过 + 功能验证

```typescript
// 日志注入格式规范
console.log('[DEBUG][onConfirm] delete 结果:', path, result);
console.log('[DEBUG][onKeyDown] selectedPaths:', Array.from(selectedPaths));
```

> [!TIP]
> **实战验证**：Delete 键删除失败的 Bug，推理 3 轮未果后注入 5 行日志，1 次复现即定位到路径格式不一致的根因。数据驱动远快于反复推理。

### 4.4 语言规范

- 所有给用户的消息、报告、注释使用**中文**
- 代码中的变量名、函数名使用**英文**
- 代码注释可中英混用

---

## 五、可用的插件 API 清单

以下 API 可在插件 `activate()` 中通过 `context` 调用，**无需修改任何核心文件**：

| API | 用途 |
|-----|------|
| `context.registerService(id, service)` | 注册服务 |
| `context.registerCommand(cmd)` | 注册命令 |
| `context.registerUI(slotId, component)` | 注册 UI 到插槽 |
| `context.registerSidebarItem(...)` | 注册侧边栏 |
| `context.registerEditorExtension(ext)` | 注册 CodeMirror 扩展 |
| `context.registerEditorToolbarItem(item)` | 注册工具栏按钮 |
| `context.registerEditorHeaderItem(...)` | 注册编辑器头部项 |
| `context.registerMarkdownDecorationProvider(provider)` | 注册 LivePreview 装饰 |
| `context.registerEditorKeymap(ext)` | 注册快捷键 |
| `context.registerStyle(id, css)` | 注册样式 |
| `context.registerIFrameSignal(type, handler)` | 注册 IFrame 信号 |
| `context.registerMarkdownUsage(plugin)` | 注册 Markdown 语法扩展 |
| `context.kernel.on(event, handler)` | 监听事件 |
| `context.kernel.emit(event, data)` | 发射事件 |
| `context.kernel.getService(id)` | 获取已注册服务 |