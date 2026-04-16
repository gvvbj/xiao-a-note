# Xiao A Note — 第三方插件开发指南

> **版本**: 1.3.0 | **最后更新**: 2026-03-06
>
> 本文档面向希望为 Xiao A Note 开发扩展插件的第三方开发者。
> 内核的内部实现是黑箱，本文档仅覆盖**公开的 API 和接口**。

---

## 目录

- [第 1 章：快速开始](#第-1-章快速开始)
- [第 2 章：架构概览](#第-2-章架构概览)
  - [2.4 外部插件加载时序](#24-外部插件加载时序) ← 新增
- [第 3 章：插件定义（IPlugin）](#第-3-章插件定义iplugin)
  - [3.4 状态管理最佳实践](#34-状态管理最佳实践) ← 新增
- [第 4 章：UI 注册能力](#第-4-章ui-注册能力)
- [第 5 章：编辑器扩展能力](#第-5-章编辑器扩展能力)
- [第 6 章：Markdown 增强能力](#第-6-章markdown-增强能力)
- [第 7 章：交互式块基础设施](#第-7-章交互式块基础设施)
- [第 8 章：命令与样式](#第-8-章命令与样式)
  - [8.2.1 沙箱环境中的 CSS 限制](#821-沙箱环境中的-css-限制) ← 新增
- [第 9 章：事件系统](#第-9-章事件系统)（含 Payload 类型签名）
- [第 10 章：服务访问](#第-10-章服务访问)（含方法详解 + 可用性说明）
- [第 11 章：构建与发布](#第-11-章构建与发布)
- [第 12 章：安全模型](#第-12-章安全模型)
- [第 13 章：主题自定义](#第-13-章主题自定义)
- [第 14 章：插件部署与分发](#第-14-章插件部署与分发)
- [第 15 章：调试与排查](#第-15-章调试与排查) ← 新增
- [第 16 章：引擎兼容与黑箱边界](#第-16-章引擎兼容与黑箱边界) ← 新增
- [附录](#附录)

---

# 第 1 章：快速开始


## 1.1 5 分钟创建你的第一个插件

我们来创建一个「时间戳插入器」— 在编辑器头部显示一个按钮，点击后在光标位置插入当前时间。

### 步骤 1：创建目录结构

```
src/modules/extensions/my-timestamp/
├── index.ts          ← 插件入口（仅注册逻辑）
├── manifest.json     ← 插件清单
└── TimestampButton.tsx  ← UI 组件
```

> **建议**：参考项目内 `ai_modification_guidelines.md` 中的目录规范，将业务逻辑放在 `services/`、UI 放在 `components/`。这不是强制要求，但有助于保持代码整洁。

### 步骤 2：编写 manifest.json

```json
{
    "id": "my-timestamp",
    "name": "时间戳插入器",
    "version": "1.0.0",
    "description": "在编辑器中快速插入当前时间戳。",
    "author": "Your Name",
    "main": "index.js"
}
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `id` | ✅ | 全局唯一标识符，建议用 `kebab-case` |
| `name` | ✅ | 用户可见的名称 |
| `main` | ✅ | 入口文件路径（构建后的 JS 文件） |
| `version` | ✅ | 语义化版本号 |
| `description` | ❌ | 插件描述 |
| `author` | ❌ | 作者信息 |


### 步骤 3：编写插件入口

```typescript
// index.ts — 仅负责注册，不含业务逻辑
import { IPlugin, IPluginContext } from '@/kernel/system/plugin/types';
import { TimestampButton } from './TimestampButton';

export default class MyTimestampPlugin implements IPlugin {
    id = 'my-timestamp';
    name = '时间戳插入器';
    version = '1.0.0';
    description = '在编辑器中快速插入当前时间戳。';

    private cleanup?: () => void;

    activate(context: IPluginContext) {
        // 注册一个按钮到编辑器头部栏
        this.cleanup = context.registerEditorHeaderItem(
            'my-timestamp-btn',  // 唯一 ID
            TimestampButton      // React 组件
        );

        context.logger.info('MyTimestampPlugin activated');
    }

    deactivate() {
        this.cleanup?.();
    }
}
```

> **核心规则**：`index.ts` 只做注册（`context.registerXxx()`），不写业务逻辑。

> **自动发现前提（重要）**：
> 1. 入口文件必须是 `index.ts` / `index.tsx`
> 2. 必须使用 `export default class XxxPlugin implements IPlugin`
> 3. 仅 `export const plugin = new XxxPlugin()` 这类命名导出，系统默认**不会**自动发现；请保持标准默认导出入口

> **部署差异（重要）**：
> - `src/modules/extensions/` 下的 TypeScript 插件：需要先构建，产物输出到 `plugins/`
> - `plugins/` 下的外部插件（JS）：用户复制目录后重启应用即可加载

### 步骤 4：编写 UI 组件

```tsx
// TimestampButton.tsx
import React from 'react';
import { Clock } from 'lucide-react';

export const TimestampButton: React.FC = () => {
    const handleClick = () => {
        // 通过 DOM API 获取编辑器并插入文本
        const now = new Date().toLocaleString();
        document.execCommand('insertText', false, now);
    };

    return (
        <button onClick={handleClick} title="插入时间戳"
                style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={14} />
            <span>{new Date().toLocaleTimeString()}</span>
        </button>
    );
};
```

### 步骤 5：构建与加载

```bash
# 在项目根目录执行
node scripts/build-extensions.cjs
```

构建完成后，插件会被打包到 `plugins/my-timestamp/index.js`，应用启动时自动加载。

---

# 第 2 章：架构概览

## 2.1 公开能力与宿主关系

你可以把第三方插件系统理解为三层：

```
┌──────────────────────────────────────────────┐
│              你的插件代码                    │
│    UI、命令、编辑增强、渲染逻辑、样式        │
├──────────────────────────────────────────────┤
│            公开插件 API / Context            │
│ registerXxx / on / emit / getService / logger│
├──────────────────────────────────────────────┤
│                宿主应用运行时                │
│     编辑器、工作区、文件系统、插件平台       │
└──────────────────────────────────────────────┘
```

你只需要关心两件事：

- 你的插件通过公开 `context` 能做什么
- 当公开能力不可用时，应该如何降级

至于宿主内部如何组织目录、如何编排内置模块、如何实现插件发现与调度，都不属于第三方插件需要依赖的契约。

## 2.2 插件沙箱

第三方插件运行在 `RestrictedPluginContext` 沙箱中。以下是扩展插件可用的全部能力：

| 能力 | API | 说明 |
|------|-----|------|
| UI 注册 | `registerUI` / `registerSidebarItem` | 注册 UI 组件到插槽或侧边栏 |
| 编辑器头部 | `registerEditorHeaderItem` | 注册编辑器头部栏组件 |
| 编辑器扩展 | `registerEditorExtension` | 注册 CodeMirror 扩展（带错误监控） |
| 工具栏按钮 | `registerEditorToolbarItem` | 注册编辑器工具栏按钮 |
| 快捷键绑定 | `registerEditorKeymap` | 注册键盘快捷键 |
| 快捷键元数据 | `registerShortcut` / `registerShortcuts` | 注册快捷键到帮助面板 |
| Markdown 装饰 | `registerMarkdownDecorationProvider` | 注册实时预览装饰器 |
| IFrame 隔离渲染 | `registerIsolatedRenderer` | 注册 IFrame 隔离渲染提供者 |
| IFrame 信号 | `registerIFrameSignal` | 注册 IFrame 桥接信号 |
| Markdown 语法 | `registerMarkdownUsage` | 注册 Markdown 语法扩展（带安全包裹） |
| 命令注册 | `registerCommand` | 注册全局命令 |
| 样式注册 | `registerStyle` | 注册 CSS 样式 |
| 事件监听 | `context.on(event, handler)` | 监听全局事件（返回取消函数） |
| 事件发射 | `context.emit(event, ...args)` | 发射全局事件 |
| 服务访问 | `context.getService(id)` | 获取已注册的系统服务（只读） |
| 日志 | `context.logger` | 统一日志输出（info / warn / error / debug） |
| 扩展 ID | `context.extensionId` | 获取当前插件的唯一标识（只读） |

> **⚠️ 安全限制**：扩展插件访问 `context.kernel` 时，拿到的是**受限代理（sandbox proxy）**，而不是完整内核实例。
> 代理会对 `emit/getService/on/off` 应用沙箱规则，并对受限访问记录告警日志。
> 实践中仍建议优先使用 `context.on()` / `context.emit()` / `context.getService()`，避免误用 `context.kernel`。
> 服务注册 (`registerService`) 同样被禁止；这是平台保留能力，不属于第三方插件公开能力。

## 2.3 插件生命周期

```
  加载 manifest.json
        │
        ▼
  实例化插件类 (new Plugin())
        │
        ▼
  ─── activate(context) ───  ← 你的注册逻辑在这里执行
        │
     [运行中]  ← 所有注册的能力生效
        │
  ─── deactivate() ─────── ← 清理所有已注册资源
        │
        ▼
     [已卸载]
```

## 2.4 外部插件加载时机

> **关键概念**：外部插件的 `activate()` 执行时，文档、编辑器视图或某些服务可能尚未完全就绪。

### 简化时序图

```
应用启动
  │
  ├─ 平台初始化
  │
  ├─ 外部插件激活 ← activate() 在此时执行
  │     ⚠️ 文档可能尚未打开
  │     ⚠️ 某些视图事件可能尚未触发
  │
  └─ 文档 / 编辑器状态逐步就绪
```

### 常见问题：首次状态事件被错过

如果你的插件依赖 `DOCUMENT_CHANGED` 之类的事件来初始化状态，可能会遇到：插件已经激活，但当前文档还没完成加载，因此第一次初始化没有拿到预期数据。

### 解决方案：事件监听 + 主动探测

在事件监听之外，主动探测一次当前状态，作为初始化补充：

```typescript
// 需导入：IPlugin / IPluginContext / CoreEvents / ServiceId
export default class MyPlugin implements IPlugin {
    // ... 省略字段定义 ...

    activate(context: IPluginContext) {
        const tryProbe = () => {
            try {
                const editorService = context.getService<any>(ServiceId.EDITOR);
                const state = editorService?.getState?.();
                const fileId = state?.currentFileId;
                if (fileId) {
                    this.handleCurrentFile(fileId);
                }
            } catch (error) {
                context.logger.debug('初始探测未命中，等待后续事件', error);
            }
        };

        tryProbe();

        const off = context.on(CoreEvents.DOCUMENT_CHANGED, (payload: any) => {
            const fileId = payload?.fileId ?? null;
            if (fileId) {
                this.handleCurrentFile(fileId);
            }
        });

        this.disposables.push(off);
    }

    private handleCurrentFile(fileId: string) {
        // 初始化逻辑
    }
}
```

**为什么使用 try-catch？** 因为某些公开能力在启动早期可能暂未就绪。探测失败时不应阻塞插件后续工作。

> **最佳实践**：任何依赖当前文档、当前选区、当前编辑视图的插件，都应同时具备“事件驱动 + 主动探测”两套初始化手段。

---

# 第 3 章：插件定义（IPlugin）

## 3.1 完整接口

```typescript
export interface IPlugin {
    /** 全局唯一标识符 */
    id: string;

    /** 用户可见的名称 */
    name: string;

    /** 语义化版本号 */
    version: string;

    /** 插件描述 */
    description?: string;

    /** 作者信息 */
    author?: string;

    /** 插件类别 */
    category?: PluginCategory;

    /** 是否为内置插件（在扩展中心默认隐藏）*/
    internal?: boolean;

    /** 依赖的其他插件 ID 列表 */
    dependencies?: string[];

    /** 互斥的插件 ID 列表（激活此插件会自动禁用互斥插件）*/
    conflicts?: string[];

    /** 冲突组 ID（同一组的插件同一时间只能有一个激活）*/
    conflictGroup?: string;

    /** 加载优先级（越小越早加载，默认 100）*/
    order?: number;

    /** 是否延迟激活 */
    lazy?: boolean;

    /** 延迟激活的触发条件 */
    activationTrigger?: PluginActivationTrigger;

    /** 静态工具栏项（允许懒加载插件在未激活时显示按钮）*/
    staticToolbarItems?: IEditorToolbarItem[];

    /** 静态命令（允许懒加载插件在未激活时注册命令）*/
    staticCommands?: ICommandDefinition[];

    /** 自动休眠超时时间（毫秒）*/
    hibernationTimeout?: number;

    /** 是否为核心必要插件（不可禁用，启动失败将重试） */
    essential?: boolean;

    /** 是否在扩展中心隐藏（如公共库、系统插件） */
    hidden?: boolean;

    /** 声明插件兼容的编辑器引擎 ID 列表。建议显式填写，不要依赖默认兼容策略 */
    supportedEngines?: string[];

    /** 强制隔离级别（由内核审计决定） */
    isolationLevel?: IsolationLevel;

    /** 插件激活回调 */
    activate: (context: IPluginContext) => void;

    /** 插件停用回调 */
    deactivate?: () => void;
}
```

> **保留字段说明**：`internal` / `essential` / `hidden` / `isolationLevel` 这类字段主要由平台治理使用。第三方插件除非平台另有明确说明，否则不要把它们当成常规开发入口。

## 3.2 字段详解

### id

全局唯一标识符。推荐使用 `kebab-case`，如 `my-awesome-plugin`。

```typescript
// ✅ 好的 ID
id = 'latex-preview';
id = 'custom-theme-dark';

// ❌ 不好的 ID（可能与其他插件冲突）
id = 'plugin1';
id = 'test';
```

### category

```typescript
export enum PluginCategory {
    CORE = 'core',      // 核心功能（Explorer、Outline 等）
    EDITOR = 'editor',  // 编辑器增强（Markdown 扩展、装饰等）
    UI = 'ui',          // UI 扩展（状态栏、自定义按钮等）
    SYSTEM = 'system',  // 系统级（插件管理、主题管理等）
    OTHER = 'other'
}
```

**为什么重要**？类别用于扩展中心的分组展示，帮助用户快速找到插件。

### order

加载优先级。默认值 `100`。数值越小越先加载。

```typescript
// 场景：你的插件需要在大部分插件之前初始化
order = 10;

// 场景：你的插件对加载顺序无要求
order = 100; // 默认值，无需显式设置
```

**何时关心 order？** 当你的插件提供基础设施供其他插件使用时（如注册全局服务）。

### dependencies

声明依赖的其他插件 ID。如果依赖未加载，你的插件不会被激活。

```typescript
// 场景：你的插件需要 settings-plugin 提供的设置服务
dependencies = ['settings-plugin'];
```

> **边界说明（非常重要）**：
> `dependencies` 依赖的是插件 ID，不是任意服务名。
> 如果你依赖的是系统服务（如 `editorService` / `themeService`），应通过 `context.getService()` 获取并做好空值兼容，而不是写进 `dependencies`。

> **最佳实践**：
> 当你的插件为其他插件提供基础设施（例如注册某个服务）时，建议同时设置：
> 1. `order`（确保加载顺序）
> 2. `dependencies`（表达运行时契约）

### conflicts 与 conflictGroup

```typescript
// 方式 1：直接声明互斥关系
conflicts = ['another-preview-plugin'];
// 效果：激活此插件会自动禁用 another-preview-plugin

// 方式 2：使用冲突组（多个插件只能同时存在一个）
conflictGroup = 'markdown-preview';
// 效果：所有 conflictGroup='markdown-preview' 的插件中，同时只能有一个处于激活状态
```

> **提示**：冲突机制适合“同类能力替换”（如不同预览器、不同渲染器）。如果目标插件是系统关键插件（`essential`），请先评估是否真的应该替换。

### requestElevation（权限提升 / 信任授权）

外部插件默认运行在沙箱上下文（受限能力）。如果你的插件确实需要更高权限（例如需要访问完整 `kernel` 能力），可以声明：

```typescript
// 仅外部插件（plugins/）需要考虑此项
requestElevation = true;
```

声明后，系统会触发授权流程并弹出授权对话框，由用户决定是否授予更高权限。

> **建议**：除非确有必要，不要申请权限提升。优先使用沙箱公开 API（`context.on/emit/getService/registerXxx`）。

### lazy 与 activationTrigger

延迟激活——插件启动时不立即 `activate`，等条件满足时才激活。

```typescript
// 场景：插件仅在文档中出现 ```mermaid 时才激活
lazy = true;
activationTrigger = {
    type: 'syntax',
    pattern: /```mermaid/
};

// 场景：插件在特定事件发生时激活（支持监听多个事件）
lazy = true;
activationTrigger = {
    type: 'event',
    eventNames: ['editor:open_file', 'workspace:changed']
};

// 场景：插件仅通过命令面板手动激活
lazy = true;
activationTrigger = { type: 'manual' };
```

### staticToolbarItems 与 staticCommands

当插件是 `lazy` 时，它在未 activate 前无法通过 `context.registerXxx()` 注册 UI。
`staticToolbarItems` 和 `staticCommands` 解决这个问题——它们在加载阶段就生效。

```typescript
lazy = true;
activationTrigger = { type: 'syntax', pattern: /```latex/ };

// 即使插件未激活，此按钮也会显示在工具栏
staticToolbarItems = [{
    id: 'latex-insert',
    label: '插入 LaTeX',
    icon: FunctionSquare,
    type: 'button',
    onClick: (editorRef) => {
        const editor = editorRef.current;
        editor?.executeCommand('insertText', '```latex\n\\frac{a}{b}\n```');
    },
    group: 'insert',
    order: 60
}];
```

### hibernationTimeout

自动休眠。插件在指定时间内无活动后自动 `deactivate`，释放内存。
下次触发条件满足时重新 `activate`。

```typescript
// 30 秒无活动后自动休眠
hibernationTimeout = 30000;
```

## 3.3 完整示例

```typescript
import { IPlugin, IPluginContext, PluginCategory } from '@/kernel/system/plugin/types';

export default class MyPlugin implements IPlugin {
    id = 'my-awesome-plugin';
    name = 'My Awesome Plugin';
    version = '1.0.0';
    description = '一个展示所有配置选项的示例插件';
    author = 'Developer';
    category = PluginCategory.EDITOR;
    order = 50;
    dependencies = [];
    conflicts = [];

    private disposables: (() => void)[] = [];

    activate(context: IPluginContext) {
        // 所有注册方法都返回清理函数
        this.disposables.push(
            context.registerStyle('my-plugin-style', `.my-class { color: red; }`),
            context.registerCommand({
                id: 'my-plugin:hello',
                title: 'Say Hello',
                handler: () => alert('Hello from My Plugin!')
            })
        );

        context.logger.info('Plugin activated');
    }

    deactivate() {
        // 统一清理所有注册的资源
        this.disposables.forEach(fn => fn());
        this.disposables = [];
    }
}
```

> **设计模式**：所有 `context.registerXxx()` 方法都返回 `() => void` 清理函数。
> 将它们收集到 `disposables` 数组中，`deactivate` 时统一调用。

## 3.4 状态管理最佳实践

对于有内部状态的插件（例如需要跟踪当前文件是否符合特定条件、用户是否开启了某个模式等），推荐使用 **Controller + Subscribe** 模式。

### 为什么需要 Controller 模式？

扩展插件不能使用 `context.registerService()` 注册服务，因此无法通过系统服务共享状态。
Controller 模式提供了一种轻量的替代方案：

- **Controller** 持有状态 + 业务逻辑
- **React 组件** 通过 `subscribe()` 订阅状态变化
- **状态变更** 自动触发 UI 更新

### 步骤 1：定义 Controller

```typescript
// services/MyController.ts

/** 插件内部状态类型 */
export interface MyPluginState {
    isActive: boolean;       // 是否激活特定模式
    isTargetFile: boolean;   // 当前文件是否符合条件
    data: any;               // 业务数据
}

export class MyController {
    private state: MyPluginState = {
        isActive: false,
        isTargetFile: false,
        data: null,
    };

    /** 订阅者列表 */
    private listeners: Set<() => void> = new Set();

    /** 获取当前状态快照 */
    getState(): Readonly<MyPluginState> {
        return this.state;
    }

    /** 订阅状态变化，返回取消订阅函数 */
    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /** 通知所有订阅者 */
    private notify() {
        this.listeners.forEach(fn => fn());
    }

    /** 处理文档内容变更 */
    handleContentChange(content: string, filePath?: string) {
        // 示例：检测文件是否包含特定标记
        const isTarget = content.startsWith('---\ntype: my-plugin');

        if (isTarget !== this.state.isTargetFile) {
            this.state = { ...this.state, isTargetFile: isTarget };
            this.notify(); // 通知 UI 更新
        }
    }

    /** 切换激活状态 */
    toggleActive() {
        this.state = { ...this.state, isActive: !this.state.isActive };
        this.notify();
    }
}
```

### 步骤 2：在 React 组件中消费状态

```tsx
// components/MyToggleButton.tsx
import React from 'react';
import { MyController } from '../services/MyController';

export const MyToggleButton: React.FC<{ controller: MyController }> = ({ controller }) => {
    // 1. 初始化状态
    const [state, setState] = React.useState(controller.getState());

    // 2. 订阅 Controller 状态变化
    React.useEffect(() => {
        return controller.subscribe(() => {
            // ⚠️ 必须创建新对象，否则 React 不会检测到变化
            setState({ ...controller.getState() });
        });
    }, [controller]);

    // 3. 条件渲染：不符合条件时隐藏
    if (!state.isTargetFile) return null;

    // 4. 渲染 UI
    return (
        <button
            className="my-plugin-toggle-btn"
            onClick={() => controller.toggleActive()}
            title={state.isActive ? '退出特殊模式' : '进入特殊模式'}
        >
            {state.isActive ? '🔵 激活' : '⚪ 未激活'}
        </button>
    );
};
```

### 步骤 3：在插件入口中连接

```typescript
// index.ts
import { MyController } from './services/MyController';
import { MyToggleButton } from './components/MyToggleButton';

export default class MyPlugin implements IPlugin {
    id = 'my-plugin';
    name = '我的插件';
    version = '1.0.0';

    private disposables: (() => void)[] = [];

    activate(context: IPluginContext) {
        const controller = new MyController();

        // 注册 UI 组件（传入 controller 作为 props）
        this.disposables.push(
            context.registerUI(UISlotId.EDITOR_HEADER_RIGHT, {
                component: () => React.createElement(MyToggleButton, { controller })
            })
        );

        // 监听文档变化 → 更新 Controller 状态
        this.disposables.push(
            context.on(CoreEvents.DOCUMENT_CHANGED, (payload: any) => {
                if (payload?.content !== undefined) {
                    controller.handleContentChange(payload.content, payload.path);
                }
            })
        );
    }

    deactivate() {
        this.disposables.forEach(fn => fn());
        this.disposables = [];
    }
}
```

### 数据流示意

```
DOCUMENT_CHANGED 事件
        │
        ▼
  Controller.handleContentChange()
        │
        ├─ 更新 state
        └─ 调用 notify()
               │
               ▼
         所有 subscribe 回调被触发
               │
               ▼
         React setState() → 组件重渲染
```

> **关键点**：
> - Controller 不依赖 React —— 它是纯 TypeScript 类，可在任何环境中复用
> - `setState({ ...controller.getState() })` 中的展开运算符 `...` 是必须的，否则 React 不会检测到对象引用变化
> - 多个组件可以同时订阅同一个 Controller，实现状态共享

---

# 第 4 章：UI 注册能力

## 4.1 registerUI(slotId, component)

将 React 组件注册到指定的 UI 插槽中。

```typescript
registerUI(slotId: UISlotId | string, component: IUIComponent): () => void;
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `slotId` | `UISlotId \| string` | 目标插槽标识。推荐使用 `UISlotId` 枚举 |
| `component` | `IUIComponent` | 包含 `component` 属性的对象 |

### 可用插槽（UISlotId）

| 插槽 ID | 位置 | 典型用途 |
|---------|------|---------|
| `LEFT_SIDEBAR` | 左侧边栏 | 文件浏览器、大纲 |
| `RIGHT_SIDEBAR` | 右侧边栏 | 属性面板 |
| `SIDEBAR_BOTTOM` | 侧边栏底部 | 辅助信息 |
| `STATUS_BAR` | 底部状态栏 | 全宽状态信息 |
| `STATUS_BAR_LEFT` | 状态栏左侧 | 文件信息、行号 |
| `STATUS_BAR_RIGHT` | 状态栏右侧 | 编码、语言信息 |
| `EDITOR_HEADER` | 编辑器头部 | 文件标签上方 |
| `EDITOR_HEADER_RIGHT` | 编辑器头部右侧 | 全屏、分屏按钮 |
| `EDITOR_TOOLBAR` | 编辑器工具栏区域 | 整行工具栏 |
| `EDITOR_TOOLBAR_ITEMS` | 工具栏具体项区域 | 格式化按钮组 |
| `EDITOR_MODALS` | 编辑器模态框区域 | 对话框、弹窗 |
| `EDITOR_SIDE_COMPANION` | 编辑器侧栏伴随视图 | 分栏预览 |
| `TITLE_BAR` | 标题栏 | 应用标题 |
| `EDITOR_TABS` | 标签栏 | 文件标签页 |
| `MAIN_EDITOR` | 主编辑器区域 | 编辑器本体 |

### 案例：在状态栏显示字数统计

```typescript
import { UISlotId } from '@/kernel/core/Constants';

activate(context: IPluginContext) {
    this.disposables.push(
        context.registerUI(UISlotId.STATUS_BAR_RIGHT, {
            component: () => {
                const [count, setCount] = React.useState(0);
                // 可通过事件监听更新字数
                return <span style={{ fontSize: 12, opacity: 0.7 }}>{count} 字</span>;
            }
        })
    );
}
```

## 4.2 registerSidebarItem(id, component, label, icon, order)

注册一个侧边栏视图。这是 `registerUI(LEFT_SIDEBAR, ...)` 的便捷封装。

```typescript
registerSidebarItem(
    id: string,
    component: React.ComponentType,
    label?: string,
    icon?: React.ElementType,
    order?: number
): () => void;
```

### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `string` | ✅ | 唯一标识符 |
| `component` | `React.ComponentType` | ✅ | 视图的 React 组件 |
| `label` | `string` | ❌ | 侧边栏标签文字 |
| `icon` | `React.ElementType` | ❌ | 图标组件（推荐用 `lucide-react`） |
| `order` | `number` | ❌ | 排列优先级（越小越靠前） |

### 案例：添加待办事项面板

```typescript
import { ListTodo } from 'lucide-react';
import { TodoPanel } from './components/TodoPanel';

activate(context: IPluginContext) {
    this.disposables.push(
        context.registerSidebarItem(
            'todo-panel',    // ID
            TodoPanel,       // React 组件
            '待办事项',       // 标签
            ListTodo,        // 图标
            30               // 排在第 3 位
        )
    );
}
```

## 4.3 registerEditorHeaderItem(id, component, props, order)

在编辑器头部栏注册组件（如工具按钮、状态指示器）。

```typescript
registerEditorHeaderItem(
    id: string,
    component: React.ComponentType,
    props?: any,
    order?: number
): () => void;
```

### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `string` | ✅ | 唯一标识符 |
| `component` | `React.ComponentType` | ✅ | React 组件 |
| `props` | `any` | ❌ | 传给组件的额外 props |
| `order` | `number` | ❌ | 排列优先级 |

### 案例

参见第 1 章的时间戳插件示例。

---

# 第 5 章：编辑器扩展能力

## 5.1 registerEditorExtension(extension)

注册一个 CodeMirror 6 扩展到编辑器中。这是最强大的 API 之一，允许你深度定制编辑器行为。

> **安全保障**：扩展插件注册的 CodeMirror 扩展会被自动包裹错误监控。如果扩展运行时崩溃，系统会触发熔断机制，防止影响整个编辑器。

```typescript
registerEditorExtension(extension: Extension): () => void;
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `extension` | `Extension` | CodeMirror 6 的 Extension 对象 |

**什么是 Extension？** 它可以是 `ViewPlugin`、`StateField`、`Facet`、`keymap` 等任何 CodeMirror 扩展。

### 案例 1：高亮特定关键字

```typescript
import { Decoration, DecorationSet, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

const highlightPlugin = ViewPlugin.fromClass(class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
            this.decorations = this.buildDecorations(update.view);
        }
    }

    buildDecorations(view: EditorView) {
        const builder = new RangeSetBuilder<Decoration>();
        const keyword = 'TODO';
        const mark = Decoration.mark({ class: 'highlight-todo' });

        for (const { from, to } of view.visibleRanges) {
            const text = view.state.doc.sliceString(from, to);
            let pos = 0;
            while ((pos = text.indexOf(keyword, pos)) !== -1) {
                builder.add(from + pos, from + pos + keyword.length, mark);
                pos += keyword.length;
            }
        }
        return builder.finish();
    }
}, { decorations: v => v.decorations });

// 在 activate 中注册
activate(context: IPluginContext) {
    this.disposables.push(
        context.registerEditorExtension(highlightPlugin),
        context.registerStyle('todo-highlight', `
            .highlight-todo {
                background-color: rgba(255, 200, 0, 0.3);
                border-radius: 2px;
                padding: 1px 2px;
            }
        `)
    );
}
```

### 案例 2：自定义装饰器（行号标注）

```typescript
import { gutter, GutterMarker } from '@codemirror/view';

class BookmarkMarker extends GutterMarker {
    toDOM() {
        const span = document.createElement('span');
        span.textContent = '🔖';
        return span;
    }
}

const bookmarkGutter = gutter({
    class: 'cm-bookmark-gutter',
    markers: view => {
        // 返回书签位置的标记
        // 实际实现需要一个 StateField 来存储书签位置
        return RangeSet.empty;
    }
});

activate(context: IPluginContext) {
    this.disposables.push(
        context.registerEditorExtension(bookmarkGutter)
    );
}
```

## 5.2 registerEditorToolbarItem(item)

在编辑器工具栏添加按钮。

```typescript
registerEditorToolbarItem(item: IEditorToolbarItem): () => void;
```

### IEditorToolbarItem 完整定义

```typescript
interface IEditorToolbarItem {
    /** 唯一标识符 */
    id: string;

    /** 按钮标签文字 */
    label: string;

    /** 图标组件（推荐 lucide-react） */
    icon: React.ComponentType<{ className?: string }>;

    /** 类型：'button' = 点击按钮，'custom' = 自定义渲染 */
    type: 'button' | 'custom';

    /** 自定义渲染函数（仅 type='custom' 时使用） */
    render?: (props: {
        editorRef: React.MutableRefObject<IEditorRef | null>,
        activeStates: Record<string, boolean>
    }) => React.ReactNode;

    /** 点击回调（仅 type='button' 时使用） */
    onClick?: (editorRef: React.MutableRefObject<IEditorRef | null>) => void;

    /** 快捷键提示文字 */
    shortcut?: string;

    /** 排序权重（越小越靠前，默认 100） */
    order?: number;

    /** 分组标识 */
    group?: 'basic' | 'insert' | 'history' | 'other';
}
```

### 案例：添加「插入分隔线」按钮

```typescript
import { Minus } from 'lucide-react';

activate(context: IPluginContext) {
    this.disposables.push(
        context.registerEditorToolbarItem({
            id: 'insert-hr',
            label: '分隔线',
            icon: Minus,
            type: 'button',
            onClick: (editorRef) => {
                editorRef.current?.executeCommand('insertText', '\n---\n');
            },
            shortcut: 'Ctrl+Shift+H',
            group: 'insert',
            order: 50
        })
    );
}
```

## 5.3 registerEditorKeymap(extension)

注册编辑器快捷键绑定。

```typescript
registerEditorKeymap(extension: Extension): () => void;
```

### 案例：Ctrl+Shift+T 插入时间戳

```typescript
import { keymap } from '@codemirror/view';

activate(context: IPluginContext) {
    const timestampKeymap = keymap.of([{
        key: 'Ctrl-Shift-t',
        run: (view) => {
            const now = new Date().toLocaleString();
            view.dispatch({
                changes: { from: view.state.selection.main.head, insert: now }
            });
            return true; // 返回 true 表示已处理
        }
    }]);

    this.disposables.push(
        context.registerEditorKeymap(timestampKeymap)
    );
}
```

## 5.4 registerShortcut / registerShortcuts

注册快捷键**元数据**到帮助面板。这只是展示信息，实际绑定需要用 `registerEditorKeymap`。

```typescript
registerShortcut(item: IShortcutItem): () => void;
registerShortcuts(items: IShortcutItem[]): () => void;
```

### IShortcutItem 定义

```typescript
interface IShortcutItem {
    /** 唯一标识 */
    id: string;
    /** 按键组合显示文本 */
    keys: string;
    /** 功能描述 */
    description: string;
    /** 所属分组 */
    group: 'file' | 'edit' | 'view' | 'explorer' | 'table' | 'other';
    /** 排序权重 */
    order?: number;
}
```

### 案例

```typescript
activate(context: IPluginContext) {
    this.disposables.push(
        context.registerShortcuts([
            {
                id: 'my-plugin:insert-timestamp',
                keys: 'Ctrl + Shift + T',
                description: '插入当前时间戳',
                group: 'edit',
                order: 50
            },
            {
                id: 'my-plugin:toggle-panel',
                keys: 'Ctrl + Shift + P',
                description: '切换插件面板',
                group: 'view',
                order: 60
            }
        ])
    );
}
```

---

# 第 6 章：Markdown 增强能力

## 6.1 registerMarkdownDecorationProvider(provider)

注册实时预览装饰器。这是实现代码块预览（如数学公式、图表）的核心 API。

```typescript
registerMarkdownDecorationProvider(provider: IDecorationProvider): () => void;
```

### IDecorationProvider 接口

```typescript
interface IDecorationProvider {
    /** 该提供者响应的语法树节点类型 */
    nodeTypes: string[];

    /** 渲染装饰 */
    render(node: SyntaxNodeRef, context: IDecorationContext): IDecorationResult | Range<Decoration>[];
}
```

### IDecorationContext 接口

```typescript
interface IDecorationContext {
    /** 当前编辑器状态 */
    state: EditorState;

    /** 当前编辑器视图 */
    view: EditorView;

    /** 判断指定范围是否被光标选中（用于决定是否显示源码） */
    isRangeActive: (from: number, to: number) => boolean;

    /** 判断指定行是否有光标（用于决定是否显示源码） */
    isLineActive: (from: number) => boolean;

    /** 当前文件的基路径（用于解析相对路径资源） */
    basePath: string | null;
}
```

### IDecorationResult 接口

```typescript
interface IDecorationResult {
    /** 产生的装饰器列表 */
    decorations: Range<Decoration>[];

    /** 是否跳过该节点的子节点遍历？
     * 对于块级替换（如完整代码块预览），设为 true 以防止内部冲突 */
    shouldSkipChildren?: boolean;
}
```

### 常用 nodeTypes

| 节点类型 | 对应的 Markdown 语法 |
|---------|---------------------|
| `FencedCode` | \`\`\`code\`\`\` 围栏代码块 |
| `Image` | `![alt](url)` 图片 |
| `Table` | 表格 |
| `InlineCode` | \`code\` 行内代码 |
| `Link` | `[text](url)` 链接 |
| `Emphasis` | `*text*` 斜体 |
| `StrongEmphasis` | `**text**` 粗体 |
| `BulletList` / `OrderedList` | 列表 |
| `Blockquote` | `>` 引用块 |

### 案例：为 `warning` 代码块添加黄色背景

```typescript
import { Decoration, WidgetType } from '@codemirror/view';

class WarningWidget extends WidgetType {
    constructor(private message: string) { super(); }

    toDOM() {
        const div = document.createElement('div');
        div.className = 'warning-block';
        div.innerHTML = `⚠️ <strong>警告</strong>: ${this.message}`;
        return div;
    }
}

activate(context: IPluginContext) {
    this.disposables.push(
        context.registerMarkdownDecorationProvider({
            nodeTypes: ['FencedCode'],
            render(node, ctx) {
                // 获取代码块信息行（```warning）
                const firstLine = ctx.state.doc.lineAt(node.from);
                if (!firstLine.text.startsWith('```warning')) return [];

                // 如果光标在此块内，显示源码（不装饰）
                if (ctx.isRangeActive(node.from, node.to)) return [];

                // 获取代码块内容
                const content = ctx.state.doc.sliceString(node.from, node.to);
                const message = content.split('\n').slice(1, -1).join('\n');

                return {
                    decorations: [
                        Decoration.replace({
                            widget: new WarningWidget(message),
                            block: true
                        }).range(node.from, node.to)
                    ],
                    shouldSkipChildren: true // 阻止子节点遍历
                };
            }
        }),
        context.registerStyle('warning-block', `
            .warning-block {
                background: rgba(255, 200, 0, 0.15);
                border-left: 3px solid #f0c000;
                padding: 12px 16px;
                border-radius: 4px;
                margin: 4px 0;
            }
        `)
    );
}
```

## 6.2 registerIsolatedRenderer(renderer)

注册 IFrame 隔离渲染器。适用于需要运行第三方脚本、样式隔离的场景（如 HTML 预览、图表库）。

> **安全保障**：内容在 `sandbox="allow-scripts"` 的 IFrame 中渲染，具有严格的 CSP 策略，不会影响主编辑器。

```typescript
registerIsolatedRenderer(renderer: IIsolatedRenderer): () => void;
```

### IIsolatedRenderer 接口

```typescript
interface IIsolatedRenderer {
    /** 响应的语法节点类型 */
    nodeTypes: string[];

    /** 所属插件 ID（用于诊断与追踪） */
    ownerPluginID?: string;

    /** 获取渲染载荷。返回 null 表示跳过（如光标在块内时） */
    getPayload: (node: SyntaxNodeRef, context: IDecorationContext)
        => IIsolatedRenderPayload | null | Promise<IIsolatedRenderPayload | null>;
}
```

### IIsolatedRenderPayload 接口

```typescript
interface IIsolatedRenderPayload {
    /** 渲染的 HTML 字符串 */
    html: string;

    /** 组件专属 CSS 样式 */
    css?: string;

    /** 脚本载荷（在 IFrame 沙箱内执行） */
    scripts?: string[];
}
```

### 案例：安全渲染 HTML 代码块

```typescript
activate(context: IPluginContext) {
    this.disposables.push(
        context.registerIsolatedRenderer({
            nodeTypes: ['FencedCode'],
            ownerPluginID: 'html-safe-preview',

            getPayload(node, ctx) {
                const firstLine = ctx.state.doc.lineAt(node.from);
                if (!firstLine.text.startsWith('```html')) return null;

                // 光标在块内时不渲染（显示源码）
                if (ctx.isLineActive(node.from)) return null;

                // 提取代码内容
                const content = ctx.state.doc.sliceString(node.from, node.to);
                const htmlContent = content.split('\n').slice(1, -1).join('\n');

                return {
                    html: htmlContent,
                    css: `
                        body { 
                            font-family: system-ui; 
                            padding: 16px;
                            color: #333;
                        }
                    `
                };
            }
        })
    );
}
```

## 6.3 registerIFrameSignal(type, handler)

注册 IFrame 和宿主之间的通信信号。当 IFrame 内的脚本调用 `bridge.sendSignal(type, data)` 时，对应的 handler 会被触发。

```typescript
registerIFrameSignal(
    type: string,
    handler: (iframe: HTMLIFrameElement, data: any) => void
): () => void;
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `type` | `string` | 信号类型标识 |
| `handler` | `(iframe, data) => void` | 接收回调，`iframe` 是信号来源的 IFrame 元素 |

### IFrame 端发送信号

在 `IIsolatedRenderPayload.scripts` 中注入的脚本可以使用 `bridge` 对象：

```javascript
// IFrame 内的脚本（通过 scripts 数组注入）
bridge.sendSignal('my-signal', { action: 'update', value: 42 });
bridge.sendPulse(); // 声明交互意图，阻止预览被意外销毁
```

### 案例：IFrame 内的按钮通知宿主

```typescript
activate(context: IPluginContext) {
    // 注册信号处理器
    this.disposables.push(
        context.registerIFrameSignal('counter-update', (iframe, data) => {
            context.logger.info(`收到计数器更新: ${data.count}`);
        })
    );

    // 注册隔离渲染器
    this.disposables.push(
        context.registerIsolatedRenderer({
            nodeTypes: ['FencedCode'],
            ownerPluginID: 'counter-widget',
            getPayload(node, ctx) {
                // ...（检查语法类型、光标位置等）
                return {
                    html: `<button id="btn">点击 +1</button><span id="val">0</span>`,
                    scripts: [`
                        let count = 0;
                        document.getElementById('btn').onclick = () => {
                            count++;
                            document.getElementById('val').textContent = count;
                            bridge.sendSignal('counter-update', { count });
                        };
                    `]
                };
            }
        })
    );
}
```

## 6.4 registerMarkdownUsage(plugin)

注册 Markdown 语法扩展。这会影响**导出**（PDF、Word 等）和**预览面板**的渲染。

> **安全保障**：扩展插件注册的语法插件会被自动包裹异常捕获，单个插件崩溃不会影响全局渲染。

```typescript
registerMarkdownUsage(plugin: IMarkdownPlugin): () => void;
```

### IMarkdownPlugin 接口

```typescript
interface IMarkdownPlugin {
    /** 插件唯一标识 */
    id: string;

    /** 加载到 markdown-it 实例的方法 */
    apply: (md: any) => void;

    /** 该插件所需的 CSS 样式（用于导出） */
    getCss?: () => string;

    /** 该插件所需的 DOMPurify 白名单配置 */
    getPurifyConfig?: () => {
        ADD_TAGS?: string[];
        ADD_ATTR?: string[];
    };

    /** 异步后处理钩子（在 markdown-it 渲染后执行） */
    postProcess?: (html: string) => Promise<string>;

    /** 排序权重（越小越先执行） */
    order?: number;
}
```

### 字段详解

- **`apply(md)`**：接收 `markdown-it` 实例，在此安装自定义规则
- **`getCss()`**：返回导出时所需的 CSS，确保 PDF/Word 输出格式正确
- **`getPurifyConfig()`**：声明此插件生成的自定义 HTML 标签/属性，避免被 DOMPurify 净化掉
- **`postProcess(html)`**：异步后处理，如将 `<div class="mermaid">` 替换为实际渲染的 SVG

### 案例：自定义容器语法（:::tip ... :::）

```typescript
activate(context: IPluginContext) {
    this.disposables.push(
        context.registerMarkdownUsage({
            id: 'custom-container',
            order: 50,

            apply(md) {
                // 添加自定义容器规则
                md.core.ruler.push('custom_container', (state) => {
                    const tokens = state.tokens;
                    for (let i = 0; i < tokens.length; i++) {
                        if (tokens[i].type === 'fence' && tokens[i].info === 'tip') {
                            tokens[i].type = 'html_block';
                            tokens[i].content = `
                                <div class="custom-container tip">
                                    <p class="container-title">💡 提示</p>
                                    <p>${tokens[i].content}</p>
                                </div>
                            `;
                        }
                    }
                });
            },

            getCss: () => `
                .custom-container.tip {
                    background: #e8f5e9;
                    border-left: 4px solid #4caf50;
                    padding: 12px 16px;
                    border-radius: 4px;
                    margin: 8px 0;
                }
                .container-title {
                    font-weight: bold;
                    margin-bottom: 4px;
                }
            `,

            getPurifyConfig: () => ({
                ADD_TAGS: ['div'],
                ADD_ATTR: ['class']
            })
        })
    );
}
```

---

# 第 7 章：交互式块基础设施

交互式块基础设施是一套**共享工具库**，位于 `@/shared/interactive-block/`。它为所有需要「预览 / 源码视图切换」的插件提供统一的三态管理和 UI 组件。

## 7.1 BlockModeManager — 三态管理器

管理代码块的显示模式：`auto`（跟随光标）、`source`（锁定源码）、`preview`（锁定预览）。

```typescript
import { BlockModeManager, BlockMode } from '@/shared/interactive-block';

const modeManager = new BlockModeManager();
```

### API

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `setMode(pos, mode)` | `pos: number, mode: BlockMode` | `void` | 设置指定位置代码块的模式 |
| `getMode(pos)` | `pos: number` | `BlockMode` | 获取当前模式 |
| `shouldRender(pos, from, to, isLineActive)` | 位置参数 + 光标检测函数 | `boolean` | 判断是否应该显示预览 |

### shouldRender 的工作原理

这是最核心的方法，决定代码块当前应该显示预览还是源码：

```typescript
const shouldShow = modeManager.shouldRender(
    node.from,                    // 代码块起始位置
    node.from,                    // 范围起始
    node.to,                      // 范围结束
    (pos) => ctx.isLineActive(pos) // 光标检测函数
);

if (shouldShow) {
    // → 显示预览 Widget
} else {
    // → 显示源码 + CopyButton
}
```

**三种模式的 `shouldRender` 行为**：

| 模式 | 返回值 | 说明 |
|------|--------|------|
| `auto` | 光标不在块内 → `true`，光标在块内 → `false` | 默认行为 |
| `source` | 始终 `false` | 锁定显示源码 |
| `preview` | 始终 `true` | 锁定显示预览 |

## 7.2 CockpitOverlay — 操控面板

提供 Source / Preview / Unlock 三个按钮的 UI。有两种模式：

### Widget 模式（直接 DOM）

适用于**非 IFrame** 渲染的插件（如 Mermaid）。

```typescript
import { createCockpitDom, COCKPIT_STYLES } from '@/shared/interactive-block';

class MyWidget extends WidgetType {
    toDOM() {
        const wrapper = document.createElement('div');
        wrapper.className = 'interactive-block-wrapper';

        // 添加操控面板
        wrapper.appendChild(createCockpitDom({
            from: this.pos,
            mode: this.mode,
            badge: 'MyPlugin',
            onSetMode: (pos, mode) => {
                modeManager.setMode(pos, mode);
                // 触发刷新
            }
        }));

        // 添加预览内容
        const preview = document.createElement('div');
        preview.innerHTML = this.renderedContent;
        wrapper.appendChild(preview);

        return wrapper;
    }

    ignoreEvent() { return true; } // 重要：让按钮点击事件穿透
}
```

### IFrame 模式（HTML 字符串）

适用于 IFrame 隔离渲染的插件（如 HTML Preview）。

```typescript
import { getCockpitHtmlForIFrame, COCKPIT_STYLES } from '@/shared/interactive-block';

getPayload(node, ctx) {
    const cockpitHtml = getCockpitHtmlForIFrame({
        from: node.from,
        mode: modeManager.getMode(node.from),
        badge: 'HTML'
    });

    return {
        html: cockpitHtml + actualContentHtml,
        css: COCKPIT_STYLES + myStyles
    };
}
```

## 7.3 CopyButtonWidget — 源码操作栏

在源码视图模式下，显示「复制」和「切回预览」按钮。

```typescript
import { CopyButtonWidget, COPY_BUTTON_STYLES } from '@/shared/interactive-block';

// 在 shouldRender 返回 false 时使用
if (!shouldShow) {
    return {
        decorations: [
            Decoration.widget({
                widget: new CopyButtonWidget({
                    code: sourceCode,  // 源代码文本（用于复制）
                    pos: node.from,    // 代码块位置
                    onSetMode: (pos, mode) => {
                        modeManager.setMode(pos, mode);
                        // 触发刷新
                    }
                }),
                side: -1,
                block: true
            }).range(node.from)
        ],
        shouldSkipChildren: true
    };
}
```

## 7.4 触发编辑器刷新

模式切换后需要触发编辑器刷新（重新计算装饰器）。使用事件总线：

```typescript
import { CoreEvents } from '@/kernel/core/Events';

const onSetMode = (pos: number, mode: BlockMode) => {
    modeManager.setMode(pos, mode);
    context.kernel.emit(CoreEvents.EDITOR_REQUEST_REFRESH);
};
```

> `EDITOR_REQUEST_REFRESH` 由内置的 `EditorRefreshBridgePlugin` 监听，它会自动 dispatch CodeMirror 的刷新指令。你不需要了解内部实现。

## 7.5 完整案例：LaTeX 预览插件

```typescript
import { IPlugin, IPluginContext, PluginCategory } from '@/kernel/system/plugin/types';
import { CoreEvents } from '@/kernel/core/Events';
import { Decoration, WidgetType } from '@codemirror/view';
import {
    BlockModeManager, BlockMode,
    createCockpitDom, CopyButtonWidget,
    COCKPIT_STYLES, COPY_BUTTON_STYLES
} from '@/shared/interactive-block';

class LatexWidget extends WidgetType {
    constructor(
        private code: string,
        private pos: number,
        private mode: BlockMode,
        private onSetMode: (pos: number, mode: BlockMode) => void
    ) { super(); }

    toDOM() {
        const wrapper = document.createElement('div');
        wrapper.className = 'interactive-block-wrapper latex-preview';

        // 操控面板
        wrapper.appendChild(createCockpitDom({
            from: this.pos,
            mode: this.mode,
            badge: 'LaTeX',
            onSetMode: this.onSetMode
        }));

        // LaTeX 渲染区域
        const render = document.createElement('div');
        render.className = 'latex-render-area';
        try {
            // 假设 katex 已通过 npm 引入
            render.innerHTML = katex.renderToString(this.code, {
                displayMode: true,
                throwOnError: false
            });
        } catch (e) {
            render.textContent = `渲染错误: ${e}`;
        }
        wrapper.appendChild(render);

        return wrapper;
    }

    ignoreEvent() { return true; }
}

export default class LatexPlugin implements IPlugin {
    id = 'latex-preview';
    name = 'LaTeX 公式预览';
    version = '1.0.0';
    category = PluginCategory.EDITOR;

    private disposables: (() => void)[] = [];

    activate(context: IPluginContext) {
        const modeManager = new BlockModeManager();

        const onSetMode = (pos: number, mode: BlockMode) => {
            modeManager.setMode(pos, mode);
            context.kernel.emit(CoreEvents.EDITOR_REQUEST_REFRESH);
        };

        // 注册样式
        this.disposables.push(
            context.registerStyle('latex-cockpit', COCKPIT_STYLES),
            context.registerStyle('latex-copybtn', COPY_BUTTON_STYLES),
            context.registerStyle('latex-custom', `
                .latex-preview { padding: 8px; }
                .latex-render-area { text-align: center; }
            `)
        );

        // 注册装饰器
        this.disposables.push(
            context.registerMarkdownDecorationProvider({
                nodeTypes: ['FencedCode'],
                render(node, ctx) {
                    const firstLine = ctx.state.doc.lineAt(node.from);
                    if (!firstLine.text.startsWith('```latex')) return [];

                    const content = ctx.state.doc.sliceString(node.from, node.to);
                    const code = content.split('\n').slice(1, -1).join('\n');

                    if (modeManager.shouldRender(
                        node.from, node.from, node.to, ctx.isLineActive
                    )) {
                        // 预览态
                        return {
                            decorations: [Decoration.replace({
                                widget: new LatexWidget(code, node.from,
                                    modeManager.getMode(node.from), onSetMode),
                                block: true
                            }).range(node.from, node.to)],
                            shouldSkipChildren: true
                        };
                    } else {
                        // 源码态
                        return {
                            decorations: [Decoration.widget({
                                widget: new CopyButtonWidget({
                                    code, pos: node.from, onSetMode
                                }),
                                side: -1, block: true
                            }).range(node.from)],
                            shouldSkipChildren: true
                        };
                    }
                }
            })
        );

        context.logger.info('LatexPlugin activated');
    }

    deactivate() {
        this.disposables.forEach(fn => fn());
        this.disposables = [];
    }
}
```

---

# 第 8 章：命令与样式

## 8.1 registerCommand(command)

注册全局命令，可通过命令面板触发。

```typescript
registerCommand(command: ICommandDefinition): () => void;
```

### ICommandDefinition 接口

```typescript
interface ICommandDefinition {
    /** 唯一标识符（推荐格式：pluginId:action） */
    id: string;

    /** 用户可见的标题 */
    title: string;

    /** 分类（用于分组，如 'Editor'、'Explorer'） */
    category?: string;

    /** 处理函数 */
    handler: (...args: any[]) => void;

    /** 图标（lucide-react 类型） */
    icon?: any;

    /** 描述 */
    description?: string;

    /** 快捷键绑定（可选） */
    keybinding?: string;

    /** 是否显示在命令面板 */
    showInPalette?: boolean;
}
```

### 案例：注册多个命令

```typescript
activate(context: IPluginContext) {
    this.disposables.push(
        context.registerCommand({
            id: 'my-plugin:insert-date',
            title: '插入日期',
            category: 'Editor',
            handler: () => {
                const date = new Date().toLocaleDateString();
                document.execCommand('insertText', false, date);
            },
            keybinding: 'Ctrl+Shift+D',
            showInPalette: true
        }),
        context.registerCommand({
            id: 'my-plugin:clear-highlights',
            title: '清除高亮',
            category: 'Editor',
            handler: () => {
                // 清除逻辑
            },
            showInPalette: true
        })
    );
}
```

## 8.2 registerStyle(id, css)

注册插件专属 CSS 样式。样式会被自动添加到文档 `<head>` 中，卸载时自动移除。

```typescript
registerStyle(id: string, css: string): () => void;
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 样式唯一标识（防止重复注册） |
| `css` | `string` | CSS 字符串 |

### 最佳实践

```typescript
// ✅ 好的做法：使用插件前缀避免样式冲突
context.registerStyle('my-plugin-styles', `
    .my-plugin-container { padding: 8px; }
    .my-plugin-btn { color: #0066cc; }
    .my-plugin-btn:hover { color: #004499; }
`);

// ❌ 不好的做法：使用通用类名可能污染全局
context.registerStyle('my-style', `
    .container { padding: 8px; }  /* 太通用了！ */
    button { color: red; }         /* 会影响所有按钮！ */
`);
```

## 8.2.1 沙箱环境中的 CSS 限制

扩展插件运行在沙箱环境中，**以下 CSS 方案不可用**：

| 方案 | 是否可用 | 原因 |
|------|---------|------|
| **Tailwind CSS** | ❌ 不可用 | 沙箱中没有 Tailwind 运行时，`class="flex items-center"` 等类名不会产生任何样式 |
| **CSS Modules** | ❌ 不可用 | 构建打包为单文件后，CSS Module 的作用域隔离机制失效 |
| **CSS-in-JS**（styled-components 等） | ❌ 不可用 | 依赖运行时注入 `<style>` 标签，与沙箱样式管理冲突 |
| **`registerStyle()` + 纯 CSS** | ✅ 可用 | 唯一推荐方案 |
| **CSS 变量（`var(--xxx)`）** | ✅ 可用 | 系统级变量在全局可用，详见第 13 章 |

### 从 Tailwind 迁移到纯 CSS

如果你习惯使用 Tailwind，以下是常见类名的纯 CSS 等价写法：

```typescript
// ❌ Tailwind 类名（在沙箱中不生效）
const MyButton = () => (
    <button className="flex items-center gap-2 px-3 py-1 text-sm rounded hover:bg-gray-100">
        <Icon size={14} />
        <span>按钮</span>
    </button>
);

// ✅ 使用 registerStyle + 自定义类名
const MyButton = () => (
    <button className="my-plugin-btn">
        <Icon size={14} />
        <span>按钮</span>
    </button>
);

// 在 activate 中注册样式
context.registerStyle('my-plugin-styles', `
    .my-plugin-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 12px;
        font-size: 13px;
        border-radius: 4px;
        border: none;
        background: transparent;
        color: hsl(var(--foreground));       /* 使用系统 CSS 变量 */
        cursor: pointer;
        transition: background 0.15s ease;
    }
    .my-plugin-btn:hover {
        background: hsl(var(--accent));      /* 主题感知的 hover 色 */
    }
    .my-plugin-btn svg {
        flex-shrink: 0;
    }
`);
```

### 样式命名规范

为避免与其他插件或系统样式冲突，**必须使用插件 ID 作为 CSS 类名前缀**：

```typescript
// ✅ 好的命名：带插件前缀
context.registerStyle('kanban-styles', `
    .kanban-toggle-btn { ... }
    .kanban-board-container { ... }
    .kanban-column { ... }
`);

// ❌ 坏的命名：通用名称可能冲突
context.registerStyle('styles', `
    .toggle-btn { ... }     /* 可能与其他插件冲突 */
    .container { ... }      /* 可能覆盖系统样式 */
`);
```

### 主题适配

所有插件样式应使用系统 CSS 变量，确保深浅主题自动切换。详见第 13 章。

```typescript
context.registerStyle('my-plugin-theme-aware', `
    .my-plugin-panel {
        background: hsl(var(--card));
        color: hsl(var(--foreground));
        border: 1px solid hsl(var(--border));
        border-radius: var(--radius);
    }

    /* 如果需要深色模式特别处理 */
    .dark .my-plugin-panel {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }
`);
```

## 8.3 context.logger — 日志系统

提供统一的日志输出。日志会被写入日志文件并可在开发者工具中查看。

```typescript
readonly logger: ILogger;
```

### 可用方法

| 方法 | 说明 | 用途 |
|------|------|------|
| `logger.info(msg, ...args)` | 信息日志 | 正常流程记录 |
| `logger.warn(msg, ...args)` | 警告日志 | 非致命异常 |
| `logger.error(msg, ...args)` | 错误日志 | 致命错误 |
| `logger.debug(msg, ...args)` | 调试日志 | 开发阶段调试 |

### 案例

```typescript
activate(context: IPluginContext) {
    context.logger.info('插件激活中...');
    context.logger.debug('配置参数:', { timeout: 3000 });

    try {
        const result = doSomething();
        context.logger.info('操作成功', result);
    } catch (e) {
        context.logger.error('操作失败', e);
    }
}
```

> **为什么不用** `console.log`？统一日志系统可以：
> - 自动标注插件来源
> - 写入日志文件（可供用户提交 Bug 报告）
> - 支持日志级别过滤

---

# 第 9 章：事件系统

事件系统是插件间通信的核心机制。

## 9.1 监听事件

```typescript
context.on(CoreEvents.EVENT_NAME, handler);
```

### 案例：监听文件保存

```typescript
activate(context: IPluginContext) {
    const unsub = context.on(CoreEvents.FILE_SAVED, (data) => {
        context.logger.info('文件已保存:', data);
    });

    this.disposables.push(unsub);
}
```

## 9.2 发射事件

```typescript
context.emit(CoreEvents.EVENT_NAME, data);
```

### 案例：请求编辑器刷新

```typescript
// 最常用场景：交互式块模式切换后触发刷新
context.emit(CoreEvents.EDITOR_REQUEST_REFRESH);
```

## 9.3 常用事件速查

> **重要**：所有事件的 payload 类型在此处完整列出。使用事件时请严格按照 payload 格式处理，避免因字段名不匹配导致数据丢失。

### 编辑器事件

| 事件 | Payload 类型 | 说明 |
|------|-------------|------|
| `DOCUMENT_CHANGED` | `{ content: string, path: string, isInitial: boolean }` | 文档内容变化（含文件切换） |
| `EDITOR_STATE_CHANGED` | `{ path: string, isUnsaved: boolean }` | 编辑器状态变化 |
| `VIEW_READY` | 无 payload | 编辑器视图就绪 |
| `EDITOR_FOCUS` | 无 payload | 编辑器获得焦点 |
| `CURSOR_ACTIVITY` | `number`（当前行号） | 光标移动 |
| `EDITOR_CONTENT_INPUT` | `string`（当前编辑器全文内容） | 用户输入内容 |
| `EDITOR_REQUEST_REFRESH` | 无 payload | 请求装饰器重算 |
| `TOOLBAR_STATE_CHANGED` | `Record<string, boolean>`（按钮 ID → 激活状态） | 工具栏状态变化 |
| `EDITOR_INSERT_TEXT` | `string`（要插入的文本） | 请求插入文本 |
| `EDITOR_SCROLL_TO_LINE` | `number`（目标行号） | 请求滚动到指定行 |

#### Payload 使用示例

```typescript
// DOCUMENT_CHANGED — 最常用的事件
context.on(CoreEvents.DOCUMENT_CHANGED, (payload: {
    content: string;   // 文件完整内容
    path: string;      // 文件路径
    isInitial: boolean; // 是否为首次加载（true=刚打开且无未保存修改）
}) => {
    context.logger.info('文件已变更:', payload.path);

    // 避免在首次加载时触发复杂计算
    if (!payload.isInitial) {
        this.analyzeContent(payload.content);
    }
});

// CURSOR_ACTIVITY — payload 直接是行号（number）
context.on(CoreEvents.CURSOR_ACTIVITY, (line: number) => {
    context.logger.debug('光标在第', line, '行');
});

// EDITOR_CONTENT_INPUT — payload 直接是内容字符串
context.on(CoreEvents.EDITOR_CONTENT_INPUT, (content: string) => {
    // ⚠️ 此事件每次按键都触发，建议使用防抖（参见 §15.4）
    context.logger.debug('内容长度:', content.length);
});
```

### 文件系统事件

| 事件 | Payload 类型 | 说明 |
|------|-------------|------|
| `OPEN_FILE` | `string`（文件路径） | 请求打开文件 |
| `FILE_SAVED` | `string`（文件路径） | 文件保存完成 |
| `FS_FILE_CREATED` | `string`（新文件路径） | 新文件创建 |
| `FS_FILE_DELETED` | `string`（文件路径） | 文件删除 |
| `FILE_MOVED` | `{ oldPath: string, newPath: string }` | 文件移动/重命名 |

#### Payload 使用示例

```typescript
// FILE_SAVED — 在文件保存后执行自定义操作
context.on(CoreEvents.FILE_SAVED, (filePath: string) => {
    context.logger.info('已保存:', filePath);

    // 示例：保存后自动执行后处理
    if (filePath.endsWith('.md')) {
        this.updateIndex(filePath);
    }
});

// OPEN_FILE — 监听文件打开事件
context.on(CoreEvents.OPEN_FILE, (filePath: string) => {
    context.logger.info('正在打开:', filePath);
});
```

### 工作区事件

| 事件 | Payload 类型 | 说明 |
|------|-------------|------|
| `WORKSPACE_CHANGED` | `{ selectedFilePath: string \| null }` | 工作区切换 |
| `WORKSPACE_SELECTED_FILE_CHANGED` | `string`（文件路径） | 当前选中文件变化 |
| `WORKSPACE_DIRTY_STATE_CHANGED` | `{ path: string, isDirty: boolean }` | 脏标记状态变化 |

### 应用命令事件

| 事件 | Payload 类型 | 说明 |
|------|-------------|------|
| `APP_CMD_SAVE` | 无 payload | 保存命令（Ctrl+S） |
| `APP_CMD_NEW_FILE` | 无 payload | 新建文件 |
| `APP_CMD_TOGGLE_SIDEBAR` | 无 payload | 切换侧边栏 |
| `APP_CMD_TOGGLE_ZEN_MODE` | 无 payload | 切换禅模式 |
| `APP_CMD_EXPORT_PDF` | 无 payload | 导出 PDF |
| `APP_CMD_EXPORT_WORD` | 无 payload | 导出 Word |

#### Payload 使用示例

```typescript
// APP_CMD_SAVE — 监听保存命令执行自定义保存逻辑
context.on(CoreEvents.APP_CMD_SAVE, () => {
    // 在文件保存时同步插件内部状态
    this.controller.save();
});
```

### 设置事件

| 事件 | Payload 类型 | 说明 |
|------|-------------|------|
| `SETTING_CHANGED` | `{ id: string, value: any }` | 设置项变更 |

#### Payload 使用示例

```typescript
// SETTING_CHANGED — 响应用户设置变更
context.on(CoreEvents.SETTING_CHANGED, (payload: { id: string, value: any }) => {
    if (payload.id === 'editor.fontSize') {
        context.logger.info('字号变更为:', payload.value);
        this.updateFontSize(payload.value);
    }
});
```

---

# 第 10 章：服务访问

插件可以通过 `context.getService()` 获取已注册的系统服务。服务是只读访问的——你可以读取状态和调用查询方法，但不能修改服务内部状态。

```typescript
import { ServiceId } from '@/kernel/core/ServiceId';

// 基本用法（推荐使用 ServiceId 常量）
const service = context.getService<any>(ServiceId.EDITOR);
```

> **类型安全提示**：由于服务接口对第三方通常不可见，建议使用 `any` 类型并通过可选链操作。  
> **沙箱提示**：第三方扩展的 `getService()` 受白名单/代理限制，未授权服务会返回 `undefined` 并记录告警。

## 10.1 常用服务详解

### editorService — 编辑器服务

获取当前编辑器状态。

```typescript
const editorService = context.getService<any>(ServiceId.EDITOR);
```

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `getState()` | `{ currentFileId: string, ... }` | 获取编辑器当前状态 |

#### 使用示例

```typescript
const editorService = context.getService<any>(ServiceId.EDITOR);
const state = editorService?.getState();

if (state?.currentFileId) {
    context.logger.info('当前打开的文件:', state.currentFileId);
}
```

### tabService — 标签页服务

管理编辑器标签页，获取标签页内容。

```typescript
const tabService = context.getService<any>(ServiceId.TAB);
```

> **权限说明（重要）**：`tabService` 对第三方扩展默认属于受限服务，沙箱模式下通常会返回 `undefined`。  
> 如需使用，请优先通过事件驱动或申请授权提升；不要假设该服务可用。

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `getTabContent(fileId)` | `fileId: string` | `string \| undefined` | 获取指定标签页的文本内容 |
| `getTabs()` | 无 | `Tab[]` | 获取所有已打开的标签页列表 |

#### 使用示例

```typescript
const tabService = context.getService<any>(ServiceId.TAB);
const editorService = context.getService<any>(ServiceId.EDITOR);

// 获取当前文件的内容
const currentFileId = editorService?.getState()?.currentFileId;
if (currentFileId && tabService) {
    const content = tabService.getTabContent(currentFileId);
    context.logger.info('内容长度:', content?.length);
}
```

### settingsService — 设置服务

读取和监听用户设置项。

```typescript
const settings = context.getService<any>(ServiceId.SETTINGS);
```

> **权限说明（重要）**：`settingsService` 对第三方扩展默认受限（通常返回 `undefined`）。  
> 监听设置变化请优先使用 `CoreEvents.SETTING_CHANGED`，不要依赖直接写入全局设置。

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `get(key)` | `key: string` | `any` | 获取指定设置项的值 |

#### 常用设置键

| 设置键 | 类型 | 说明 |
|--------|------|------|
| `editor.fontSize` | `number` | 编辑器字号 |
| `editor.lineHeight` | `number` | 行高倍数 |
| `editor.tabSize` | `number` | Tab 宽度 |
| `editor.autoSave` | `boolean` | 是否自动保存 |

#### 使用示例

```typescript
const settings = context.getService<any>(ServiceId.SETTINGS);

// 读取设置
const fontSize = settings?.get?.('editor.fontSize');
context.logger.info('字号:', fontSize); // 例如 16

// 监听设置变更（通过事件系统）
const unsub = context.on(CoreEvents.SETTING_CHANGED, ({ id, value }) => {
    if (id === 'editor.fontSize') {
        context.logger.info('字号变更为:', value);
        this.applyFontSize(value);
    }
});
this.disposables.push(unsub);
```

### themeService — 主题服务

获取当前主题信息，监听主题切换。详细用法参见第 13 章。

```typescript
const themeService = context.getService<any>(ServiceId.THEME);
```

> **权限说明（重要）**：`themeService` 对第三方扩展默认受限。主题感知插件优先使用 CSS 变量方案（参见第 13 章），如确需直接访问主题服务请考虑授权提升。

| 方法/事件 | 返回值 | 说明 |
|----------|--------|------|
| `getCurrentThemeId()` | `string` | 当前主题 ID，如 `'default-dark'` |
| `getCurrentTheme()` | `{ id, name, type: 'light' \| 'dark' }` | 当前主题详情 |
| `getThemes()` | `ThemeItem[]` | 所有可用主题列表 |
| 事件 `THEME_CHANGED` | — | 主题切换时触发 |

#### 使用示例

```typescript
const themeService = context.getService<any>(ServiceId.THEME);

// 判断当前是否为深色模式
const isDark = themeService?.getCurrentTheme()?.type === 'dark';
context.logger.info('深色模式:', isDark);
```

### workspaceService — 工作区服务

获取当前工作区和选中文件信息。

```typescript
const workspace = context.getService<any>(ServiceId.WORKSPACE);
```

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `getSelectedFile()` | `string \| null` | 当前选中的文件路径 |

#### 使用示例

```typescript
const workspace = context.getService<any>(ServiceId.WORKSPACE);
const currentFile = workspace?.getSelectedFile?.();
context.logger.info('当前文件:', currentFile);
```

### fileSystem — 文件系统服务（受限代理）

读写文件和目录操作。

```typescript
const fs = context.getService<any>(ServiceId.FILE_SYSTEM);
```

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `readFile(path)` | `path: string` | `Promise<{ success: boolean, ... }>` | 读取文件内容（返回对象） |
| `saveFile(path, content)` | `path: string, content: string` | `Promise<{ success: boolean, ... }>` | 写入文件 |
| `pathJoin(...parts)` | `...parts: string[]` | `Promise<string>` | 路径拼接 |
| `createDirectory(path)` | `path: string` | *默认不允许* | 非白名单方法，沙箱下会被拦截 |

#### 使用示例

```typescript
const fs = context.getService<any>(ServiceId.FILE_SYSTEM);

// 读取文件
const result = await fs?.readFile?.('/path/to/file.md');
if (result?.success && typeof result.content === 'string') {
    context.logger.info('文件内容前 50 字符:', result.content.substring(0, 50));
}

// 写入文件（是否允许取决于当前沙箱白名单）
await fs?.saveFile?.('/path/to/output.json', JSON.stringify(data, null, 2));
```

### markdownService — Markdown 渲染服务

提供 Markdown 到 HTML 的渲染能力。

```typescript
const md = context.getService<any>(ServiceId.MARKDOWN);
```

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `render(text)` | `text: string` | `string` | 将 Markdown 渲染为 HTML |

## 10.2 getService 的参数规则

`getService` 底层接收字符串 ID，但**文档示例与插件代码建议统一使用 `ServiceId` 常量**（便于可溯源与重构）。

| `ServiceId` 常量 | 原始字符串值 | 对应功能 | 第三方扩展（默认沙箱） |
|------------------|--------------|---------|----------------------|
| `ServiceId.EDITOR` | `'editorService'` | 编辑器状态 | 受限代理（白名单方法） |
| `ServiceId.FILE_SYSTEM` | `'fileSystem'` | 文件读写 | 受限代理（白名单方法） |
| `ServiceId.WORKSPACE` | `'workspaceService'` | 工作区管理 | 可用（白名单） |
| `ServiceId.LOGGER` | `'loggerService'` | 日志服务 | 可用（白名单） |
| `ServiceId.TAB` | `'tabService'` | 标签页管理 | 默认受限（通常返回 `undefined`） |
| `ServiceId.SETTINGS` | `'settingsService'` | 用户设置 | 默认受限 |
| `ServiceId.THEME` | `'themeService'` | 主题管理 | 默认受限 |
| `ServiceId.MARKDOWN` | `'markdownService'` | Markdown 渲染 | 可用性取决于运行时注册时机/权限 |

> **注意**：始终使用可选链 (`?.`) 访问服务方法。如果服务尚未注册（例如你的插件加载顺序很早），`getService` 会返回 `undefined`。

## 10.3 服务可用性与时机

> **关键概念**：并非所有公开服务在所有时刻都可用。文档相关、视图相关、运行态相关服务尤其如此。

### 常见时序

```
应用启动
  │
  ├─ 平台基础能力逐步就绪
  │
  ├─ 外部插件激活 ← 你的插件在此时执行 activate()
  │
  └─ 某些文档 / 视图 / 工作区状态随后才可用
```

因此，任何通过 `context.getService(...)` 获得的对象，都应按“可能为空、可能延迟可用、可能受限”的前提来编写。

### 安全访问模式

```typescript
activate(context: IPluginContext) {
    // ✅ 安全：使用可选链 + 默认值
    const editorService = context.getService<any>(ServiceId.EDITOR);
    const currentFile = editorService?.getState()?.currentFileId ?? null;

    if (!currentFile) {
        context.logger.debug('编辑器尚未打开文件，等待 DOCUMENT_CHANGED 事件');
    }

    // ✅ 安全：通过事件驱动而非直接读取
    context.on(CoreEvents.DOCUMENT_CHANGED, (payload) => {
        // 在事件触发时，相关服务一定已经就绪
        this.handleDocumentChange(payload);
    });
}
```

### 易错模式

```typescript
activate(context: IPluginContext) {
    // ❌ 危险：假设服务一定存在
    const content = context.getService<any>(ServiceId.TAB).getTabContent('file.md');
    // 如果 tabService 未注册 → TypeError: Cannot read properties of undefined

    // ❌ 危险：假设编辑器已加载文件
    const state = context.getService<any>(ServiceId.EDITOR).getState();
    const file = state.currentFileId; // 可能为 undefined
}
```

---

# 第 11 章：构建与发布

## 11.1 扩展目录结构

```
src/modules/extensions/my-plugin/
├── index.ts           ← 入口文件（必须 export default）
├── manifest.json      ← 插件清单（必须）
├── services/          ← 业务逻辑（建议）
├── components/        ← React 组件（建议）
├── templates/         ← HTML/脚本模板（建议）
├── constants/         ← 常量定义（建议）
└── handlers/          ← 事件/信号处理器（建议）
```

> 子目录结构是**建议**而非强制。你的插件不会影响内核结构，因此可以按需组织代码。

## 11.2 manifest.json

```json
{
    "id": "my-plugin",
    "name": "我的插件",
    "version": "1.0.0",
    "description": "插件简介",
    "author": "Your Name",
    "main": "index.js"
}
```

## 11.3 构建流程

使用项目自带的构建脚本：

```bash
node scripts/build-extensions.cjs
```

构建脚本会自动：
1. 扫描 `src/modules/extensions/*/index.ts`
2. 使用 esbuild 打包为独立 bundle
3. 输出到 `plugins/[plugin-id]/index.js`
4. 复制 `manifest.json` 到输出目录

### 模块解析规则

| 模块来源 | 构建行为 | 原因 |
|---------|---------|------|
| `react` / `react-dom` | External（运行时共享） | 必须与宿主使用同一实例 |
| `@codemirror/*` | External（运行时共享） | CodeMirror 状态必须单例 |
| `@/kernel/core/Events` | External（运行时映射） | 事件常量必须与宿主公开事件契约一致 |
| `@/shared/*` | **Inline**（打入 bundle） | 共享工具库，无需单例 |
| `npm 包`（如 katex） | **Inline**（打入 bundle） | 插件自带依赖 |

## 11.4 调试技巧

1. **使用 `context.logger`** 代替 `console.log`
2. **使用浏览器开发者工具**：`F12` → Console → 筛选插件 ID
3. **热重载**：修改代码后重新运行 `build-extensions.cjs`，刷新应用
4. **熔断排查**：如果插件加载后编辑器崩溃，检查控制台中 `[CircuitBreaker]` 相关日志

---

# 第 12 章：安全模型

## 12.1 沙箱限制

扩展插件运行在 `RestrictedPluginContext` 中，以下操作会被**拦截**（通常记录告警、返回受限代理或返回 `undefined`）：

| 被阻止的操作 | 说明 |
|-------------|------|
| `context.registerService()` | 不允许注册/覆盖系统服务 |
| 直接访问 `context.kernel` 的非安全路径 | 通过受限代理拦截并记录告警 |

## 12.2 CodeMirror 扩展熔断

通过 `registerEditorExtension` 注册的扩展会被自动监控：

- 如果扩展运行时抛出异常，系统会记录错误并标记来源插件
- 重复崩溃的插件会被自动禁用（熔断机制）
- 不会影响其他插件和编辑器核心功能

## 12.3 IFrame 隔离

通过 `registerIsolatedRenderer` 渲染的内容运行在沙箱 IFrame 中：

| 安全策略 | 值 | 说明 |
|---------|------|------|
| sandbox | `allow-scripts` | 仅允许脚本执行，不允许表单提交、弹窗等 |
| CSP `default-src` | `'none'` | 默认禁止所有资源加载 |
| CSP `img-src` | `* data:` | 允许图片（包括 Base64） |
| CSP `style-src` | `'unsafe-inline'` | 允许行内样式 |
| CSP `script-src` | `'unsafe-inline'` | 允许通过 scripts 数组注入的脚本 |

IFrame 与宿主的通信仅限于：
- `bridge.sendSignal(type, data)` → 对应的 `registerIFrameSignal` 处理器
- `bridge.sendPulse()` → 声明交互意图，阻止预览销毁

## 12.4 Markdown 语法安全

通过 `registerMarkdownUsage` 注册的语法插件：
- `apply()` 方法被 try-catch 包裹，单个插件崩溃不影响全局
- DOMPurify 会净化所有输出 HTML，只有通过 `getPurifyConfig()` 显式白名单的标签/属性才会保留

## 12.5 外部插件授权

从外部（`plugins/` 目录）加载的第三方插件默认在**沙箱模式**运行（`RestrictedPluginContext`）。

只有当插件显式声明 `requestElevation = true` 时，系统才会触发授权对话框，让用户选择是否授予更高权限。

### 授权流程

```
外部插件被发现
      │
      ▼
插件是否声明 requestElevation?
      │
 ┌────┴────┐
 │         │
否         是
 │         │
 ▼         ▼
沙箱模式   弹出授权对话框（显示插件名称、版本、描述）
            │
        ┌───┴───┐
        │       │
       授权    拒绝/超时
        │       │
        ▼       ▼
   提升权限上下文  沙箱模式（功能受限）
```

### 对第三方开发者的影响

| 场景 | 行为 |
|------|------|
| 未声明 `requestElevation` | 直接进入受限上下文（无弹窗） |
| 用户授权 | 插件获得提升权限上下文（允许访问更完整能力） |
| 用户拒绝 | 插件保持受限上下文（`RestrictedPluginContext`） |
| 授权超时（30s 无响应） | 默认进入受限上下文 |

> **最佳实践**：你的插件应始终做好在受限模式下运行的准备。使用可选链 `?.` 调用所有 API，确保在授权被拒绝时不会崩溃。

```typescript
activate(context: IPluginContext) {
    // ✅ 安全写法：即使在受限模式下也不会崩溃
    const editorService = context.getService?.(ServiceId.EDITOR);
    const state = editorService?.getState?.();

    if (state) {
        context.logger.info('编辑器就绪');
    } else {
        context.logger.warn('编辑器服务不可用（可能处于受限模式）');
    }
}
```

---

# 第 13 章：主题自定义

插件应优先通过 CSS 变量和 `registerStyle` 实现主题感知。对于主题变化监听，应只依赖当前运行环境明确开放的公开能力，并做好不可用降级。

> **权限说明（重要）**：不要把任何特定主题服务当成默认可用能力。  
> 因此应优先使用 CSS 变量方案；如果当前环境开放了主题相关公开能力，也必须按可选能力处理，而不是作为主路径前提。

## 13.1 CSS 变量适配

系统使用 CSS 变量定义主题色。深色模式时，`<html>` 元素会自动添加 `.dark` 类名。
你的插件样式只需基于 CSS 变量编写，即可自动适配深浅主题。

```typescript
activate(context: IPluginContext) {
    this.disposables.push(
        context.registerStyle('my-plugin-theme', `
            .my-plugin-panel {
                /* 使用系统 CSS 变量，自动适配主题 */
                background: hsl(var(--background));
                color: hsl(var(--foreground));
                border: 1px solid hsl(var(--border));
                border-radius: var(--radius);
            }

            /* 深色模式特有样式 */
            .dark .my-plugin-panel {
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            }
        `)
    );
}
```

### 常用 CSS 变量

> 所有颜色变量使用 HSL 格式，使用时需要用 `hsl(var(--xxx))` 包裹。

| 变量 | 说明 |
|------|------|
| `--background` | 主背景色 |
| `--foreground` | 主文字色 |
| `--primary` | 主色调（按钮、链接等） |
| `--primary-foreground` | 主色调上的文字 |
| `--secondary` | 次要色 |
| `--muted` | 静音色（禁用、不活跃状态） |
| `--muted-foreground` | 静音色文字 |
| `--accent` | 强调色（hover 背景等） |
| `--destructive` | 危险色（删除、报错） |
| `--border` | 边框色 |
| `--input` | 输入框边框色 |
| `--radius` | 圆角半径 |
| `--card` | 卡片背景色 |
| `--popover` | 弹出层背景色 |
| `--sidebar-background` | 侧边栏背景 |
| `--editor-background` | 编辑器背景 |
| `--table-header-bg` | 表格表头背景 |
| `--table-border` | 表格边框 |
| `--code-inline-bg` | 行内代码背景 |

## 13.2 语法高亮主题

代码块中的关键字、字符串、注释等的着色通过 CodeMirror 的 `HighlightStyle` 控制。
你可以通过 `registerEditorExtension` 注册自定义语法高亮方案。

```typescript
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

// 定义自定义语法高亮
const myHighlightStyle = HighlightStyle.define([
    { tag: tags.keyword,        color: '#c678dd' },   // 关键字：紫色
    { tag: tags.string,         color: '#98c379' },   // 字符串：绿色
    { tag: tags.comment,        color: '#5c6370', fontStyle: 'italic' }, // 注释：灰色斜体
    { tag: tags.function(tags.variableName), color: '#61afef' }, // 函数名：蓝色
    { tag: tags.number,         color: '#d19a66' },   // 数字：橙色
    { tag: tags.operator,       color: '#56b6c2' },   // 运算符：青色
    { tag: tags.typeName,       color: '#e5c07b' },   // 类型名：黄色
    { tag: tags.heading,        color: '#e06c75', fontWeight: 'bold' }, // 标题
    { tag: tags.emphasis,       fontStyle: 'italic' },
    { tag: tags.strong,         fontWeight: 'bold' },
    { tag: tags.link,           color: '#61afef', textDecoration: 'underline' },
]);

activate(context: IPluginContext) {
    this.disposables.push(
        context.registerEditorExtension(
            syntaxHighlighting(myHighlightStyle)
        )
    );
}
```

### 常用 highlight tags

| Tag | 对应语法元素 |
|-----|------------|
| `tags.keyword` | `if` `for` `return` 等关键字 |
| `tags.string` | 字符串字面量 |
| `tags.comment` | 注释 |
| `tags.number` | 数字 |
| `tags.function(tags.variableName)` | 函数名 |
| `tags.typeName` | 类型名 |
| `tags.operator` | 运算符 |
| `tags.heading` | Markdown 标题 |
| `tags.emphasis` | `*斜体*` |
| `tags.strong` | `**粗体**` |
| `tags.link` | 链接 |
| `tags.meta` | 元数据（如 YAML front matter） |

> 完整 tag 列表参考：[Lezer Highlight Tags](https://lezer.codemirror.net/docs/ref/#highlight.tags)

## 13.3 编辑器组件主题

表格、代码块等编辑器组件的外观也可以通过 `EditorView.theme()` 自定义。
系统的编辑器组件使用 `hsl(var(--变量名))` 格式的 CSS 变量，插件可以覆盖这些样式。

```typescript
import { EditorView } from '@codemirror/view';

const myComponentTheme = EditorView.theme({
    // 自定义表格样式
    '.cm-rendered-table th': {
        background: 'hsl(var(--primary) / 0.1)',
        fontWeight: '700',
    },
    '.cm-rendered-table td': {
        borderColor: 'hsl(var(--border) / 0.5)',
    },

    // 自定义代码块底色
    '.cm-line.cm-fenced-code': {
        backgroundColor: 'hsl(var(--muted) / 0.3)',
        borderRadius: '2px',
    },

    // 自定义光标颜色
    '&.cm-focused .cm-cursor': {
        borderLeftColor: '#ff6b6b',
    },

    // 自定义活动行高亮
    '.cm-activeLine': {
        backgroundColor: 'hsl(var(--primary) / 0.05)',
    }
});

activate(context: IPluginContext) {
    this.disposables.push(
        context.registerEditorExtension(myComponentTheme)
    );
}
```

### 编辑器中可覆盖的 CSS 变量

| 变量 | 说明 | 默认值回退 |
|------|------|-----------|
| `--foreground` | 编辑器文字颜色 | 系统前景色 |
| `--primary` | 主色调（光标、选区等） | 系统主题色 |
| `--muted` | 柔和背景色（行号区域、活动行） | 系统 muted |
| `--border` | 边框色（表格边线等） | 系统 border |
| `--muted-foreground` | 行号文字色 | 系统次要前景 |
| `--table-header-bg` | 表格表头背景 | 回退到 `--muted` |
| `--search-match-bg` | 搜索匹配高亮背景 | `48 96% 53%`（金色） |
| `--search-match-active-bg` | 当前搜索项高亮 | `25 95% 53%`（橙色） |

## 13.4 高级主题适配

如果当前运行环境公开了主题变化相关能力，你可以在此基础上实现更细粒度的动态适配；但不要把这类能力当成主路径前提。

建议遵循以下顺序：

1. 先使用 CSS 变量完成主题适配
2. 再把主题变化监听作为增强能力
3. 如果主题能力不可用，插件仍应保持可用，只是体验降级

一个稳妥的模式是：

```typescript
activate(context: IPluginContext) {
    const themeService = context.getService<any>(ServiceId.THEME);

    if (!themeService) {
        context.logger.debug("主题服务当前不可用，退回 CSS 变量方案");
        return;
    }

    // 在当前运行环境明确支持时，再注册额外监听
}
```

---

# 第 14 章：插件部署与分发

## 14.1 构建产物位置

构建完成后，插件的打包产物位于项目根目录的 `plugins/` 文件夹：

```
项目根目录/
├── src/modules/extensions/my-plugin/   ← 源码（开发时编辑）
│   ├── index.ts
│   ├── manifest.json
│   └── ...
└── plugins/my-plugin/                  ← 构建产物（运行时加载）
    ├── index.js                        ← 打包后的 JS bundle
    └── manifest.json                   ← 复制过来的清单
```

> **重要**：应用启动时从 `plugins/` 目录加载插件，而不是 `src/`。
> 每次修改源码后都需要重新运行 `node scripts/build-extensions.cjs`。

## 14.2 手动安装插件

第三方开发者交付给用户的是 `plugins/[plugin-name]/` 整个目录。
用户只需将此目录复制到应用的 `plugins/` 目录下，重启应用即可加载。

```
安装步骤：
1. 将 my-plugin/ 文件夹复制到应用的 plugins/ 目录
2. 确保目录中包含 index.js 和 manifest.json
3. 重启应用
4. 在扩展中心查看插件是否正确加载
```

## 14.3 分发清单

开发者交付的最小文件集：

| 文件 | 必须 | 说明 |
|------|------|------|
| `index.js` | ✅ | 打包后的 bundle（包含所有非 external 的依赖） |
| `manifest.json` | ✅ | 插件清单（id、name、version、main） |
| `README.md` | ❌ | 使用说明（建议提供） |
| `LICENSE` | ❌ | 许可证（建议提供） |

## 14.4 版本管理建议

- 使用[语义化版本](https://semver.org/)：`主版本.次版本.补丁号`
- `manifest.json` 和 `IPlugin.version` 中的版本号保持一致
- 发布前更新版本号，方便用户识别更新

---

# 第 15 章：调试与排查

本章面向插件开发者，提供系统化的调试方法和常见问题排查指南。

## 15.1 沙箱 Console 机制

扩展插件运行在沙箱环境中。沙箱会**重定向** `console` 对象，将所有日志统一标记来源插件 ID 后输出。这意味着：

- `console.log()` 的输出会带有 `[plugin:your-plugin-id]` 前缀
- 在浏览器 DevTools 中可通过插件 ID 筛选日志

### 推荐做法

**始终使用 `context.logger`**，它提供了更丰富的级别控制和统一格式：

```typescript
activate(context: IPluginContext) {
    context.logger.info('插件已激活');           // ✅ 推荐
    context.logger.debug('调试数据:', someData); // ✅ 调试时使用
    context.logger.warn('潜在问题:', warning);   // ✅ 警告
    context.logger.error('严重错误:', error);     // ✅ 错误
}
```

### 紧急调试：绕过沙箱 Console

在极端调试场景下，如果需要确认代码是否执行到某个位置，可以使用 `globalThis.console.log` 绕过沙箱重定向：

```typescript
// ⚠️ 仅用于紧急调试，发布前必须移除
globalThis.console.log('[我的插件] 这里被执行了');
```

> **⚠️ 警告**：`globalThis.console.log` 不会带插件 ID 前缀，也不会写入日志文件。仅限调试使用，发布前**必须**替换为 `context.logger`。

## 15.2 「插件加载后无效果」排查清单

这是插件开发中最常见的问题。按以下步骤逐项排查：

### 步骤 1：确认插件已加载

打开浏览器 DevTools（`F12`），在 Console 中搜索你的插件 ID。如果看到带有插件 ID 的激活日志，说明插件已被加载：

```
[PluginRuntime] Plugin my-plugin activated successfully.
```

**如果没有看到激活日志**：
- 检查 `manifest.json` 的 `id` 和 `main` 字段是否正确
- 确认 `plugins/your-plugin/index.js` 文件存在
- 确认已运行 `node scripts/build-extensions.cjs` 重新构建

### 步骤 2：确认 activate 被调用

在 `activate()` 方法的第一行添加日志：

```typescript
activate(context: IPluginContext) {
    context.logger.info('>>> activate 开始执行');
    // ... 其余代码
    context.logger.info('>>> activate 执行完毕');
}
```

**如果 `activate` 未执行**：
- 检查 `dependencies` 中声明的其他插件是否已加载
- 如果是 `lazy = true`，确认触发条件是否满足

### 步骤 3：确认事件已订阅

```typescript
const unsub = context.on(CoreEvents.DOCUMENT_CHANGED, (payload) => {
    context.logger.info('事件收到:', payload);
});
```

**如果事件未收到**：
- 确认事件名称拼写正确（使用 `CoreEvents.XXX` 枚举而非字符串字面量）
- 确认事件在你的插件激活后才触发（参见 §2.4 生命周期时序）

### 步骤 4：确认 UI 组件已注册

```typescript
const cleanup = context.registerUI(UISlotId.EDITOR_HEADER_RIGHT, {
    component: MyButton
});
context.logger.info('UI 组件已注册到 EDITOR_HEADER_RIGHT');
```

**如果组件已注册但不可见**：
- 确认组件没有返回 `null`（检查条件渲染逻辑）
- 检查 CSS 样式是否导致组件不可见（例如 `display: none`、`opacity: 0`）
- 在 DevTools Elements 面板搜索组件的 class 名，确认 DOM 是否存在

### 步骤 5：确认注册的清理函数被收集

```typescript
// ✅ 正确：收集清理函数
this.disposables.push(cleanup);

// ❌ 错误：忘记收集（卸载时无法清理）
context.registerUI(UISlotId.STATUS_BAR_RIGHT, { component: MyWidget });
```

### 步骤 6：检查 CSS 样式

在 DevTools Elements 面板中搜索你的样式 ID：

```html
<!-- 如果你注册了 registerStyle('my-plugin-styles', css) -->
<!-- 应该能找到这样的 <style> 标签 -->
<style data-plugin-style="my-plugin-styles">...</style>
```

### 步骤 7：验证服务可用性

```typescript
const editorService = context.getService<any>(ServiceId.EDITOR);
context.logger.info('editorService 是否存在:', !!editorService);
context.logger.info('当前文件:', editorService?.getState()?.currentFileId);
```

如果服务为 `undefined`，说明服务在你的插件激活时尚未注册。参见 §10.3 服务可用性说明。

### 步骤 8：检查错误日志

在 DevTools Console 中筛选 `Error` 级别日志，关注以下关键字：
- `[CircuitBreaker]` — 你的 CodeMirror 扩展运行时崩溃
- `Error activating plugin` — `activate()` 方法抛出异常
- `missing activate method` — 导出的对象缺少 `activate` 方法

## 15.3 常见错误与解决方案

### 错误 1：误以为 `context.kernel` 是完整内核实例（实际是受限代理）

**原因**：第三方扩展访问 `context.kernel` 时拿到的是沙箱代理；非白名单事件/服务或非安全属性会被拦截并记录告警。

**解决**：使用公开 API 代替：

```typescript
// ❌ 被阻止
context.kernel.emit(CoreEvents.EDITOR_REQUEST_REFRESH);

// ✅ 使用 context.emit
context.emit(CoreEvents.EDITOR_REQUEST_REFRESH);
```

### 错误 2：`registerService is not allowed for external plugins`

**原因**：扩展插件不允许注册系统级服务。

**解决**：如果需要在多个组件间共享状态，使用 Controller 模式（参见 §3.4）。

### 错误 3：UI 组件闪烁或不更新

**原因**：React 状态未正确响应插件内部状态变化。

**解决**：确保使用 `subscribe` 模式触发 React 重渲染：

```typescript
const MyComponent: React.FC<{ controller: MyController }> = ({ controller }) => {
    const [state, setState] = React.useState(controller.getState());

    React.useEffect(() => {
        // 订阅控制器状态变化
        return controller.subscribe(() => {
            setState({ ...controller.getState() }); // 创建新对象触发重渲染
        });
    }, [controller]);

    return <div>{state.someValue}</div>;
};
```

### 错误 4：首次加载时检测不到文件内容

**原因**：外部插件的 `activate()` 执行时，编辑器可能尚未加载文件。首次 `DOCUMENT_CHANGED` 事件已错过。

**解决**：使用「Probe 模式」主动探测（参见 §2.4 完整示例）。

### 错误 5：Tailwind CSS 类不生效

**原因**：沙箱环境中没有 Tailwind 运行时（参见 §8.2.1）。

**解决**：使用 `context.registerStyle()` 注册纯 CSS。

### 错误 6：构建后代码不更新

**原因**：未重新运行构建脚本。

**解决**：

```bash
# 每次修改源码后必须重新构建
node scripts/build-extensions.cjs
# 然后刷新应用（F5 或 Ctrl+R）
```

> **提示**：构建脚本只会打包 `src/modules/extensions/` 下的插件，不会影响其他代码。

## 15.4 性能调试

### 检测组件重渲染频率

```typescript
const MyComponent: React.FC = () => {
    // 开发阶段可临时添加渲染计数
    const renderCount = React.useRef(0);
    renderCount.current++;
    console.log(`[MyComponent] 渲染次数: ${renderCount.current}`);

    return <div>...</div>;
};
```

> **正常频率**：大多数组件在文件切换时渲染 1-2 次。如果每次按键都触发重渲染，说明事件监听逻辑需要优化（考虑使用防抖）。

### 事件监听防抖

```typescript
activate(context: IPluginContext) {
    let debounceTimer: number | undefined;

    const onContentInput = context.on(CoreEvents.EDITOR_CONTENT_INPUT, (content: string) => {
        // 使用防抖避免每次按键都触发重计算
        clearTimeout(debounceTimer);
        debounceTimer = window.setTimeout(() => {
            this.processContent(content);
        }, 300); // 300ms 防抖
    });

    this.disposables.push(onContentInput);
    this.disposables.push(() => clearTimeout(debounceTimer));
}
```

### CodeMirror 扩展性能

```typescript
// ⚠️ 错误：每次更新都重建所有装饰
update(update: ViewUpdate) {
    this.decorations = this.buildDecorations(update.view); // 全量重建！
}

// ✅ 正确：仅在必要时重建
update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view);
    }
}
```

---

# 第 16 章：引擎兼容与黑箱边界

本章只说明第三方插件开发者需要知道的公开契约，不解释内核、内置插件或加载器的内部实现。

## 16.1 黑箱边界

对外插件系统应被视为黑箱。你可以依赖本文档中明确公开的 API、生命周期和元数据字段，但不应依赖以下内容：

- 内核内部目录结构
- 内置插件的实现方式、分层方式与命名规则
- 内部加载顺序、内部扫描路径、内部冲突编排细节
- 未在本文档公开声明的服务、事件副作用或私有约定

如果一个能力没有被本文档明确列为公开能力，就不要把它当成稳定契约。即使当前版本“刚好能用”，后续版本也可能调整。

## 16.2 为什么需要声明引擎兼容性

系统已经支持可切换的编辑器引擎。插件如果依赖具体引擎提供的 API、行为或扩展机制，就必须明确声明自己的兼容范围。

最常见的场景包括：

- 直接依赖某个引擎的扩展 API
- 对编辑器文档模型、事务模型、选择区行为有特定假设
- 插件功能只能在特定引擎下成立

如果不声明兼容范围，插件在引擎切换后可能被停用，或者在未来版本中表现不符合预期。

## 16.3 `supportedEngines` 字段

你可以在插件定义中声明 `supportedEngines`：

```typescript
export default class MermaidAssistPlugin implements IPlugin {
    id = 'mermaid-assist';
    name = 'Mermaid Assist';
    version = '1.0.0';
    supportedEngines = ['codemirror'];
}
```

建议：

- 只要插件依赖具体编辑器引擎，就显式声明 `supportedEngines`
- 不要依赖“当前默认兼容策略”来赌系统一定会替你选对
- 如果插件是纯 UI、纯命令或纯工具类能力，不依赖具体编辑器引擎，可以在验证兼容性后再决定是否填写

## 16.4 典型场景

### 场景 A：编辑增强插件

这类插件会注册编辑器扩展、键盘映射、Markdown 装饰器，或者直接依赖特定引擎的行为。此类插件应明确声明兼容引擎。

```typescript
export default class MySyntaxPlugin implements IPlugin {
    id = 'my-syntax-plugin';
    name = 'My Syntax Plugin';
    version = '1.0.0';
    supportedEngines = ['codemirror'];

    activate(context: IPluginContext) {
        // 注册编辑增强能力
    }
}
```

### 场景 B：通用工具插件

这类插件只注册通用 UI、命令、设置面板或状态展示，不依赖具体编辑器引擎的内部能力。它可以保持为通用插件，但仍建议在发布前验证多引擎下的实际表现。

```typescript
export default class WorkspaceHelperPlugin implements IPlugin {
    id = 'workspace-helper';
    name = 'Workspace Helper';
    version = '1.0.0';

    activate(context: IPluginContext) {
        context.registerCommand({
            id: 'workspace-helper.open-panel',
            title: 'Open Workspace Helper',
            handler: () => {
                // 打开一个通用面板
            },
        });
    }
}
```

## 16.5 实践建议

- 优先依赖公开 API，而不是推测内部实现
- 对引擎相关能力做显式声明，而不是隐式碰运气
- 对跨引擎能力做降级设计，不要假设所有引擎行为一致
- 发布前至少手工验证一次“安装 -> 激活 -> 使用 -> 切换引擎 -> 再验证”这条路径

# 附录

## 15.5 插件交付前检查清单（优秀插件标准）

> 这份清单用于“准备交付给用户 / 提交评审前”的最后一轮自检。
> 目标不是让插件“能跑”，而是尽量达到“稳定、易维护、体验良好”的交付质量。

### A. 功能正确性（必须）

- [ ] 核心功能主路径可用（按预期输入 -> 操作 -> 输出）
- [ ] 至少验证 1 个边界场景（空数据 / 无文件 / 无选区 / 重复点击）
- [ ] 插件 `activate()` 后功能可见且可触发
- [ ] 插件 `deactivate()` 后不会残留失效 UI 或报错行为
- [ ] 多次激活/停用（如热重载或重复加载）不会导致重复注册

### B. 接入与结构规范（必须）

- [ ] 插件入口 `index.ts` / `index.tsx` 仅做 wiring（注册、监听、cleanup），不承载业务逻辑
- [ ] 业务逻辑已下沉到 `services/` / `controllers/` / `components/` / `hooks/`
- [ ] 使用 `export default class XxxPlugin implements IPlugin`
- [ ] `manifest.json` 字段完整且正确（`id` / `name` / `version` / `main`）
- [ ] `manifest.json.version` 与插件类中的 `version` 一致（如同时存在）

### C. 沙箱与权限兼容性（外部插件重点）

- [ ] 不假设 `context.kernel` 是完整 Kernel（按受限代理语义编写）
- [ ] `context.getService(...)` 获取失败时有空值判断或降级路径
- [ ] 对可能受限的服务访问有替代方案或明确提示
- [ ] 不依赖未授权的危险能力（文件系统写入、系统 API 等）作为主路径前提
- [ ] 关键功能在“权限不足”时行为可预期（禁用按钮 / 提示 / graceful fallback）

### D. 异常处理与降级（强烈建议）

- [ ] 异步逻辑（文件读取、渲染、请求）包含 `try/catch`
- [ ] 错误信息对用户可理解（不是仅抛原始异常对象）
- [ ] 失败后不会破坏编辑器主流程（不阻塞输入/保存等基础能力）
- [ ] 对不可恢复错误有最小降级方案（跳过渲染、提示重试、禁用局部功能）

### E. 性能与资源管理（强烈建议）

- [ ] 没有在高频事件里做重计算（输入、光标移动、滚动）
- [ ] 必要时做节流/去抖/批处理
- [ ] 事件监听、定时器、订阅、DOM 观察器在 `deactivate()` 中已清理
- [ ] 不重复注册同一个 UI 项、命令、样式或扩展
- [ ] 大体量渲染/解析逻辑不会明显卡顿主线程（至少做过主观体感检查）

### F. 日志与排查能力（建议）

- [ ] 使用 `context.logger`（或系统 logger）记录关键阶段日志，避免随意 `console.log`
- [ ] 日志包含最小定位信息（模块名、动作、结果/错误）
- [ ] 调试日志不会泄露敏感内容（完整路径、隐私文本等）或已做裁剪

### G. 测试与回归验证（优秀插件建议达标项）

- [ ] 至少完成 1 轮手工回归：激活 -> 使用 -> 停用 -> 再激活
- [ ] 至少覆盖 1 条权限受限场景（外部插件）
- [ ] 至少覆盖 1 条异常路径（服务不可用 / 输入非法 / 渲染失败）
- [ ] 如插件逻辑较复杂，补最小自动化测试或可复现脚本

### H. 交付与分发准备（交付前必须）

- [ ] 交付目录结构正确（包含 `index.js` 与 `manifest.json`）
- [ ] 版本号已更新（有行为变更时）
- [ ] 插件 `id` 稳定，不随版本随意变更
- [ ] 有最小使用说明（功能说明、触发方式、权限限制、已知限制）
- [ ] 明确标注适用版本范围（如果依赖特定 API 行为）

### 一句话判断标准

如果一个插件同时满足：

1. 能稳定加载并完成主功能
2. 权限受限时不会崩
3. 停用后能清理干净
4. 有最小日志与回归验证

那么它通常已经超过“能用插件”的水平，进入“可交付、高质量插件”的范围。

## A：CoreEvents 完整参考

```typescript
const CoreEvents = {
    // 编辑器核心
    EDITOR_STATE_CHANGED: 'editor:state_changed',
    DOCUMENT_CHANGED: 'editor:document_changed',
    VIEW_READY: 'editor:view_ready',
    EDITOR_FOCUS: 'editor:focus',
    EDITOR_SCROLL_TO_LINE: 'editor:scroll_to_line',
    EDITOR_INSERT_TEXT: 'editor:insert_text',
    EDITOR_SELECT_MATCH: 'editor:select_match',
    EDITOR_CONTENT_INPUT: 'editor:content_input',
    CURSOR_ACTIVITY: 'editor:cursor_activity',
    EDITOR_REQUEST_REFRESH: 'editor:request_refresh',
    TOOLBAR_STATE_CHANGED: 'editor:toolbar_state_changed',

    // 编辑器生命周期
    MAIN_VIEW_READY: 'editor:main_view_ready',
    PREVIEW_VIEW_READY: 'editor:preview_view_ready',
    LIFECYCLE_SWITCHING_START: 'editor:lifecycle_switching_start',
    LIFECYCLE_FILE_LOADED: 'editor:lifecycle_file_loaded',

    // 分屏视图
    SPLIT_VIEW_CHANGED: 'split_view:changed',
    SPLIT_VIEW_TRANSITION_START: 'split_view:transition_start',
    SPLIT_VIEW_TAB: 'split_view:tab',
    CLOSE_SPLIT_VIEW: 'split_view:close',
    TOGGLE_SPLIT_VIEW: 'split_view:toggle',

    // 文件操作
    OPEN_FILE: 'editor:open_file',
    REQUEST_SAVE: 'editor:request_save',
    REQUEST_SAVE_CURSOR: 'editor:request_save_cursor',
    REQUEST_SAVE_CONTENT: 'editor:request_save_content',
    SAVE_FILE_REQUEST: 'editor:save_file_request',
    SAVE_CURSOR_BEFORE_SWITCH: 'editor:save_cursor_before_switch',
    FILE_SAVED: 'editor:file_saved',
    SYNC_EDITOR_CONTENT: 'editor:sync_content',
    EDITOR_SYNC_CONTENT: 'editor:sync_content_broadcast',
    SYNC_EDITOR_CONTENT_INTERNAL: 'editor:sync_content_internal',
    CREATE_UNTITLED_TAB: 'editor:create_untitled_tab',
    SAVE_ALL_FILES: 'editor:save_all_files',

    // 文件系统
    FS_FILE_CREATED: 'fs:file_created',
    FS_FILE_DELETED: 'fs:file_deleted',
    FILE_MOVED: 'fs:file_moved',
    FILE_OVERWRITTEN: 'fs:file_overwritten',

    // UI 触发
    TRIGGER_IMAGE_UPLOAD: 'editor:trigger_image_upload',
    TRIGGER_LINK_MODAL: 'editor:trigger_link_modal',
    PREVIEW_IMAGE: 'editor:preview_image',

    // 应用命令
    APP_CMD_NEW_FILE: 'app:cmd_new_file',
    APP_CMD_OPEN_FILE: 'app:cmd_open_file',
    APP_CMD_SAVE: 'app:cmd_save',
    APP_CMD_SAVE_AS: 'app:cmd_save_as',
    APP_CMD_TOGGLE_ZEN_MODE: 'app:cmd_toggle_zen_mode',
    APP_CMD_TOGGLE_SIDEBAR: 'app:cmd_toggle_sidebar',
    APP_CMD_TOGGLE_SPLIT_VIEW: 'app:cmd_toggle_split_view',
    APP_CMD_EXPORT_PDF: 'app:cmd_export_pdf',
    APP_CMD_EXPORT_WORD: 'app:cmd_export_word',
    APP_CMD_TOGGLE_THEME: 'app:cmd_toggle_theme',
    APP_CLEAR_STATE: 'app:clear_state',

    // 工作区
    WORKSPACE_CHANGED: 'workspace:changed',
    WORKSPACE_PROJECT_ROOT_CHANGED: 'workspace:project_root_changed',
    WORKSPACE_SELECTED_FILE_CHANGED: 'workspace:selected_file_changed',
    WORKSPACE_DIRTY_STATE_CHANGED: 'workspace:dirty_state_changed',

    // 标签页
    CHECK_TABS_EXISTENCE: 'tabs:check_existence',
    TAB_DIRTY_COUNT_CHANGED: 'tabs:dirty_count_changed',

    // 资源管理器
    EXPLORER_SELECT_PATH: 'explorer:select_path',
    EXPLORER_CREATE_FILE: 'explorer:create_file',
    EXPLORER_CREATE_FOLDER: 'explorer:create_folder',
    EXPLORER_SET_FILE_TREE: 'explorer:set_file_tree',
    REVEAL_IN_EXPLORER: 'explorer:reveal',

    // 插件系统
    PLUGIN_TRIPPED: 'plugin:tripped',
    PLUGIN_REQUEST_AUTH: 'plugin:request_auth',
    PLUGIN_AUTH_RESPONSE: 'plugin:auth_response',

    // 设置
    SETTING_CHANGED: 'settings:changed',

    // 对话框
    APP_SHOW_AUTO_SAVE_DIALOG: 'app:show_auto_save_dialog',
    APP_SHOW_SHORTCUT_DIALOG: 'app:show_shortcut_dialog',
    APP_SHOW_MESSAGE_DIALOG: 'app:show_message_dialog',
};
```

## B：UISlotId 完整参考

```typescript
enum UISlotId {
    LEFT_SIDEBAR = 'left-sidebar',
    RIGHT_SIDEBAR = 'right-sidebar',
    SIDEBAR_BOTTOM = 'sidebar-bottom',
    MAIN_EDITOR = 'main-editor',
    TITLE_BAR = 'title-bar',
    EDITOR_TABS = 'editor-tabs',
    EDITOR_HEADER = 'editor-header',
    EDITOR_HEADER_RIGHT = 'editor-header-right',
    EDITOR_TOOLBAR = 'editor-toolbar',
    EDITOR_TOOLBAR_ITEMS = 'editor-toolbar-items',
    EDITOR_MODALS = 'editor-modals',
    EDITOR_SIDE_COMPANION = 'editor-side-companion',
    STATUS_BAR = 'status-bar',
    STATUS_BAR_LEFT = 'status-bar-left',
    STATUS_BAR_RIGHT = 'status-bar-right'
}
```

## C：常见问题 FAQ

### Q1：为什么我的插件加载后编辑器崩溃了？

检查你注册的 `CodeMirror Extension` 是否有运行时错误。系统会在控制台输出 `[CircuitBreaker]` 相关日志，帮助你定位问题。

### Q2：为什么我的 CSS 样式不生效？

1. 确认是否调用了 `context.registerStyle(id, css)`
2. 检查类名是否与全局样式冲突
3. 检查选择器优先级是否足够

### Q3：如何在多个代码块之间共享状态？

使用 `BlockModeManager`（每个插件实例一个），它通过 `Map<number, BlockMode>` 存储每个代码块的模式。

### Q4：如何让插件在特定文件类型中才激活？

使用 `lazy` + `activationTrigger`：

```typescript
lazy = true;
activationTrigger = {
    type: 'syntax',
    pattern: /```mermaid/  // 文档中出现此语法时激活
};
```

### Q5：registerMarkdownDecorationProvider 和 registerIsolatedRenderer 应该选哪个？

| 场景 | 推荐 |
|------|------|
| 纯 DOM 渲染（无第三方脚本） | `registerMarkdownDecorationProvider` |
| 需要运行第三方 JS 库 | `registerIsolatedRenderer` |
| 需要样式隔离 | `registerIsolatedRenderer` |
| 需要与编辑器深度交互 | `registerMarkdownDecorationProvider` |

### Q6：我的 IFrame 内容为什么加载不了外部图片？

IFrame 的 CSP 策略允许 `img-src * data:`，所以外部图片应该可以加载。如果不行，检查图片 URL 是否正确，以及是否被 CORS 策略阻止。

### Q7：如何获取当前编辑器的 EditorView 实例？

扩展插件不能直接获取 `EditorView`。如果需要操作编辑器，通过以下方式：
- `registerEditorExtension` 中的 `ViewPlugin` 可以直接访问 `view`
- `registerMarkdownDecorationProvider` 的 `context.view` 可以访问
- `registerEditorToolbarItem` 的 `onClick(editorRef)` 通过 ref 访问
