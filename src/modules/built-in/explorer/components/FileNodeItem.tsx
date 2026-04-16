import React, { useState, useRef, useEffect } from 'react';
import { FileText, Folder, FolderOpen, File as FileIcon } from 'lucide-react';
import { MarkdownBadge } from '@/shared/components/ui/MarkdownBadge';
import { cn } from '@/shared/utils';
import { useExplorer } from '@/kernel/hooks/useExplorer';
import { FileNode } from '@/kernel/services/ExplorerService';
import { useWorkspace } from '@/kernel/hooks/useWorkspace';

interface FileNodeItemProps {
    node: FileNode;
    level: number;
    onClick: (e: React.MouseEvent, node: FileNode) => void;
    onContextMenu: (e: React.MouseEvent, node: FileNode) => void;
    onConfirmEdit: (value: string) => void;
    onMove: (src: string, dest: string) => void;
    // 通过 Props 接收状态，消除重复监听导致的内层泄露警告
    selectedPaths: Set<string>;
    expandedPaths: Set<string>;
    editingNode: { path: string, type: 'rename' | 'create-file' | 'create-folder' } | null;
    selectionDismissed: boolean;
    stopEditing: () => void;
}

export const FileNodeItem = ({
    node, level, onClick, onContextMenu, onConfirmEdit, onMove,
    selectedPaths, expandedPaths, editingNode, selectionDismissed, stopEditing
}: FileNodeItemProps) => {
    const { selectedFilePath: activeTabId } = useWorkspace();

    const normalize = (p: string | null) => p ? p.replace(/\\/g, '/').toLowerCase() : null;
    const isActivePath = normalize(activeTabId) === normalize(node.path);
    const isExplorerSelected = selectedPaths.has(node.path);
    // 显式选中优先；未取消选中时，活跃标签也高亮
    const isSelected = isExplorerSelected || (isActivePath && !selectionDismissed);
    const isExpanded = expandedPaths.has(node.path);
    const isRenaming = editingNode?.type === 'rename' && normalize(editingNode.path) === normalize(node.path);
    const isCreatingChild = (editingNode?.type === 'create-file' || editingNode?.type === 'create-folder') && normalize(editingNode.path) === normalize(node.path);

    const [editValue, setEditValue] = useState(node.name);
    const [newChildValue, setNewChildValue] = useState("");

    const inputRef = useRef<HTMLInputElement>(null);
    const newChildInputRef = useRef<HTMLInputElement>(null);

    // === 核心修复：提交锁 ===
    // 用于解决 Enter 和 Blur 事件的冲突
    const isSubmitting = useRef(false);

    // 初始化聚焦
    useEffect(() => {
        if (isRenaming && inputRef.current) {
            isSubmitting.current = false; // 重置锁
            inputRef.current.focus();
            inputRef.current.select();
        }
        if (isCreatingChild && newChildInputRef.current) {
            isSubmitting.current = false; // 重置锁
            newChildInputRef.current.focus();
            setNewChildValue("");
        }
    }, [isRenaming, isCreatingChild]);

    // 处理键盘事件 (Enter / Escape)
    const handleKeyDown = (e: React.KeyboardEvent, isNewChild: boolean) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();

            // 1. 上锁：告诉 Blur 事件 "我是提交，别乱动"
            isSubmitting.current = true;

            // 2. 执行提交
            onConfirmEdit(isNewChild ? newChildValue : editValue);
        } else if (e.key === 'Escape') {
            // Escape 视为取消
            e.preventDefault();
            e.stopPropagation();
            stopEditing();
        }
    };

    // 处理失去焦点事件 (Blur)
    const handleBlur = () => {
        // 如果正在提交中 (Enter键触发)，忽略 Blur，防止重复逻辑或打断提交
        if (isSubmitting.current) {
            return;
        }

        // 否则，视为用户点击了别处（取消操作），立即停止编辑
        // 不需要 setTimeout，响应更快，且不会有竞态问题
        stopEditing();
    };

    // 拖拽逻辑 (保持不变)
    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('text/plain', node.path);
        e.dataTransfer.effectAllowed = 'move';
    };
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (node.isDirectory) {
            e.dataTransfer.dropEffect = 'move';
            e.currentTarget.classList.add('bg-blue-100', 'dark:bg-blue-900/30');
        }
    };
    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        e.currentTarget.classList.remove('bg-blue-100', 'dark:bg-blue-900/30');
    };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        e.currentTarget.classList.remove('bg-blue-100', 'dark:bg-blue-900/30');
        const srcPath = e.dataTransfer.getData('text/plain');
        if (!srcPath || !node.isDirectory) return;

        // 如果拖拽的文件是多选的一部分，移动所有选中的文件
        if (selectedPaths.has(srcPath) && selectedPaths.size > 1) {
            // 移动所有选中的文件
            selectedPaths.forEach(path => {
                if (path !== node.path) { // 不能把文件夹移动到自身
                    onMove(path, node.path);
                }
            });
        } else {
            // 单个文件移动
            onMove(srcPath, node.path);
        }
    };

    return (
        <div>
            <div
                data-file-path={node.path}
                className={cn(
                    "group flex items-center gap-2 py-1 px-2 cursor-pointer select-none text-sm transition-all border-none mx-2 rounded-md",
                    isSelected
                        ? "bg-sidebar-active text-foreground font-medium shadow-sm"
                        : "hover:bg-sidebar-hover text-muted-foreground hover:text-foreground"
                )}
                style={{ paddingLeft: `${level * 12 + 12}px` }}
                onClick={(e) => onClick(e, node)}
                onContextMenu={(e) => onContextMenu(e, node)}
                draggable
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <span className="opacity-80 shrink-0">
                    {node.isDirectory ? (
                        isExpanded ? <FolderOpen className="w-4 h-4 text-primary" /> : <Folder className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    ) : (
                        /\.(md|markdown)$/i.test(node.name) ? (
                            <MarkdownBadge className="mr-0" />
                        ) : (
                            <FileIcon className="w-4 h-4 text-muted-foreground/80" />
                        )
                    )}
                </span>

                {isRenaming ? (
                    <input
                        ref={inputRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, false)}
                        onBlur={handleBlur}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 min-w-0 bg-white dark:bg-zinc-950 border border-blue-500 rounded px-1 text-sm outline-none h-6 focus:ring-1 focus:ring-blue-500"
                    />
                ) : (
                    <span className="truncate flex-1">{node.name}</span>
                )}
            </div>

            {isExpanded && node.children && (
                <div>
                    {isCreatingChild && (
                        <div className="flex items-center gap-2 py-1 px-2 text-sm pl-8 animate-in fade-in slide-in-from-top-1 duration-150" style={{ paddingLeft: `${(level + 1) * 12 + 12}px` }}>
                            <span className="opacity-70">
                                {editingNode?.type === 'create-folder' ? <Folder className="w-4 h-4 text-blue-500" /> : <FileIcon className="w-4 h-4 text-gray-500" />}
                            </span>
                            <input
                                ref={newChildInputRef}
                                value={newChildValue}
                                onChange={(e) => setNewChildValue(e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, true)}
                                onBlur={handleBlur}
                                onClick={(e) => e.stopPropagation()} // [UX] 防止冒泡
                                placeholder="Name..."
                                className="flex-1 min-w-0 bg-white dark:bg-zinc-950 border border-blue-500 rounded px-1 text-sm outline-none h-6 focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    )}
                    {node.children.map(child => (
                        <FileNodeItem
                            key={child.path}
                            node={child}
                            level={level + 1}
                            onClick={onClick}
                            onContextMenu={onContextMenu}
                            onConfirmEdit={onConfirmEdit}
                            onMove={onMove}
                            selectedPaths={selectedPaths}
                            expandedPaths={expandedPaths}
                            editingNode={editingNode}
                            selectionDismissed={selectionDismissed}
                            stopEditing={stopEditing}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
