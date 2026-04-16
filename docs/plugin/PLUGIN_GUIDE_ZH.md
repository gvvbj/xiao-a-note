# 零硬编码：插件化开发架构指南 (PLUGIN_GUIDE_ZH)

本指南旨在指导开发者如何在 `xiao-a-note` 架构下进行功能开发，确保系统保持 100% 插件化、零硬编码以及无“上帝组件”的纯净状态。

---

## 核心原则

### 1. 插件优先 (Plugin-First)
任何新功能、按钮、快捷键或 UI 面板，都必须通过插件注入，严禁在核心代码（如 `NoteEditor.tsx`, `CodeMirrorEditor.tsx`）中直接硬编码逻辑。

### 2. 零硬编码 (Zero Hardcoding)
UI 容器（Slot）应只负责提供挂载位置，而不关心具体挂载了什么。核心组件应通过注册表（Registry）动态渲染内容。

### 3. 防范“上帝组件” (Anti-God Components)
如果一个组件的代码超过 300 行且处理了多种互不相关的逻辑，它就是潜在的“上帝组件”。应将其逻辑拆分为：
- **Service**: 处理业务逻辑、文件同步、导出等。
- **Plugin**: 处理功能声明、UI 注册。
- **Component**: 纯粹的 UI 渲染。

---

## 核心基础设施

系统通过 `Kernel`（内核）提供服务发现和 UI 注册能力。

### 1. 注册表 (Registries)
- **EditorToolbarRegistry**: 管理编辑器顶部的工具栏按钮。
- **EditorExtensionRegistry**: 管理 CodeMirror 6 的动态扩展（如实时预览、语法高亮）。
- **EditorPanelRegistry**: 管理编辑器内部的弹出面板（如搜索栏、目录树）。
- **EditorHeaderRegistry**: 管理编辑器头部的功能项（如文件名、状态显示）。

### 2. 插件上下文 (IPluginContext)
每个插件在 `activate` 时都会收到一个上下文对象，通过它与系统交互：
```typescript
interface IPluginContext {
  registerCommand: (id: string, handler: Function) => void;
  registerEditorExtension: (extension: Extension) => () => void;
  registerEditorToolbarItem: (item: IEditorToolbarItem) => () => void;
  registerEditorHeaderItem: (id: string, component: React.ComponentType) => () => void;
}
```

---

## 开发范例

### 例 1：注册一个工具栏按钮 (Toolbar Item)
```typescript
export const MyAwesomePlugin: IPlugin = {
    id: 'my-feature',
    activate(context) {
        context.registerEditorToolbarItem({
            id: 'MY_ACTION',
            label: '快速操作',
            icon: ZapIcon,
            type: 'button',
            group: 'basic',
            order: 100,
            onClick: (ref) => {
                // ref.current 提供 CodeMirror 视图访问权限
                ref.current?.view?.dispatch({ ... });
            }
        });
    }
};
```

### 例 2：注入 CodeMirror 扩展 (Editor Extension)
如果你想添加一种新的语法高亮或视觉效果：
```typescript
import { EditorView, Decoration } from "@codemirror/view";

const myExtension = EditorView.baseTheme({ ... });

export const SyntaxPlugin: IPlugin = {
    id: 'custom-syntax',
    activate(context) {
        context.registerEditorExtension(myExtension);
    }
};
```

---

## 最佳实践与禁忌

- **✅ 保持隔离**: 插件之间应通过自定义事件（CustomEvent）或全局 Command 通信，严禁直接 `import` 另一个插件的内部变量。
- **✅ 动态基准路径**: 如需处理资源，请使用 `PreviewPlugin` 提供的模式，利用 CodeMirror `Compartment` 动态响应路径变化。
- **❌ 严禁直接修改 `NoteEditor.tsx`**: 如果你发现 `NoteEditor` 缺了一个按钮，请检查 `EditorHeaderRegistry` 或 `EditorToolbarRegistry`，而不是去加一行 `<Button />`。
- **❌ 避免同步状态膨胀**: 尽量使用 `Zustand` 或 `Kernel API` 共享状态，不要通过层层 Prop 透传。

---

## 总结
插件化不仅仅是为了解耦，更是为了系统的可演进性。当一个项目实现“零硬编码”时，意味着你可以在不触碰一行核心代码的情况下，通过插件将 Markdown 编辑器彻底改造为代码编辑器、表格编辑器甚至画板。
