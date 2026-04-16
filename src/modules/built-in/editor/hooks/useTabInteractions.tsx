import { useState, useCallback } from 'react';
import { useTabs } from '@/kernel/hooks/useTabs';
import { EditorTab } from '@/kernel/services/TabService';
import { useKernel } from '@/kernel/core/KernelContext';
import { EditorEvents } from '../constants/EditorEvents';
import { X, Columns2, FolderOpen, XCircle } from 'lucide-react';
import { MenuItem } from '@/shared/components/ui/ContextMenu';
import { AppDragType } from '@/shared/constants/AppDragTypes';

/**
 * 标签页交互逻辑 Hook
 */
export function useTabInteractions() {
    const {
        tabs, activeTabId, setActiveTab, closeTab, closeAllTabs, closeOtherTabs, reorderTabs
    } = useTabs();
    const kernel = useKernel();

    // 状态管理
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tabId: string } | null>(null);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    // 激活逻辑
    const handleActivate = useCallback((tab: EditorTab) => {
        if (tab.id === activeTabId) return;

        // 1. 立即发出保存信号
        if (activeTabId) {
            kernel.emit(EditorEvents.REQUEST_SAVE_CURSOR, activeTabId);
            kernel.emit(EditorEvents.REQUEST_SAVE_CONTENT, activeTabId);
        }

        // 2. 同步执行 ID 切换和文件打开
        // React 的自动批处理会确保这些状态更新在同一个渲染周期内高效处理
        setActiveTab(tab.id);
        kernel.emit(EditorEvents.OPEN_FILE, tab.path);
    }, [activeTabId, setActiveTab, kernel]);

    // 拖拽逻辑
    const onDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        const tab = tabs[index];
        e.dataTransfer.setData('text/plain', index.toString());
        if (tab) {
            e.dataTransfer.setData(
                AppDragType.EDITOR_TAB_REFERENCE,
                JSON.stringify({
                    tabId: tab.id,
                    path: tab.path,
                    name: tab.name,
                })
            );
        }
        // Allow tab reordering (move) and AI panel reference drop (copy) in the same drag session.
        e.dataTransfer.effectAllowed = 'copyMove';
    };

    const onDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        setDragOverIndex(index);
    };

    const onDrop = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex !== null && draggedIndex !== index) {
            reorderTabs(draggedIndex, index);
        }
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const onDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    // 右键菜单逻辑
    const getContextMenuItems = (tabId: string): MenuItem[] => [
        {
            label: '在此处打开', icon: FolderOpen, onClick: () => {
                const tab = tabs.find(t => t.id === tabId);
                if (tab) kernel.emit(EditorEvents.REVEAL_IN_EXPLORER, tab.path);
            }
        },
        { label: '关闭', icon: X, onClick: () => closeTab(tabId) },
        { label: '关闭其他', icon: XCircle, onClick: () => closeOtherTabs(tabId) },
        { label: '关闭所有', icon: XCircle, onClick: closeAllTabs }
    ];

    return {
        state: { tabs, activeTabId, contextMenu, draggedIndex, dragOverIndex },
        actions: {
            handleActivate,
            setContextMenu,
            onDragStart,
            onDragOver,
            onDrop,
            onDragEnd,
            getContextMenuItems,
            closeTab
        }
    };
}
