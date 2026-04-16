# UI 现代化改造计划 (Windows 11 风格)

**目标**: 将 'xiao-a-note' 转型为一款高质感、极简的 Windows 11 风格应用。主要工作包括移除过时的 UI 元素（如顶部蓝色标题栏），实现无边框窗口设计，并精细化打磨侧边栏和编辑器的视觉体验。主题逻辑将通过 CSS 变量进行解耦，以支持轻松的主题切换。

**架构**: React + Tailwind CSS + Electron (无边框窗口)
**分支**: `feature/ui-modernization`

## 任务 1: 项目设置与全局样式 (已完成)

**文件:**
- 修改: `src/index.css`
- 修改: `tailwind.config.js`
**步骤 1: 创建分支**
- 命令: `git checkout -b feature/ui-modernization`

**步骤 2: 更新全局样式 (主题隔离)**
- 在 `:root` 中定义语义化 CSS 变量（例如 `--sidebar-background`, `--header-background`），替代硬编码的颜色值。
- 在 Tailwind 配置中添加 "Source Han Sans" (思源黑体) 到字体族。
- 将 `body` 背景更新为温暖/中性的浅灰色 (`#f9fafb` 或 `bg-gray-50`)，以营造“悬浮纸张”的视觉效果。

## 任务 2: 布局与标题栏重构 (移除蓝条) (已完成)

**文件:**
- 修改: `src/shared/components/layout/AppLayout.tsx`
- 修改: `src/shared/components/layout/TitleBar.tsx`

**步骤 1: 移除 AppLayout 中的蓝色头部**
- 在 `AppLayout.tsx` 中，移除 `<header>` 标签上的 `bg-blue-500`, `text-white` 类。
- 改为使用语义化的 `bg-header` (白色/透明)。
- 添加底部边框 `border-b border-gray-200/50` 以增加层次感。

**步骤 2: 更新标题栏样式**
- 在 `TitleBar.tsx` 中，更新文本颜色以使用 `text-header-foreground`。
- 更新窗口控制按钮（最小化/最大化/关闭）的悬停状态，使其符合 Windows 标准风格（悬停：浅灰，关闭按钮悬停：红色）。
- **关键**: 确保“文件”、“语法格式”、“主题”、“快捷键”等菜单清晰可见，设计极简。

## 任务 3: 侧边栏与活动栏优化 (进行中)

**文件:**
- 修改: `src/shared/components/layout/AppLayout.tsx` (侧边栏容器)
- 修改: `src/modules/explorer/components/FileTree.tsx` (或渲染文件列表的组件)

**步骤 1: 侧边栏容器**
- 在 `AppLayout.tsx` 中，将 Sidebar `<aside>` 的背景更新为语义化的 `bg-sidebar`。
- 移除生硬的右侧边框。

**步骤 2: 活动栏 (最左侧图标条)**
- 确保“活动栏”（图标条）使用 `bg-sidebar` 或稍深一点的语义化色调。
- 更新激活图标的样式，使用“胶囊”形状指示器，而不是整块填充色。

**步骤 3: 文件树条目**
- 增加文件条目的垂直内边距 (`py-1` -> `py-1.5`)。
- 将选中样式从“纯蓝实色”改为“圆角浅灰/淡蓝底色”。

**步骤 4: 功能保留检查**
- **严重**: 确保“目录/打开文件夹”按钮（位于侧边栏底部或顶部）被保留，并更新其样式以匹配整体风格。

## 任务 4: 编辑器工具栏与标签页

**文件:**
- 修改: `src/modules/editor/components/EditorToolbar.tsx`
- 修改: `src/modules/editor/components/EditorTabs.tsx`

**步骤 1: 标签页现代化**
- 在 `EditorTabs.tsx` 中，将通用的标签页改为“悬浮卡片”或“Chrome 类”风格。
- 激活标签: 白色背景，微弱阴影，顶部圆角。
- 未激活标签: 透明背景，带有悬停效果。

**步骤 2: 工具栏精简**
- 在 `EditorToolbar.tsx` 中，考虑移除容器的包裹边框？
- 更新图标按钮: 移除默认边框。改为干净的图标，使用 `p-1.5 rounded hover:bg-gray-100`。
- 对图标进行逻辑分组 (加粗/斜体 | 标题 H1/H2 | 列表)。
- **源码切换**: 设计为“胶囊”按钮 (`rounded-full px-3 py-1 text-xs border`)。

## 任务 5: 编辑器内容区域

**文件:**
- 修改: `src/index.css` (Prose 样式)
- 修改: `src/modules/editor/components/NoteEditor.tsx`

**步骤 1: 画布留白**
- 为编辑器容器添加内边距 (`max-width` 或 `padding-x`)，防止文字紧贴边缘。
- 确保编辑器背景是纯白 (`bg-white`)，而窗口背景是浅灰，形成层次。

## 任务 6: 视觉与功能测试策略

**目标**: 确保 UI 回归最小化，且新设计在亮色/暗色模式下均表现良好。

**步骤 1: 视觉回归检查清单**
- [ ] **窗口框架**: 检查最小化、最大化、关闭按钮是否工作且外观原生。
- [ ] **标题栏菜单**: 点击所有下拉菜单（文件、主题），验证文本是否清晰可读（浅色背景上的深色文本）。
- [ ] **侧边栏**: 验证“活动栏”图标对齐。验证文件树滚动功能。
- [ ] **编辑器**: 验证工具栏图标可点击且清晰。
- [ ] **排版**: 检查 H1, H2, p 标签。验证字体是否为 'Source Han Sans' (或回退字体)。

**步骤 2: 主题切换测试**
- 切换主题按钮 (太阳/月亮)。
- 验证:
    - 侧边栏从浅灰 -> 深灰。
    - 编辑器从白色 -> 深灰/黑。
    - 标题栏菜单在暗色模式下保持可读（白色文本）。

**步骤 3: 功能冒烟测试**
- 新建文件 (Ctrl+N)。
- 输入一些 Markdown 内容。
- 切换标签页。
- 确保没有“跳动”或布局偏移。