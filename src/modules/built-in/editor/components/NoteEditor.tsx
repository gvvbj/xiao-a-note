import React, { useRef, useCallback, useMemo, useEffect } from 'react';
import { useKernel } from '@/kernel/core/KernelContext';
import { useEditorLogic } from '../hooks/useEditorLogic';
import { useLayout } from '@/kernel/hooks/useLayout';
import { useTabs } from '@/kernel/hooks/useTabs';
import { useEditor } from '@/kernel/hooks/useEditor';
import { IEditorRef } from '../framework/types';
import { UISlot } from '@/shared/components/ui/UISlot';
import { UISlotId } from '@/kernel/core/Constants';
import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import { EditorKernelIntegration } from './EditorKernelIntegration';
import { useEditorEvents } from '../hooks/useEditorEvents';
import { NoteEditorProvider } from '../context/NoteEditorContext';
import type { IEditorService } from '@/kernel/interfaces';
import { EditorActionService } from '../services/EditorActionService';

/**
 * NoteEditor - 编辑器主容器 (全插槽化)
 * 
 * 职责:
 * 1. 管理编辑器核心生命周期和引用 (Refs)
 * 2. 处理内容更新和存盘逻辑
 * 3. 作为 UISlot 容器，不直接渲染子组件
 * 
 * 遵循原则:
 * - 0 硬编码: 子组件通过 UISlot 动态注入
 * - Plugin-First: 功能逻辑由插件 (EditorCoreUIPlugin 等) 实现
 */
export function NoteEditor() {
  const kernel = useKernel();
  const renderCount = useRef(0);
  renderCount.current++;


  // [Refactored] saveFile 已移除，由 PersistenceService 统一处理
  const { currentPath, initialContent, isUnsaved, handleContentUpdate, loadedPath, switchError } = useEditorLogic();
  const isSyncingRef = useRef(false);
  const cursorLineRef = useRef<number>(1);
  const isRestoringRef = useRef(false);

  const { isZenMode } = useLayout();
  const { setTabCursor, openTab } = useTabs();
  const { setSaveAsDialogOpen } = useEditor();

  const editorRef = useRef<IEditorRef | null>(null);
  const previewEditorRef = useRef<IEditorRef | null>(null);
  const liveContentRef = useRef<string | (() => string)>(initialContent);

  // Render 期间同步更新 (Derived State Pattern)
  const lastInitialContentRef = useRef(initialContent);
  if (lastInitialContentRef.current !== initialContent) {
    liveContentRef.current = initialContent;
    lastInitialContentRef.current = initialContent;
  }

  // [Refactored] 光标保存逻辑由 ScrollPositionPlugin 插件处理，Toolbar 状态由 EditorToolbar 自行订阅

  const handleEditorUpdate = useCallback((val: string | (() => string), changes?: any) => {
    // 插件化同步：发射事件，让感兴趣的插件（如 SplitView）处理
    kernel.emit(CoreEvents.EDITOR_SYNC_CONTENT, {
      content: val,
      cursorLine: cursorLineRef.current,
      changes: changes
    });

    liveContentRef.current = val;
    handleContentUpdate(val, changes);
  }, [handleContentUpdate, kernel]);

  useEditorEvents({
    editorRef, liveContentRef, isSyncingRef,
    cursorLineRef,
    currentPath,
    openTab,
    setSaveAsDialogOpen,
    kernel
  });

  const contextValue = useMemo(() => ({
    editorRef, previewEditorRef,
    currentPath, initialContent,
    isUnsaved, handleEditorUpdate,
    loadedPath, switchError, cursorLineRef, liveContentRef, isRestoringRef
  }), [
    currentPath, initialContent, isUnsaved, handleEditorUpdate,
    loadedPath, switchError
  ]);

  useEffect(() => {
    const editorService = kernel.getService<IEditorService>(ServiceId.EDITOR, false);
    if (!editorService?.registerCompatibilityProbe) {
      return;
    }

    return editorService.registerCompatibilityProbe({
      getCurrentContent: () => {
        const content = editorRef.current?.getContent();
        if (typeof content === 'string') {
          return content;
        }

        const liveContent = liveContentRef.current;
        return typeof liveContent === 'function' ? liveContent() : liveContent;
      },
      getEditorView: () => editorRef.current?.view ?? null,
      getSelection: () => editorRef.current?.getSelection() ?? null,
    });
  }, [kernel]);

  useEffect(() => {
    const editorActionService = kernel.getService<EditorActionService>(ServiceId.EDITOR_ACTIONS, false);
    if (!editorActionService?.registerEditorRefProvider) {
      return;
    }

    return editorActionService.registerEditorRefProvider(() => editorRef.current);
  }, [kernel]);

  return (
    <NoteEditorProvider value={contextValue}>
      <div className="flex-1 flex flex-col min-h-0 bg-editor overflow-hidden relative border-l border-border/40 select-text">
        <EditorKernelIntegration />

        {/* 1. 标签页插槽 */}
        {!isZenMode && <UISlot id={UISlotId.EDITOR_TABS} />}

        {/* 2. 抬头插槽 */}
        <UISlot id={UISlotId.EDITOR_HEADER} />

        {/* 3. 工具栏插槽 */}
        <UISlot id={UISlotId.EDITOR_TOOLBAR} />

        {/* 4. 主视图插槽 */}
        <div className="flex-1 flex min-h-0 relative">
          <UISlot id={UISlotId.MAIN_EDITOR} className="flex-1 flex flex-col min-h-0" itemClassName="flex-1 flex flex-col min-h-0" />
        </div>

        {/* 5. 模态框插槽 */}
        <UISlot id={UISlotId.EDITOR_MODALS} />
      </div>
    </NoteEditorProvider>
  );
}
