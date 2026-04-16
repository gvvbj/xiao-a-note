import { useState, useEffect, useCallback, useMemo } from 'react';
import { useKernel } from '../core/KernelContext';
import { ServiceId } from '../core/ServiceId';
import { ExplorerService, FileNode, EditingState } from '../services/ExplorerService';
import { CoreEvents } from '../core/Events';

export function useExplorer() {
    const kernel = useKernel();
    const explorerService = kernel.getService<ExplorerService>(ServiceId.EXPLORER, false);

    const [state, setState] = useState({
        fileTree: explorerService ? explorerService.getFileTree() : [],
        selectedPaths: explorerService ? explorerService.getSelectedPaths() : new Set<string>(),
        lastFocusedPath: explorerService ? explorerService.getLastFocusedPath() : null,
        expandedPaths: explorerService ? explorerService.getExpandedPaths() : new Set<string>(),
        editingNode: explorerService ? explorerService.getEditingNode() : null,
        selectionDismissed: explorerService ? explorerService.isSelectionDismissed() : false,
    });

    useEffect(() => {
        if (!explorerService) return;

        const handleExplorerChanged = () => {
            const nextFileTree = explorerService.getFileTree();
            const nextSelected = explorerService.getSelectedPaths();
            const nextLastFocused = explorerService.getLastFocusedPath();
            const nextExpanded = explorerService.getExpandedPaths();
            const nextEditing = explorerService.getEditingNode();
            const nextDismissed = explorerService.isSelectionDismissed();

            // [Jitter/Cycle Prevention] 增加差异判定，切断无限渲染环
            setState(prev => {
                const isSameTree = prev.fileTree === nextFileTree;
                const isSameSelected = prev.selectedPaths.size === nextSelected.size &&
                    Array.from(prev.selectedPaths).every(p => nextSelected.has(p));
                const isSameExpanded = prev.expandedPaths.size === nextExpanded.size &&
                    Array.from(prev.expandedPaths).every(p => nextExpanded.has(p));
                const isSameFocused = prev.lastFocusedPath === nextLastFocused;
                const isSameEditing = prev.editingNode === nextEditing;
                const isSameDismissed = prev.selectionDismissed === nextDismissed;

                if (isSameTree && isSameSelected && isSameExpanded && isSameFocused && isSameEditing && isSameDismissed) {
                    return prev; // 引用及内容关键点未变，保持引用不变以跳过重渲染
                }

                return {
                    fileTree: nextFileTree,
                    selectedPaths: nextSelected,
                    lastFocusedPath: nextLastFocused,
                    expandedPaths: nextExpanded,
                    editingNode: nextEditing,
                    selectionDismissed: nextDismissed,
                };
            });
        };

        explorerService.on(CoreEvents.EXPLORER_CHANGED, handleExplorerChanged);
        return () => {
            explorerService.off(CoreEvents.EXPLORER_CHANGED, handleExplorerChanged);
        };
    }, [explorerService]);

    // 锁定操作函数的物理引用，防止下游组件 (如 FileTreeSidebar) 陷入渲染螺旋
    const setFileTree = useCallback((tree: FileNode[]) => explorerService?.setFileTree(tree), [explorerService]);
    const selectPath = useCallback((path: string) => explorerService?.selectPath(path), [explorerService]);
    const toggleSelection = useCallback((path: string) => explorerService?.toggleSelection(path), [explorerService]);
    const setSelection = useCallback((paths: Set<string>, focused: string | null) =>
        explorerService?.setSelection(paths, focused), [explorerService]);
    const clearSelection = useCallback(() => explorerService?.clearSelection(), [explorerService]);
    const toggleExpand = useCallback((path: string) => explorerService?.toggleExpand(path), [explorerService]);
    const setExpanded = useCallback((path: string, expanded: boolean) =>
        explorerService?.setExpanded(path, expanded), [explorerService]);
    const startEditing = useCallback((path: string, type: EditingState['type']) =>
        explorerService?.startEditing(path, type), [explorerService]);
    const stopEditing = useCallback(() => explorerService?.stopEditing(), [explorerService]);

    // [Performance] 使用 useMemo 汇总结果，确保在 state 未变时，Hook 的返回值保持引用一致性
    return useMemo(() => ({
        ...state,
        setFileTree,
        selectPath,
        toggleSelection,
        setSelection,
        clearSelection,
        toggleExpand,
        setExpanded,
        startEditing,
        stopEditing,
    }), [
        state,
        setFileTree,
        selectPath,
        toggleSelection,
        setSelection,
        clearSelection,
        toggleExpand,
        setExpanded,
        startEditing,
        stopEditing,
    ]);
}
