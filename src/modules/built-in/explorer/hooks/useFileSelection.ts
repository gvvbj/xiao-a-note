import { useState, useRef, useCallback } from 'react';
import { UI_CONSTANTS } from '@/shared/constants/UIConstants';
import { useExplorer } from '@/kernel/hooks/useExplorer';
import { FileNode } from '@/kernel/services/ExplorerService';
import { useWorkspace } from '@/kernel/hooks/useWorkspace';
import { useKernel } from '@/kernel/core/KernelContext';
import { flattenTree } from '../utils/treeUtils';
import { CoreEvents } from '@/kernel/core/Events';

export function useFileSelection(fileTree: FileNode[], containerRef: React.RefObject<HTMLDivElement | null>) {
    const kernel = useKernel();
    const {
        selectedPaths, lastFocusedPath, expandedPaths,
        toggleSelection, setSelection, selectPath, setExpanded, clearSelection
    } = useExplorer();

    const { selectedFilePath: activeTabId } = useWorkspace();

    const [selectionBox, setSelectionBox] = useState<{
        startX: number;
        startY: number;
        currentX: number;
        currentY: number;
        containerRect: DOMRect;
    } | null>(null);

    const isSelectingRef = useRef(false);

    // === 核心：节点点击逻辑 ===
    const handleNodeClick = useCallback((e: React.MouseEvent, node: FileNode) => {
        e.stopPropagation();

        if (e.ctrlKey || e.metaKey) {
            toggleSelection(node.path);
        } else if (e.shiftKey && lastFocusedPath) {
            const flatList = flattenTree(fileTree, expandedPaths);
            const lastIdx = flatList.findIndex(n => n.path === lastFocusedPath);
            const currIdx = flatList.findIndex(n => n.path === node.path);

            if (lastIdx !== -1 && currIdx !== -1) {
                const start = Math.min(lastIdx, currIdx);
                const end = Math.max(lastIdx, currIdx);
                const newSelection = new Set<string>();
                for (let i = start; i <= end; i++) {
                    newSelection.add(flatList[i].path);
                }
                setSelection(newSelection, node.path);
            }
        } else {
            selectPath(node.path);
            if (node.isDirectory) {
                setExpanded(node.path, !expandedPaths.has(node.path));
            } else {
                if (activeTabId) {
                    kernel.emit(CoreEvents.REQUEST_SAVE_CURSOR, activeTabId);
                }
                kernel.emit(CoreEvents.OPEN_FILE, node.path);
            }
        }

        // [UX] 确保焦点留在文件树容器，以便后续键盘快捷键（Delete/Ctrl+C 等）可生效
        containerRef.current?.focus();
    }, [fileTree, expandedPaths, lastFocusedPath, toggleSelection, setSelection, selectPath, setExpanded, activeTabId, kernel, containerRef]);

    // === 核心：拖拽框选逻辑 ===
    const handleSelectionMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return;
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.closest('button')) return;
        if (target.closest('[data-file-path]')) return;

        const container = containerRef.current;
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        const startX = e.clientX - containerRect.left + container.scrollLeft;
        const startY = e.clientY - containerRect.top + container.scrollTop;

        isSelectingRef.current = true;
        setSelectionBox({
            startX,
            startY,
            currentX: startX,
            currentY: startY,
            containerRect
        });

        if (!e.ctrlKey && !e.shiftKey && !e.metaKey) {
            clearSelection();
        }

        // [UX] 确保焦点在文件树容器上，以便后续键盘操作可用
        containerRef.current?.focus();
        e.preventDefault();
    }, [containerRef, clearSelection]);

    const handleSelectionMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isSelectingRef.current || !selectionBox) return;

        const container = containerRef.current;
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        const currentX = e.clientX - containerRect.left + container.scrollLeft;
        const currentY = e.clientY - containerRect.top + container.scrollTop;

        setSelectionBox(prev => prev ? { ...prev, currentX, currentY, containerRect } : null);

        const left = Math.min(selectionBox.startX, currentX);
        const right = Math.max(selectionBox.startX, currentX);
        const top = Math.min(selectionBox.startY, currentY);
        const bottom = Math.max(selectionBox.startY, currentY);

        const fileNodes = container.querySelectorAll('[data-file-path]');
        const newSelection = new Set<string>();

        fileNodes.forEach((node) => {
            const nodeRect = node.getBoundingClientRect();
            const nodeLeft = nodeRect.left - containerRect.left + container.scrollLeft;
            const nodeTop = nodeRect.top - containerRect.top + container.scrollTop;
            const nodeRight = nodeLeft + nodeRect.width;
            const nodeBottom = nodeTop + nodeRect.height;

            if (left < nodeRight && right > nodeLeft && top < nodeBottom && bottom > nodeTop) {
                const path = node.getAttribute('data-file-path');
                if (path) newSelection.add(path);
            }
        });

        if (e.ctrlKey || e.shiftKey || e.metaKey) {
            const combined = new Set([...Array.from(selectedPaths), ...Array.from(newSelection)]);
            setSelection(combined, null);
        } else {
            setSelection(newSelection, null);
        }
    }, [selectionBox, containerRef, selectedPaths, setSelection]);

    const handleSelectionMouseUp = useCallback(() => {
        isSelectingRef.current = false;
        setSelectionBox(null);
    }, []);

    return {
        handleNodeClick,
        handleSelectionMouseDown,
        handleSelectionMouseMove,
        handleSelectionMouseUp,
        selectionBox
    };
}
