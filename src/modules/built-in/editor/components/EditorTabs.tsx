import React, { useEffect, useRef, useState } from 'react';
import { X, FileText } from 'lucide-react';
import { useKernel } from '@/kernel/core/KernelContext';
import { useKernelEvent } from '@/kernel/hooks/useKernelEvent';
import { useTabs } from '@/kernel/hooks/useTabs';
import { useWorkspace } from '@/kernel/hooks/useWorkspace';
import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import { ITabService } from '@/kernel/interfaces';
import { EditorTab } from '@/kernel/services/TabService';
import { MarkdownBadge } from '@/shared/components/ui/MarkdownBadge';
import { ContextMenu } from '@/shared/components/ui/ContextMenu';
import { SaveConfirmDialog } from '@/shared/components/ui/SaveConfirmDialog';
import { cn } from '@/shared/utils';
import { normalizePath } from '@/shared/utils/path';
import { useTabInteractions } from '../hooks/useTabInteractions';
import { EditorEvents } from '../constants/EditorEvents';

interface TabItemProps {
    tab: EditorTab;
    index: number;
    isActive: boolean;
    isDragging: boolean;
    dragOverIndex: number | null;
    onActivate: () => void;
    onClose: (e: React.MouseEvent) => void;
    onContextMenu: (e: React.MouseEvent) => void;
    onDragStart: (e: React.DragEvent, index: number) => void;
    onDragOver: (e: React.DragEvent, index: number) => void;
    onDragEnd: () => void;
    onDrop: (e: React.DragEvent, index: number) => void;
}

