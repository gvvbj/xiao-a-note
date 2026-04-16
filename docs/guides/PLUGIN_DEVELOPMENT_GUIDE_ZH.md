# 插件开发规范指南 (Plugin Development Guide)

> **⚠️ 核心原则 (Critical Principles)**
> 1.  **插件优先 (Plugin-First)**：任何新功能（无论是语法支持还是 UI 按钮）都**必须**通过插件系统实现。
> 2.  **零侵入 (Zero-Intrusion)**：**绝对禁止**修改 `CodeMirrorEditor.tsx`、`NoteEditor.tsx` 或 `main.tsx` 等核心文件来添加功能。
> 3.  **原子性 (Atomicity)**：一个功能对应一个插件。不要把不相关的逻辑塞进同一个文件。

本文档详细说明了在本项目中开发插件的**两条标准路径**。请严格遵守，防止代码腐化。

---

## 路径一：开发“静默语法支持” (Implicit Syntax Support)

**适用场景**：
*   添加 Markdown 扩展语法（如 LaTeX, Mermaid, Emoji）。
*   不需要用户手动开关，不需要在扩展中心显示。
*   不需要 UI 交互（按钮、侧边栏）。

**开发规范**：
1.  **文件位置**：`src/modules/markdown-extra/`
2.  **分类设置**：必须设置 `category = PluginCategory.CORE`。
3.  **核心行为**：仅注册语法解析或渲染逻辑。

**代码模板**：

```typescript
// src/modules/markdown-extra/MySyntaxPlugin.ts
import { IPlugin, PluginCategory, IPluginContext } from '../plugin/types';

export default class MySyntaxPlugin implements IPlugin {
    id = 'syntax-my-feature';
    name = 'My Syntax Feature';
    version = '1.0.0';
    // [关键] 设为 CORE，扩展中心会自动隐藏，用户无感知
    category = PluginCategory.CORE;

    activate(context: IPluginContext) {
        // 注册 markdown-it 解析规则 (用于导出/预览)
        context.registerMarkdownUsage({
            id: 'markdown-it-my-rule',
            apply: (md) => {
                // md.use(require('markdown-it-plugin')...);
            }
        });

        // 注册编辑器内装饰 (Live Preview) - 可选
        context.registerMarkdownDecorationProvider({
            // ...
        } as any);
    }
}

### 进阶：同时需要工具栏按钮？
**完全支持**。你可以在同一个文件里注册按钮。
*   **效果**：插件本身在扩展中心 **不可见**（保持静默），但工具栏上会 **多出一个按钮**。
*   **适用**：核心功能的快捷操作（如：插入视频、插入公式）。

```typescript
// src/modules/markdown-extra/VideoPlugin.ts
export default class VideoPlugin implements IPlugin {
    // ... id, name ...
    category = PluginCategory.CORE; // 关键：保持 System 级插件，不让用户在扩展列表里乱关

    activate(context: IPluginContext) {
        // 1. 注册语法
        context.registerMarkdownUsage({ ... });

        // 2. 注册按钮 (直接写在这里即可)
        context.registerEditorToolbarItem({
            id: 'btn-video',
            icon: VideoIcon,
            onClick: () => context.kernel.emit('EDITOR_INSERT_TEXT', '<video...>')
        });
    }
}
```
```

---

## 路径二：开发“用户扩展插件” (Extension Plugins)

**适用场景**：
*   需要用户在“扩展中心”可见、安装、启用的功能。
*   包含 UI 元素（工具栏按钮、侧边栏、状态栏）。
*   需要用户交互的复杂逻辑。

**开发规范**：
1.  **文件位置**：`src/plugins/<plugin-id>/index.tsx` (推荐创建独立文件夹)
2.  **分类设置**：设置 `category = PluginCategory.UI` 或 `EDITOR`。
3.  **核心行为**：注册 UI 组件、命令、快捷键等。

**代码模板**：

```typescript
// src/plugins/my-cool-extension/index.tsx
import React from 'react';
import { IPlugin, PluginCategory, IPluginContext } from '../../modules/plugin/types';
import { Sparkles } from 'lucide-react';

export default class MyCoolExtension implements IPlugin {
    id = 'my-cool-extension';
    name = 'Cool Feature'; // 扩展中心显示的名称
    description = 'Adds a cool button to the toolbar.';
    version = '1.0.0';
    // [关键] 设为 UI，会在扩展中心显示，允许用户开关
    category = PluginCategory.UI;

    activate(context: IPluginContext) {
        // 1. 注册工具栏按钮
        context.registerEditorToolbarItem({
            id: 'btn-cool',
            label: 'Cool Action',
            icon: Sparkles,
            group: 'format',
            onClick: () => {
                // 执行逻辑
                context.kernel.emit('EDITOR_INSERT_TEXT', '✨');
            }
        });

        // 2. 注册命令 (可选)
        context.registerCommand({
            id: 'cmd.cool.action',
            handler: () => { /* ... */ }
        });
    }

    deactivate() {
        // 清理逻辑
    }
}
```

---

## ⚠️ 严禁行为 (Forbidden Practices)

为了维护架构的整洁，以下行为被**严格禁止**。任何 AI 或开发者在生成代码时若触犯以下规则，将被视为**严重错误**。

1.  **❌ 禁止直接修改核心编辑器文件**
    *   **不要**在 `CodeMirrorEditor.tsx` 里直接 import 你的插件代码。
    *   **不要**在 `NoteEditor.tsx` 里写死新的按钮组件。
    *   编辑器核心应该对你的插件**一无所知**。

2.  **❌ 禁止混淆分类**
    *   如果你写的是一个纯语法高亮，**不要**把它设为 `UI` 分类，否则会污染用户的扩展列表。
    *   如果你写的是一个带按钮的功能，**不要**把它设为 `CORE` 分类，否则用户无法关闭它。

3.  **❌ 禁止硬编码注册**
    *   **不要**在 `main.tsx` 里手动 `new MyPlugin()`。
    *   请利用**文件夹扫描机制**（Auto-Discovery）让系统自动加载你的文件。

---

## 开发流程总结

| 你的需求 | 文件放置位置 | Category 设置 | 结果 |
| :--- | :--- | :--- | :--- |
| **我想加个 Markdown 语法** <br> (如: 数学公式, 脚注) | `src/modules/markdown-extra/` | **CORE** | 静默生效，无 UI，扩展中心**不可见** |
| **我想加个功能/界面** <br> (如: 统计字数, AI 助手) | `src/plugins/<name>/` | **UI / EDITOR** | 出现在扩展中心，用户可**开关** |

**遵循此文档，您的代码将始终保持整洁、解耦且易于维护。**
