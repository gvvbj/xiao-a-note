# xiao-a-note 插件开发指南 (The Official Guide)

> **版本 (Version)**: 1.0.0
> **生效日期 (Effective Date)**: 2026-01-30
> **适用对象**: 所有开发者 & AI 助手

---

## 🛑 给 AI 助手的特别指令 (Special Instructions for AI)

> **当你阅读这份文档时，请务必遵守以下铁律：**
> 1.  **严禁修改核心**：任何新功能请求，首先思考“能否通过新建一个插件实现？”。绝大多数情况下，答案是肯定的。
> 2.  **遵守禁飞区**：下文中列出的“绝对禁区”文件，除非修复严重的核心 Bug 或进行经批准的架构升级，否则**绝对不允许修改**。
> 3.  **保持纯净**：不要在 `CorePlugin` 中堆砌业务逻辑。如果一个功能很独立（如“导出PDF”），请新建 `ExportPdfPlugin.ts`。

---

## 1. 核心哲学 (Core Philosophy)

### 1.1 一切皆插件 (Everything is a Plugin)
`xiao-a-note` 不仅仅是一个编辑器，它是一个微内核的插件宿主。
- **编辑器核心 (Core)** 只是一个空壳 (Shell)，提供插槽 (Slots)。
- **业务功能 (Features)** 全部由插件 (Plugins) 填充。
- **即插即用**：禁用一个插件，必须能彻底移除其所有 UI、逻辑和副作用。

### 1.2 零硬编码 (Zero Hardcoding)
- ❌ **错误做法**：在 `CodeMirrorEditor` 中写 `if (isMarkdown) { ... }`。
- ✅ **正确做法**：创建一个 `MarkdownCorePlugin`，在激活时注册 Markdown 相关的扩展。

### 1.3 拒绝上帝组件 (Anti-God Components)
- 如果一个文件超过 300 行且包含多种互不相关的逻辑（如同时处理文件保存、图片上传和快捷键），它就是垃圾代码。
- **拆分原则**：
    - **Service**: 纯逻辑，无 UI。
    - **Plugin**: 胶水层，连接 UI 与 Kernel。
    - **UI**: 纯展示，无业务状态。

---

## 2. 开发者铁律：绝对禁区 (No Fly Zones) 🛡️

以下文件是架构的基石，**严禁**在日常功能开发中修改：

| 文件路径 | 描述 | 为什么禁止修改？ |
| :--- | :--- | :--- |
| `src/modules/editor/components/CodeMirrorEditor.tsx` | 编辑器外壳 | 它是纯净容器，不应感知具体业务。 |
| `src/modules/editor/config/keymap.ts` | 通用键位 | 仅包含 `Undo/Redo` 等通用操作。业务快捷键请在插件中注册。 |
| `src/shared/styles/cm-live-preview.css` | 全局预览样式 | 仅保留结构性 CSS。业务样式（如表格、公式）请在插件中动态注入。 |
| `src/modules/plugin/PluginManager.ts` | 插件管理器 | 它是内核的一部分，稳定性至关重要。 |
| `src/kernel/**/*` | 微内核层 | 除非你正在升级操作系统本身，否则不要动内核。 |

---

## 3. 插件开发实战 (Development Tutorials)

### 3.1 插件结构模板 (Template)

新建插件文件 `src/plugins/MyFeaturePlugin.ts`：

```typescript
import { IPlugin, PluginCategory, IPluginContext } from '@/modules/plugin/types';
import { EditorView } from '@codemirror/view';

export default class MyFeaturePlugin implements IPlugin {
    // [必填] 全局唯一 ID
    id = 'my-feature';
    // [必填] 显示名称
    name = 'My Feature';
    version = '1.0.0';
    category = PluginCategory.GENERAL; // 属于通用类还是编辑器类

    // [可选] 依赖并未激活的插件 ID
    dependencies = [];

    // [必填] 激活入口：资源注册
    activate(context: IPluginContext) {
        console.log('My Feature Activated!');
        
        // 在这里注册你的 Commands, UI, Styles...
    }

    // [可选] 停用入口：资源清理
    // 注意：通过 context 注册的资源会自动清理，
    // 只有你自己手动添加的 global listener 需要在这里清理。
    deactivate() {
        console.log('My Feature Deactivated!');
    }
}
```

