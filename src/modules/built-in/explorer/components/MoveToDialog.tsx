import React, { useState } from 'react';
import { X, Folder, FolderOpen, Home } from 'lucide-react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/utils';
import { FileNode } from '@/kernel/services/ExplorerService';
import { getFolderTree } from '../utils/treeUtils';

interface MoveToDialogProps {
    isOpen: boolean;
    projectRoot: string;
    fileTree: FileNode[]; // 完整树，组件内部过滤
    onConfirm: (destPath: string) => void;
    onCancel: () => void;
}

// 内部递归组件：只渲染文件夹
const FolderTreeItem = ({ node, level, selectedPath, onSelect }: any) => {
    const isSelected = selectedPath === node.path;
    return (
        <div>
            <div
                className={cn(
                    "flex items-center gap-2 py-1.5 px-2 cursor-pointer select-none text-sm transition-colors rounded-sm",
                    isSelected ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" : "hover:bg-gray-100 dark:hover:bg-zinc-800"
                )}
                style={{ paddingLeft: `${level * 16 + 12}px` }}
                onClick={() => onSelect(node.path)}
            >
                <Folder className={cn("w-4 h-4 text-muted-foreground", isSelected ? "fill-blue-200 text-blue-600" : "")} />
                <span className="truncate text-foreground">{node.name}</span>
            </div>
            {node.children?.map((child: any) => (
                <FolderTreeItem key={child.path} node={child} level={level + 1} selectedPath={selectedPath} onSelect={onSelect} />
            ))}
        </div>
    );
};

export function MoveToDialog({ isOpen, projectRoot, fileTree, onConfirm, onCancel }: MoveToDialogProps) {
    const [selectedPath, setSelectedPath] = useState<string | null>(null);

    if (!isOpen) return null;

    // 过滤出纯文件夹树
    const folderTree = getFolderTree(fileTree);

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-[400px] bg-background dark:bg-zinc-900 border border-border dark:border-zinc-700 rounded-xl shadow-2xl flex flex-col max-h-[80vh]">

                {/* Header */}
                <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">移动至...</h3>
                    <button onClick={onCancel}><X className="w-4 h-4 text-muted-foreground hover:text-foreground" /></button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                    {/* 根目录选项 */}
                    <div
                        className={cn(
                            "flex items-center gap-2 py-2 px-2 cursor-pointer select-none text-sm transition-colors rounded-sm mb-1",
                            selectedPath === projectRoot ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" : "hover:bg-gray-100 dark:hover:bg-zinc-800"
                        )}
                        onClick={() => setSelectedPath(projectRoot)}
                    >
                        <Home className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">项目根目录</span>
                    </div>

                    <div className="h-[1px] bg-border/50 my-1" />

                    {/* 文件夹树 */}
                    {folderTree.map(node => (
                        <FolderTreeItem key={node.path} node={node} level={0} selectedPath={selectedPath} onSelect={setSelectedPath} />
                    ))}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-border/50 flex justify-end gap-2 bg-muted/20">
                    <button onClick={onCancel} className="px-3 py-1.5 text-xs font-medium rounded hover:bg-accent border border-transparent text-foreground">取消</button>
                    <button
                        disabled={!selectedPath}
                        onClick={() => selectedPath && onConfirm(selectedPath)}
                        className="px-3 py-1.5 text-xs font-medium bg-primary text-white rounded shadow-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        移动
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}