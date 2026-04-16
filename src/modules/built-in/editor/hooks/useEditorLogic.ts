/**
 * useEditorLogic - 编辑器 UI 协调层 Hook
 * 
 * Plugin-First Architecture
 * - Core 层只负责接口/排线，不做业务逻辑
 * - 脏状态判定、Tab 同步、自动保存均下沉至插件层
 * - 本文件只负责: 生命周期事件订阅 + 内容变更事件转发
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useKernel } from '@/kernel/core/KernelContext';
import { useEditor } from '@/kernel/hooks/useEditor';
import { EditorEvents } from '../constants/EditorEvents';
import { EDITOR_CONSTANTS } from '../constants/EditorConstants';
import { normalizePath } from '@/shared/utils/path';
import {
  ILifecycleService,
  IFileLoadedPayload,
  ILifecycleSwitchFailedPayload,
} from '@/modules/interfaces';
import { loggerService } from '@/kernel/services/LoggerService';

const logger = loggerService.createLogger('useEditorLogic');

export function useEditorLogic() {
  const kernel = useKernel();

  // Editor Service 状态 (通过 Hook)
  const {
    currentFileId: filePath,
    setCurrentFile,
    setUnsaved: setIsUnsavedStore,
    isUnsaved: isUnsavedStore
  } = useEditor();

  // === 核心状态 ===
  // 移除了与业务逻辑相关的 Ref (debouncedSyncRef, isUnsavedRef)
  // 这些逻辑已下沉至 TabManagerPlugin
  const contentRef = useRef<string | (() => string)>('');
  const [initialContent, setInitialContent] = useState<string>('');
  const initialContentRef = useRef<string>(''); // 同步内容基准
  const activePathRef = useRef<string | null>(null);

  // 状态：是否正在加载 (从 LifecycleService 获取)
  const [isLoading, setIsLoading] = useState(false);
  const [loadedPath, setLoadedPath] = useState<string | null>(null);
  const [switchError, setSwitchError] = useState<ILifecycleSwitchFailedPayload | null>(null);

  // Helper: 解析 Lazy Content 并规范化换行符
  const resolveContent = useCallback((val: string | (() => string)): string => {
    return (typeof val === 'function' ? val() : val).replace(/\r\n/g, '\n');
  }, []);

  // === 订阅 LifecycleService 事件 ===
  useEffect(() => {
    const lifecycleService = kernel.getService<ILifecycleService>(
      EDITOR_CONSTANTS.SERVICE_NAMES.LIFECYCLE,
      false
    );

    // 监听切换开始
    const handleSwitchingStart = () => {
      setIsLoading(true);
      setSwitchError(null);
    };

    // 监听文件加载完成
    const handleFileLoaded = (payload: IFileLoadedPayload) => {
      const { path, content, isUnsaved, isFromCache } = payload;

      // 更新内部状态
      activePathRef.current = path;
      contentRef.current = content;
      initialContentRef.current = content;

      // 更新 React 状态
      setInitialContent(content);
      setIsUnsavedStore(isUnsaved);
      setLoadedPath(path);
      setIsLoading(false);
      setSwitchError(null);
    };

    const handleSwitchingFailed = (payload: ILifecycleSwitchFailedPayload) => {
      activePathRef.current = null;
      contentRef.current = '';
      initialContentRef.current = '';

      setInitialContent('');
      setLoadedPath(null);
      setIsUnsavedStore(false);
      setIsLoading(false);
      setSwitchError(payload);
    };

    kernel.on(EditorEvents.LIFECYCLE_SWITCHING_START, handleSwitchingStart);
    kernel.on(EditorEvents.LIFECYCLE_FILE_LOADED, handleFileLoaded);
    kernel.on(EditorEvents.LIFECYCLE_SWITCHING_FAILED, handleSwitchingFailed);

    return () => {
      kernel.off(EditorEvents.LIFECYCLE_SWITCHING_START, handleSwitchingStart);
      kernel.off(EditorEvents.LIFECYCLE_FILE_LOADED, handleFileLoaded);
      kernel.off(EditorEvents.LIFECYCLE_SWITCHING_FAILED, handleSwitchingFailed);
    };
  }, [kernel, setIsUnsavedStore]);

  // === 触发 LifecycleService 切换 ===
  useEffect(() => {
    const lifecycleService = kernel.getService<ILifecycleService>(
      EDITOR_CONSTANTS.SERVICE_NAMES.LIFECYCLE,
      false
    );

    if (!lifecycleService) {
      logger.warn('LifecycleService not available, skipping switch');
      return;
    }

    // 当 filePath 变化时，触发切换
    const normalizedFilePath = filePath ? normalizePath(filePath) : null;
    const normalizedActive = activePathRef.current ? normalizePath(activePathRef.current) : null;

    if (normalizedFilePath !== normalizedActive) {
      // 传递当前内容供 Service 保存快照
      lifecycleService.switchFile(filePath, {
        currentContent: contentRef.current,
      });
    }
  }, [filePath, kernel]);

  // 移除了 isUnsavedStore 同步到 Ref 的逻辑
  // 现在由 TabManagerPlugin 监听 EDITOR_CONTENT_INPUT 事件并管理状态

  // === 内容更新处理 ===
  // Core 层只负责转发事件，不做任何业务判定
  const handleContentUpdate = useCallback((newVal: string | (() => string), changes?: any) => {
    // [同步路径锁] 如果路径不匹配，说明正在切换，拦截更新
    if (activePathRef.current !== filePath) {
      return;
    }

    if (isLoading) return;

    const resolvedNew = typeof newVal === 'function' ? newVal() : newVal;
    contentRef.current = resolvedNew;

    // 发射实时事件，由插件层处理脏状态和 Tab 同步
    kernel.emit(EditorEvents.EDITOR_CONTENT_INPUT, {
      path: activePathRef.current,
      newContent: resolvedNew,
      initialContent: initialContentRef.current,
      isInternal: changes?.isInternal || false
    });
  }, [filePath, isLoading, kernel]);

  // === 保存逻辑 (完全委托给 PersistenceService) ===
  const saveAs = useCallback(async () => {
    const persistenceService = kernel.getService<{ saveAs: (content: string) => Promise<boolean> }>(
      EDITOR_CONSTANTS.SERVICE_NAMES.PERSISTENCE,
      false
    );
    if (!persistenceService) {
      logger.warn('PersistenceService not available');
      return;
    }
    const resolvedContent = resolveContent(contentRef.current);
    await persistenceService.saveAs(resolvedContent);
  }, [kernel, resolveContent]);

  const saveFile = useCallback(async (targetPath?: string) => {
    const persistenceService = kernel.getService<{ saveFile: (path: string, content: string, silent?: boolean) => Promise<boolean> }>(
      EDITOR_CONSTANTS.SERVICE_NAMES.PERSISTENCE,
      false
    );
    if (!persistenceService) {
      logger.warn('PersistenceService not available');
      return;
    }

    const path = targetPath || activePathRef.current;
    // 暂存区（无路径）转另存为
    if (!path || path.startsWith(EDITOR_CONSTANTS.UNTITLED_PREFIX)) {
      return saveAs();
    }

    const resolvedContent = resolveContent(contentRef.current);
    await persistenceService.saveFile(path, resolvedContent, false);
  }, [kernel, saveAs, resolveContent]);

  // 移除了卸载时同步到 Tab Store 的逻辑
  // 现在由 TabManagerPlugin 自行维护内容同步

  return {
    currentPath: filePath,
    initialContent,
    isUnsaved: isUnsavedStore,
    handleContentUpdate,
    saveFile,
    saveAs,
    fileName: filePath ? filePath.split(/[/\\]/).pop() : EDITOR_CONSTANTS.DEFAULT_FILENAME,
    isLoading,
    loadedPath,
    switchError
  };
}
