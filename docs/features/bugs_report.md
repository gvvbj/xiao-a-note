# Xiao-A-Note 编辑器重构 Bug 描述清单

以下是重构过程中遇到的核心 Bug 及其技术描述，去除了具体的解决方案：

### 1. 插件“开启后无法关闭” (Plugin Lifecycle Break)
*   **现象**：用户在插件面板关闭插件后，插件注入的 UI 元素（如 Header 图标、侧边栏项）依然残留在界面上，直到应用重启。
*   **成因**：内核系统（Kernel）仅实现了 UI 元素的注册逻辑，未提供对应的注销接口；同时插件管理层未追踪各插件产生的副作用（Disposables），导致“停用”操作无法物理移除已挂载的组件。

### 2. 服务实例重复注册与冲突 (Service Registry Overwrite)
*   **现象**：多个模块同时尝试注册同一个全局服务（如 `ToolbarRegistry`），导致后启动的模块覆盖了先启动模块的注册结果，造成之前的配置或状态丢失。
*   **成因**：由于缺乏“单例存在性检查”，模块在初始化阶段会盲目 `new` 出新实例并强制覆盖内核中已有的同名服务，破坏了服务的共享特性。

### 3. 分屏预览同步闪烁/失效 (Split View Sync Issue)
*   **现象**：在分屏模式下打字时，预览区内容出现频繁闪烁，或者在特定场景下预览区无法同步最新的编辑内容。
*   **成因**：同步逻辑在编辑器视图（EditorView）尚未完全初始化完成时即开始尝试数据交换，产生了竞态条件；此外，缺乏内容一致性比对导致了不必要的重复渲染和焦点跳变。

### 4. 标签页切换位置丢失 (Tab Persistence Loss)
*   **现象**：用户在切换不同文件的标签页后，再次切回原文件时，光标会自动跳到文件开头，滚动条位置也无法恢复。
*   **成因**：React 组件的卸载（Unmount）与状态保存逻辑之间存在时间差，导致切换发生的瞬间，当前视图的滚动偏移量和选取位置未及保存即被销毁。

### 5. “同名异构”引发的运行时崩溃 (Structural Inconsistency)
*   **现象**：控制台报错 `TypeError: extensionRegistry.subscribe is not a function`，导致编辑器区域出现异常或白屏。
*   **成因**：项目目录中存在两个同名但定义不同的 [EditorExtensionRegistry.ts](file:///e:/require/xiao-a-note/src/modules/plugin/EditorExtensionRegistry.ts) 文件。系统在运行时加载了不具备 [subscribe](file:///e:/require/xiao-a-note/src/modules/plugin/EditorHeaderRegistry.ts#42-48) 方法的旧版本，而新逻辑强依赖该方法进行实时更新。

### 6. 编辑器滚动条消失 (Scrollbar CSS Regression)
*   **现象**：当文档内容长度超过视口高度时，界面右侧不出现滚动条，且用户无法通过鼠标滚轮查看下方内容。
*   **成因**：在重构组件结构时，外层包装容器引入了错误的 `overflow: hidden` 约束，或者是硬编码的高度配置与 Flexbox 布局发生了冲突，导致内层 CodeMirror 容器无法获取真实的滚动触发条件。