### 3.2 场景 A：添加一个工具栏按钮 (Toolbar Item)

**需求**：在工具栏添加一个“插入时间戳”的按钮。

```typescript
import { Clock } from 'lucide-react'; // 图标

activate(context: IPluginContext) {
    // 注册按钮
    context.registerEditorToolbarItem({
        id: 'INSERT_TIMESTAMP',
        label: '插入时间',
        icon: Clock,
        type: 'button',
        group: 'insert', // 分组：file, history, phantom, format, insert, tools
        order: 100,      // 排序权重
        onClick: (ref) => {
            // 获取编辑器视图实例
            const view = ref.current?.view;
            if (!view) return;

            // 执行插入逻辑
            const timeString = new Date().toLocaleTimeString();
            const { from } = view.state.selection.main;
            view.dispatch({
                changes: { from, insert: timeString },
                selection: { anchor: from + timeString.length }
            });
            view.focus();
        }
    });
}
```

### 3.3 场景 B：可以配置的样式 (Themable Styles)

**需求**：为引用的文本添加特殊的背景色，且支持卸载插件时恢复。

```typescript
const QUOTE_CSS = `
.cm-quote-line {
    border-left: 4px solid var(--primary);
    background: rgba(0, 0, 0, 0.05); /* 业务样式 */
    padding-left: 8px;
}
`;

activate(context: IPluginContext) {
    // 注册样式 (自动处理注入与移除)
    context.registerStyle('my-quote-style', QUOTE_CSS);
}
```

### 3.4 场景 C：复杂的编辑器渲染 (Decoration & Widget)

**需求**：将 `::warning::` 文本渲染为一个红色的警告框。

```typescript
import { Decoration, WidgetType } from '@codemirror/view';

class WarningWidget extends WidgetType {
    toDOM() {
        const div = document.createElement('div');
        div.className = 'bg-red-100 text-red-500 p-2 rounded border border-red-200';
        div.textContent = '⚠️ 警告：这是一个危险操作';
        return div;
    }
}

activate(context: IPluginContext) {
    context.registerMarkdownDecorationProvider({
        nodeTypes: ['Paragraph'], // 监听段落节点
        render: (node, { state }) => {
            const { from, to } = node;
            const text = state.sliceDoc(from, to);
            
            // 简单匹配逻辑
            if (text.trim() === '::warning::') {
                return {
                    decorations: [
                        Decoration.replace({
                            widget: new WarningWidget(),
                            block: true
                        }).range(from, to)
                    ]
                };
            }
            return { decorations: [] };
        }
    });
}
```

---

## 4. 插件体系 (Plugin Architecture)

### 4.1 基础插件 (Core Plugins)
位于 `src/modules/editor/plugins/`。
- **EditorCommonPlugin**: 撤销/重做，语言包。
- **MarkdownCorePlugin**: 标题、列表、粗体等核心 Markdown 渲染。
- **InternalToolbarPlugin**: 默认的工具栏布局。

### 4.2 扩展插件 (Extension Plugins)
建议位于 `src/plugins/` (推荐) 或 `src/modules/markdown-extra/`。
- **TablePlugin**: 表格支持。
- **MathPlugin**: 数学公式。
- **MermaidPlugin**: 流程图。
- **ExportPlugin**: 导出功能。

---

## 5. API 参考手册 (Quick API Reference)

所有能力通过 `IPluginContext` 暴露：

| API 方法 | 用途 | 备注 |
| :--- | :--- | :--- |
| `registerCommand` | 注册全局命令 (Cmd+P 可调用) | 推荐作为功能的唯一入口 |
| `registerEditorToolbarItem` | 添加工具栏按钮 | 支持按钮、下拉菜单、自定义组件 |
| `registerEditorExtension` | 注入 CodeMirror 6 扩展 | 如 Keymap, ViewPlugin, Theme |
| `registerMarkdownDecorationProvider` | 注入 Live Preview 渲染逻辑 | 核心渲染 API |
| `registerStyle` | 注入 CSS 样式字符串 | 自动管理生命周期，支持 HMR |
| `kernel.getService<T>()` | 获取系统服务 | 如 FileSystem, Settings |

---

> **结语**
> 
> 好的架构是限制出来的。请始终铭记：**Don't touch the core, extend it.**
