# Bug 深度分析与排查技术报告

## 1. Bug 1：暂存区保存弹窗需点击两次关闭
- **现象**: 在暂存区（未保存文件）按 `Ctrl+S` 弹出保存对话框，点击关闭需两次。
- **根源分析**:
    - **双重触发机制**: `NoteEditor.tsx` 中同时存在原生 Electron 另存为对话框（由 `saveAs()` 调用）和自定义 React `SaveAsDialog` 组件（由 `APP_CMD_SAVE_AS` 监听）。如果在某种逻辑路径下（如键盘事件冒泡或状态冲突）同时触发了这两个对话框，用户可能需要先关闭一个，再关闭另一个。
    - **逻辑冗余**: `useEditorLogic` 的 `saveAs` 会调用 `fileSystem.showSaveDialog`，而 `NoteEditor.tsx` 底部的 `SaveAsDialog` 也实现了相似的功能。需要统一保存逻辑的入口。
- **改进建议**: 统一使用一套对话框逻辑；对于已注册的文件名使用原生对话框，对于纯“暂存区”导出使用 React 对话框。

## 2. Bug 2：重命名后出现重复标签页
- **现象**: 资源管理器重命名文件后，编辑器出现旧名字和新名字两个标签页。
- **根源分析**:
    - **路径归一化缺失**: `editorTabsStore.ts` 中的 `updateTabPath` 方法在更新 `id` 和 `path` 时，没有对 `newPath` 进行 `normalizePath` 处理（替换反斜杠为正斜杠）。
    - **ID 匹配失败**: 当 Explorer 随后触发 `OPEN_FILE` 打开新路径时，由于 store 中旧标签的 ID（含 `\`）与传入的归一化 ID（含 `/`）不匹配，导致 store 认为这是一个新文件并调用 `openTab` 重新创建。
- **改进建议**: 在 `updateTabPath` 中对 `newPath` 强制进行 `normalizePath` 处理。

## 3. Bug 3：标签页切换时内容向上偏移
- **现象**: 切换文档时，中间位置的内容会发生向上偏移，顶部和底部正常。
- **根源分析**:
    - **渲染与滚动时序**: CodeMirror 6 在 `resetState` 时恢复 `scrollTop`。由于 Live Preview 会渲染大量装饰器（Widgets），这些装饰器的高度计算是异步或分步完成的。如果在 Widget 尚未撑开高度时设置 `scrollTop`，一旦之后高度增加，原本的位置就会产生偏移。
    - **中间区域敏感**: 顶部偏移为 0（无感），底部被滚动容器限制（无感），只有中间区域受高度累计影响最明显。
- **改进建议**: 在 `resetState` 后，使用 `requestAnimationFrame` 延迟一次滚动恢复，或者监听 CodeMirror 的布局完成事件。

## 4. Bug 4：滚动条位置错误
- **现象**: 编辑区域滚动条显示在标签页上方，编辑区本身失去滚动条。
- **根源分析**:
    - **布局容器溢出控制**: `AppLayout.tsx` 或 `NoteEditor.tsx` 的外层容器设置了 `overflow: auto` 或高度未正确限制，导致整个编辑面板（包括标签栏和工具栏）被作为一个整体滚动，而非内部 `CodeMirrorEditor` 单独滚动。
    - **Flex 布局失效**: 如果 `flex-1` 对应的容器没有设置 `min-h-0` 或 `overflow-hidden`，它会被内部长文档撑开。
- **改进建议**: 检查并确保所有中间 Flex 容器都具备 `min-h-0` 且 `overflow-hidden`，将滚动权限完全交还给 `.cm-scroller`。

## 5. Bug 5：分栏模式下中间输入闪烁与滚动异常
- **现象**: 仅在内容中间输入时，右侧渲染一闪一闪，且输入内容可能出现在顶部。
- **根源分析**:
    - **全量替换开销**: `handleEditorUpdate` 中使用 `changes: { from: 0, to: length, insert: val }` 替换整个右侧文档。这会导致 CodeMirror 销毁并重建所有 Decoration，造成视觉“闪烁”。
    - **y: 'center' 强同步**: 每次输入都调用 `scrollIntoView(..., { y: 'center' })`。在文档中间输入时，行高的微小变化会触发频繁的居中对齐重计算，导致视图剧烈抖动。
    - **无 HTML 预览冲突**: 已确认分栏是两个 CodeMirror 同步，目前的同步算法粒度太粗。
- **改进建议**: 优化 `handleEditorUpdate`，改用差异化更新（如果可能）或降低滚动同步频率，并将 `y: 'center'` 改为 `y: 'nearest'` 或其他更平滑的算法。