function TabItem({
    tab,
    index,
    isActive,
    isDragging,
    dragOverIndex,
    onActivate,
    onClose,
    onContextMenu,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDrop,
}: TabItemProps) {
    const showDropIndicator = dragOverIndex === index;

    return (
        <div
            draggable
            onClick={onActivate}
            onContextMenu={onContextMenu}
            onDragStart={(e) => onDragStart(e, index)}
            onDragOver={(e) => onDragOver(e, index)}
            onDragEnd={onDragEnd}
            onDrop={(e) => onDrop(e, index)}
            data-active={isActive}
            data-dirty={tab.isDirty}
            data-testid="editor-tab"
            className={cn(
                'group relative mb-[-1px] flex max-w-[180px] min-w-[100px] shrink-0 select-none items-center gap-2 rounded-t-lg border-x border-t border-transparent px-3 py-1.5 transition-all',
                isActive
                    ? 'z-10 border-border/40 bg-editor-background text-foreground shadow-sm'
                    : 'mt-0.5 text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5',
                isDragging && 'opacity-50',
                showDropIndicator && 'border-l-2 border-l-primary'
            )}
        >
            {/\.(md|markdown)$/i.test(tab.name) ? (
                <MarkdownBadge />
            ) : (
                <FileText className="h-4 w-4 shrink-0 text-primary/70" />
            )}
            <span className="flex-1 truncate text-sm">
                {tab.isDirty && (
                    <span className="mr-0.5 text-primary" style={{ fontSize: '8px', lineHeight: 1 }}>
                        ●
                    </span>
                )}
                {tab.name}
            </span>
            <button
                onClick={onClose}
                className={cn(
                    'shrink-0 rounded p-0.5 transition-colors hover:bg-gray-200 dark:hover:bg-zinc-700',
                    isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                )}
            >
                <X className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}

export function EditorTabs() {
    const kernel = useKernel();
    const tabService = kernel.getService<ITabService>(ServiceId.TAB, false);
    const { setSelectedFilePath } = useWorkspace();
    const { state, actions } = useTabInteractions();
    const { tabs, activeTabId, contextMenu, draggedIndex, dragOverIndex } = state;
    const { handleActivate, setContextMenu, onDragStart, onDragOver, onDrop, onDragEnd, getContextMenuItems, closeTab } = actions;
    const [closeConfirm, setCloseConfirm] = useState<{ tabId: string; tabName: string } | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const lastActiveTabId = useRef<string | null>(null);
    const pendingCloseRef = useRef<string | null>(null);

    useKernelEvent(CoreEvents.FILE_SAVED, (path: string) => {
        if (pendingCloseRef.current && normalizePath(path) === normalizePath(pendingCloseRef.current)) {
            closeTab(pendingCloseRef.current);
            pendingCloseRef.current = null;
        }
    });

    useEffect(() => {
        const liveActiveTabId = tabService?.getActiveTabId() ?? null;
        const liveTabsLength = tabService?.getTabs().length ?? 0;
        const normalizeMaybePath = (path: string | null) => (path ? normalizePath(path) : null);

        // 冷启动文件关联场景中，首次渲染可能仍持有旧标签快照。
        // 只有当当前 UI 快照与 TabService 实时状态一致时，才允许回流 OPEN_FILE。
        if (normalizeMaybePath(liveActiveTabId) !== normalizeMaybePath(activeTabId)) {
            return;
        }

        if (activeTabId && tabs.length > 0) {
            const activeTab = tabs.find((tab) => tab.id === activeTabId);
            if (activeTab) {
                kernel.emit(EditorEvents.OPEN_FILE, activeTab.path);
            }
            return;
        }

        if (tabs.length === 0 && liveTabsLength === 0) {
            kernel.emit(EditorEvents.OPEN_FILE, null);
        }
    }, [activeTabId, tabs, kernel, tabService]);

    useEffect(() => {
        setSelectedFilePath(activeTabId);
    }, [activeTabId, setSelectedFilePath]);

    useEffect(() => {
        if (activeTabId && activeTabId !== lastActiveTabId.current) {
            const el = containerRef.current?.querySelector('[data-active="true"]') as HTMLElement | null;
            if (el) {
                el.scrollIntoView({
                    behavior: lastActiveTabId.current === null ? 'auto' : 'smooth',
                    block: 'nearest',
                    inline: 'center',
                });
            }
            lastActiveTabId.current = activeTabId;
        }
    }, [activeTabId]);

    return (
        <div
            ref={containerRef}
            className="custom-scrollbar flex h-9 items-end overflow-x-auto overflow-y-hidden border-b border-border/40 bg-editor-tabs-background px-2"
        >
            {tabs.map((tab, index) => (
                <TabItem
                    key={tab.id}
                    tab={tab}
                    index={index}
                    isActive={tab.id === activeTabId}
                    isDragging={draggedIndex === index}
                    dragOverIndex={dragOverIndex}
                    onActivate={() => handleActivate(tab)}
                    onClose={(e) => {
                        e.stopPropagation();
                        if (tab.isDirty) {
                            setCloseConfirm({ tabId: tab.id, tabName: tab.name });
                            return;
                        }
                        closeTab(tab.id);
                    }}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        setContextMenu({ x: e.clientX, y: e.clientY, tabId: tab.id });
                    }}
                    onDragStart={onDragStart}
                    onDragOver={onDragOver}
                    onDragEnd={onDragEnd}
                    onDrop={onDrop}
                />
            ))}

            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    items={getContextMenuItems(contextMenu.tabId)}
                    onClose={() => setContextMenu(null)}
                />
            )}

            {closeConfirm && (
                <SaveConfirmDialog
                    isOpen={!!closeConfirm}
                    title="关闭未保存的文件"
                    description={`文件 "${closeConfirm.tabName}" 已修改，是否在关闭前保存？`}
                    onSave={() => {
                        pendingCloseRef.current = closeConfirm.tabId;
                        kernel.emit(EditorEvents.SAVE_FILE_REQUEST, { path: closeConfirm.tabId });
                        setCloseConfirm(null);
                    }}
                    onDontSave={() => {
                        closeTab(closeConfirm.tabId);
                        setCloseConfirm(null);
                    }}
                    onCancel={() => setCloseConfirm(null)}
                />
            )}
        </div>
    );
}
