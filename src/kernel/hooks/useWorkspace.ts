import { useState, useEffect, useCallback, useMemo } from 'react';
import { useKernel } from '../core/KernelContext';
import { ServiceId } from '../core/ServiceId';
import { WorkspaceService } from '../services/WorkspaceService';
import { CoreEvents } from '../core/Events';

/**
 * useWorkspace - 监听工作区状态变化的 React Hook
 * 
 * 职责:
 * 1. 从内核获取 WorkspaceService
 * 2. 订阅 WORKSPACE_CHANGED 事件
 * 3. 自动同步工作区状态到 React 组件
 * 
 * 遵循原则:
 * - 零 Store: 完全使用 WorkspaceService，不依赖 Zustand
 */
export function useWorkspace() {
    const kernel = useKernel();
    const workspaceService = kernel.getService<WorkspaceService>(ServiceId.WORKSPACE, false);

    // 使用安全的初始值
    const [projectRoot, setProjectRoot] = useState<string | null>(() => workspaceService?.getProjectRoot() || null);
    const [selectedFilePath, setSelectedFilePath] = useState<string | null>(() => workspaceService?.getSelectedFilePath() || null);
    const [hasDirtyFiles, setHasDirtyFiles] = useState<boolean>(() => workspaceService?.getHasDirtyFiles() || false);

    useEffect(() => {
        if (!workspaceService) return;

        // 初始同步
        setProjectRoot(workspaceService.getProjectRoot());
        setSelectedFilePath(workspaceService.getSelectedFilePath());
        setHasDirtyFiles(workspaceService.getHasDirtyFiles());

        // 订阅状态变化
        const handleChanged = (state: { projectRoot: string | null, selectedFilePath: string | null, hasDirtyFiles: boolean }) => {
            setProjectRoot(state.projectRoot);
            setSelectedFilePath(state.selectedFilePath);
            setHasDirtyFiles(state.hasDirtyFiles);
        };

        workspaceService.on(CoreEvents.WORKSPACE_CHANGED, handleChanged);

        return () => {
            workspaceService.off(CoreEvents.WORKSPACE_CHANGED, handleChanged);
        };
    }, [workspaceService]);

    // Setters
    const updateProjectRoot = useCallback((path: string | null) => {
        workspaceService?.setProjectRoot(path);
    }, [workspaceService]);

    const updateSelectedFilePath = useCallback((path: string | null) => {
        workspaceService?.setSelectedFilePath(path);
    }, [workspaceService]);

    const updateHasDirtyFiles = useCallback((dirty: boolean) => {
        workspaceService?.setHasDirtyFiles(dirty);
    }, [workspaceService]);

    return useMemo(() => ({
        projectRoot,
        selectedFilePath,
        hasDirtyFiles,
        setProjectRoot: updateProjectRoot,
        setSelectedFilePath: updateSelectedFilePath,
        setHasDirtyFiles: updateHasDirtyFiles
    }), [
        projectRoot,
        selectedFilePath,
        hasDirtyFiles,
        updateProjectRoot,
        updateSelectedFilePath,
        updateHasDirtyFiles
    ]);
}
