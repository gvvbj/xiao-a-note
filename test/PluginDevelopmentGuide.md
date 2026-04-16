# 插件开发指南

本指南将帮助你了解如何为本系统开发插件。插件系统基于 **Kernel (内核)** 架构设计，通过标准的生命周期钩子和上下文 API 扩展应用功能。

## 1. 核心架构概述
系统采用插件化架构，主要由以下部分组成：
- **Kernel (内核)**：核心服务总线，负责组件间通信和资源管理。
- **PluginManager**：负责插件的加载、激活和状态持久化。
- **IPluginContext**：向插件暴露的 API 集合，用于注册功能。

## 2. 插件接口定义
所有插件必须实现 [IPlugin](file:///e:/require/xiao-a-note/src/modules/plugin/types.ts#23-33) 接口：

```typescript
export interface IPlugin {
    id: string;          // 唯一标识符 (例如: 'my-custom-extension')
    name: string;        // 插件显示名称
    version: string;     // 版本号
    description?: string; // 插件描述
    /** 插件激活回调：系统启动时调用 */
    activate: (context: IPluginContext) => void;
    /** 插件停用回调：关闭插件时调用 */
    deactivate?: () => void;
}
```

## 3. 插件上下文 API (IPluginContext)
通过 [activate](file:///e:/require/xiao-a-note/src/modules/plugin/index.ts#15-24) 函数传入的 `context` 对象，你可以访问以下核心能力：

### 3.1 注册侧边栏项目
用于在 Explorer 左侧面板添加自定义视图。
```typescript
context.registerSidebarItem(
    'my-view-id', 
    MyComponent, 
    '视图名称', 
    IconComponent
);
```

### 3.2 注册编辑器扩展 (CodeMirror 6)
用于扩展编辑器的语法高亮、快捷键、Widget 等。
```typescript
context.registerEditorExtension(myCodeMirrorExtension);
```

### 3.3 注册编辑器顶部工具栏
用于在 NoteEditor 的顶部工具栏添加按钮或信息展示。
```typescript
context.registerEditorHeaderItem('my-btn-id', ToolbarButtonComponent);
```

### 3.4 注册命令
注册全局可触发的命令。
```typescript
context.registerCommand('cmd.say_hello', () => {
    console.log('Hello from plugin!');
});
```

## 4. 开发示例：Hello World 插件
以下是一个完整的插件代码示例，展示了如何注册一个简单的编辑器顶部按钮：

```typescript
import { IPlugin, IPluginContext } from './types';
import { Gift } from 'lucide-react'; // 图标库

export const HelloWorldPlugin: IPlugin = {
    id: 'hello-world-plugin',
    name: 'Hello World 插件',
    version: '1.0.0',
    description: '一个简单的入门插件示例',

    activate(context: IPluginContext) {
        console.log('插件已激活！');

        // 注册一个顶部栏按钮
        context.registerEditorHeaderItem('hello-btn', () => (
            <button 
                className="p-1 hover:bg-muted rounded"
                onClick={() => alert('你好！这是来自插件的消息。')}
            >
                <Gift className="w-4 h-4" />
            </button>
        ));
    },

    deactivate() {
        console.log('插件已停用。');
    }
};
```

## 5. 开发建议
1. **防内存泄漏**：[registerEditorExtension](file:///e:/require/xiao-a-note/src/modules/plugin/PluginManager.ts#68-73) 等方法通常会返回一个取消注册的函数。请务必在 [deactivate](file:///e:/require/xiao-a-note/src/modules/editor/index.tsx#47-53) 钩子中清理副作用。
2. **样式隔离**：建议使用 Tailwind CSS 或 CSS Modules 来确保插件样式不会影响主程序。
3. **命令驱动**：优先通过 [registerCommand](file:///e:/require/xiao-a-note/src/modules/plugin/PluginManager.ts#78-81) 暴露核心逻辑，这样不仅可以通过 UI 触发，也可以通过快捷键或脚本调用。
