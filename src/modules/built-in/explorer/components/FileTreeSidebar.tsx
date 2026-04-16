import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { UI_CONSTANTS } from '@/shared/constants/UIConstants';
import { useExplorer } from '@/kernel/hooks/useExplorer';
import { FileNode } from '@/kernel/services/ExplorerService';
import { useKernel, useService } from '@/kernel/core/KernelContext';
import { IFileSystem } from '@/kernel/interfaces/IFileSystem';
import { FolderPlus, FilePlus, RefreshCw, FolderOpen, File as FileIcon, Folder } from 'lucide-react';
import { FileNodeItem } from './FileNodeItem';
import { ContextMenu, MenuItem } from '@/shared/components/ui/ContextMenu';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { MoveToDialog } from './MoveToDialog';
import { MessageDialog } from '@/shared/components/ui/MessageDialog';
import { useWorkspace } from '@/kernel/hooks/useWorkspace';
import { useFileOperations } from '../hooks/useFileOperations';
import { useFileSelection } from '../hooks/useFileSelection';
import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import { EDITOR_CONSTANTS } from '../../editor/constants/EditorConstants';
import { FILE_CHANGE_CLASSIFICATION_SERVICE_ID, IFileChangeClassificationService } from '@/modules/interfaces';

export function FileTreeSidebar() {
    // 1. Store 数据流 (收拢至 ExplorerService)
    const {
        fileTree, selectedPaths, lastFocusedPath, editingNode, expandedPaths, selectionDismissed,
        setFileTree, startEditing, stopEditing, clearSelection, setExpanded, selectPath
    } = useExplorer();

    // 关键：Bug 2 修复 - 统一从 workspace 获取 root
    const { projectRoot, setProjectRoot, selectedFilePath } = useWorkspace();

    const kernel = useKernel();
    const fileSystem = useService<IFileSystem>(ServiceId.FILE_SYSTEM);
    const fileChangeClassificationService = useService<IFileChangeClassificationService>(FILE_CHANGE_CLASSIFICATION_SERVICE_ID, false);
    const fileTreeContainerRef = useRef<HTMLDivElement>(null);
    const rootInputRef = useRef<HTMLInputElement>(null);
    const isRootSubmittingRef = useRef(false);
    const [rootNewValue, setRootNewValue] = useState("");
    const normalizePath = useCallback((p: string | null) => p ? p.replace(/\\/g, '/').toLowerCase() : null, []);

    // 刷新逻辑 (使用最新的 projectRoot)
    const refreshTree = useCallback(async () => {
        if (!projectRoot) {
            setFileTree([]);
            return;
        }
        // [FIXED] 移除 setFileTree([]) 的强制清空，实现“原地更新”消除闪烁
        const tree = await fileSystem?.readDirectoryTree(projectRoot);
        if (tree) setFileTree(tree);
    }, [fileSystem, setFileTree, projectRoot]);

    // 监听根目录变化，立即执行刷新并清空旧数据
    useEffect(() => {
        refreshTree();
    }, [projectRoot, refreshTree]);

    // 标签页切换时自动展开文件所在的祖先目录（修复折叠子目录不展开的 Bug）
    // 通过在文件树中递归查找节点来获取原始格式的祖先路径，
    // 避免 TabService 归一化路径与 OS 原始路径格式不匹配
    useEffect(() => {
        if (!selectedFilePath || selectedFilePath.startsWith(EDITOR_CONSTANTS.UNTITLED_PREFIX)) return;
        if (!fileTree.length) return;

        // 归一化函数（与 TabService 一致）
        const targetNormalized = normalizePath(selectedFilePath);

        // 在文件树中递归查找目标节点，收集沿途的祖先目录路径（原始格式）
        const findAncestors = (nodes: FileNode[], ancestors: string[]): string[] | null => {
            for (const node of nodes) {
                if (normalizePath(node.path) === targetNormalized) {
                    return ancestors; // 找到目标，返回祖先路径
                }
                if (node.isDirectory && node.children) {
                    const result = findAncestors(node.children, [...ancestors, node.path]);
                    if (result) return result;
                }
            }
            return null; // 未找到
        };

        const ancestors = findAncestors(fileTree, []);
        if (ancestors) {
            // 批量展开所有祖先目录（使用原始路径格式）
            for (const ancestorPath of ancestors) {
                setExpanded(ancestorPath, true);
            }
        }
    }, [selectedFilePath, fileTree, setExpanded, normalizePath]);

    // 业务逻辑集 (重命名覆盖修复在这里)
    const {
        handleConfirmRename, handleDelete, handleMove,
        messageDialog, setMessageDialog,
        confirmDialog, setConfirmDialog
    } = useFileOperations(refreshTree);

    // 交互逻辑集 (框选、连选)
    const {
        handleNodeClick, handleSelectionMouseDown, handleSelectionMouseMove, handleSelectionMouseUp,
        selectionBox
    } = useFileSelection(fileTree, fileTreeContainerRef);

    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, items: MenuItem[] } | null>(null);
    const [moveDialog, setMoveDialog] = useState<{ isOpen: boolean, targets: string[] } | null>(null);

    // [Feature] 文件树剪贴板
    const clipboardRef = useRef<{ paths: string[], mode: 'copy' | 'cut' } | null>(null);

    /** 根据当前选中状态推断粘贴目标目录 */
    const resolveTargetDirectory = useCallback((): string | null => {
        if (!projectRoot) return null;
        if (selectedPaths.size === 0) return projectRoot;

        const firstSelected = Array.from(selectedPaths)[0];
        // 判断是否为目录：含扩展名视为文件
        const isFile = firstSelected.split(/[\\/]/).pop()?.includes('.');
        if (isFile) {
            const separator = firstSelected.includes('\\') ? '\\' : '/';
            const parts = firstSelected.split(/[\\/]/);
            parts.pop();
            return parts.join(separator);
        }
        return firstSelected;
    }, [projectRoot, selectedPaths]);

    /** 粘贴操作 */
    const handlePaste = useCallback(async () => {
        const clipboard = clipboardRef.current;
        if (!clipboard || !clipboard.paths.length || !fileSystem) return;

        const targetDir = resolveTargetDirectory();
        if (!targetDir) return;

        if (clipboard.mode === 'cut') {
            // 剪切：移动文件
            for (const src of clipboard.paths) {
                await handleMove(src, targetDir);
            }
            clipboardRef.current = null; // 剪切后清空剪贴板
        } else {
            // 复制：生成副本
            for (const src of clipboard.paths) {
                const fileName = src.split(/[\\/]/).pop() || '';
                const dotIdx = fileName.lastIndexOf('.');
                const baseName = dotIdx > 0 ? fileName.substring(0, dotIdx) : fileName;
                const ext = dotIdx > 0 ? fileName.substring(dotIdx) : '';

                // 查找可用的 copy 编号
                let copyNum = 1;
                let destPath: string;
                do {
                    const newName = `${baseName} copy${copyNum}${ext}`;
                    destPath = await fileSystem.pathJoin(targetDir, newName);
                    copyNum++;
                } while (await fileSystem.checkExists(destPath));

                await fileSystem.copy(src, destPath);
            }
        }
        await refreshTree();
    }, [fileSystem, resolveTargetDirectory, handleMove, refreshTree]);

    // === 3. 生命周期与事件 ===

    // 监听文件系统变动
    useEffect(() => {
        if (!projectRoot) return;
        fileSystem?.watch(projectRoot);

        let timeout: NodeJS.Timeout;
        const pendingEvents: Array<{ eventType?: string; filename?: string }> = [];
        const handler = (data?: { eventType?: string; filename?: string }) => {
            pendingEvents.push(data ?? {});
            clearTimeout(timeout);
            timeout = setTimeout(async () => {
                await refreshTree();
                kernel.emit(CoreEvents.CHECK_TABS_EXISTENCE);

                const eventsToProcess = pendingEvents.splice(0);
                const rawChanges = await Promise.all(eventsToProcess.map(async (event) => {
                    const rawFilename = typeof event.filename === 'string' ? event.filename.trim() : '';
                    if (!rawFilename) return null;

                    const changedPath = await fileSystem?.pathJoin(projectRoot, rawFilename);
                    if (!changedPath) return null;
                    const exists = await fileSystem?.checkExists(changedPath);
                    return {
                        changedPath,
                        eventType: event.eventType,
                        exists: !!exists,
                    };
                }));

                const effectiveChanges = rawChanges.filter((change): change is NonNullable<typeof change> => change !== null);
                if (!effectiveChanges.length) return;
                fileChangeClassificationService?.consumeWatchChanges(effectiveChanges);
            }, 500);
        };

        // [FIXED] 捕获并返回清理函数，防止监听器分身由于未销毁导致的回跳与竞争
        const unwatch = fileSystem?.onWatchEvent(handler);
        return () => {
            clearTimeout(timeout);
            unwatch?.();
        };
    }, [projectRoot, fileSystem, refreshTree, kernel, fileChangeClassificationService]);

    // 监听全局路径选择事件 (用于 "Reveal in Explorer")
    useEffect(() => {
        const handler = (path: string) => {
            selectPath(path);
            // 确保所有祖先目录都已展开，而不仅仅是直接父目录
            const separator = path.includes('\\') ? '\\' : '/';
            const parts = path.split(/[\\/]/);
            // 从根目录开始逐层展开
            for (let i = 1; i < parts.length; i++) {
                const ancestorPath = parts.slice(0, i).join(separator);
                if (ancestorPath) {
                    setExpanded(ancestorPath, true);
                }
            }
            // 滚动到该位置 (简单实现)
            requestAnimationFrame(() => {
                const element = document.querySelector(`[data-path="${path}"]`);
                element?.scrollIntoView({ block: 'center', behavior: 'smooth' });
            });
        };
        kernel.on(CoreEvents.EXPLORER_SELECT_PATH, handler);
        return () => {
            kernel.off(CoreEvents.EXPLORER_SELECT_PATH, handler);
        };
    }, [kernel, selectPath, setExpanded]);

    // 焦点回归
    useEffect(() => {
        if (normalizePath(editingNode?.path ?? null) === normalizePath(projectRoot)) {
            if (!rootInputRef.current) return;
            isRootSubmittingRef.current = false;
            rootInputRef.current.focus();
            setRootNewValue("");
        }
    }, [editingNode, projectRoot, normalizePath]);

    // === 4. UI 动作处理 ===

    const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
        e.preventDefault();
        e.stopPropagation();

        const isSelected = selectedPaths.has(node.path);
        if (!isSelected) {
            // 右键仅用于选中并弹菜单，不应触发左键点击的打开文件/展开目录副作用。
            selectPath(node.path);
        }

        const paths = isSelected ? Array.from(selectedPaths) : [node.path];

        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            items: [
                { label: '打开', onClick: () => kernel.emit(CoreEvents.OPEN_FILE, node.path) },
                { label: '重命名', onClick: () => startEditing(node.path, 'rename') },
                { divider: true },
                {
                    label: '新建文件', onClick: () => {
                        const target = node.isDirectory ? node.path : node.path.substring(0, node.path.lastIndexOf(node.path.includes('\\') ? '\\' : '/'));
                        startEditing(target, 'create-file');
                    }
                },
                {
                    label: '新建文件夹', onClick: () => {
                        const target = node.isDirectory ? node.path : node.path.substring(0, node.path.lastIndexOf(node.path.includes('\\') ? '\\' : '/'));
                        startEditing(target, 'create-folder');
                    }
                },
                { divider: true },
                { label: '移动到...', onClick: () => setMoveDialog({ isOpen: true, targets: paths }) },
                { label: '导出 PDF', onClick: () => kernel.emit(CoreEvents.APP_CMD_EXPORT_PDF, paths) },
                { label: '导出 Word', onClick: () => kernel.emit(CoreEvents.APP_CMD_EXPORT_WORD, paths) },
                { label: '删除', danger: true, onClick: () => handleDelete(paths) },
            ]
        });
    };

    const handleCreateInRoot = (type: 'create-file' | 'create-folder') => {
        if (!projectRoot) return;

        // 视觉上高亮的“当前文件”（active tab 投影到 Explorer）也应作为可用上下文，
        // 但其优先级必须低于 Explorer 显式选中项，否则会覆盖用户刚点击的目录/文件。
        const activeVisiblePath =
            (!selectionDismissed && selectedFilePath && !selectedFilePath.startsWith(EDITOR_CONSTANTS.UNTITLED_PREFIX))
                ? selectedFilePath
                : null;
        const hasSelectedPath = (path: string) => Array.from(selectedPaths).some(selected => normalizePath(selected) === normalizePath(path));

        let contextPath: string | null = null;
        if (selectedPaths.size > 0) {
            // 显式选中优先：用户刚在 Explorer 中点选的目录/文件应成为新建目标上下文。
            if (lastFocusedPath && hasSelectedPath(lastFocusedPath)) {
                contextPath = lastFocusedPath;
            } else {
                contextPath = Array.from(selectedPaths)[0];
            }
        } else if (activeVisiblePath) {
            contextPath = activeVisiblePath;
        }

        let targetDir = projectRoot;
        if (contextPath) {
            const isFile = contextPath.split(/[\\/]/).pop()?.includes('.');
            if (isFile) {
                const separator = contextPath.includes('\\') ? '\\' : '/';
                const parts = contextPath.split(/[\\/]/);
                parts.pop();
                targetDir = parts.join(separator);
            } else {
                targetDir = contextPath;
            }
        }

        // 确保目标目录及其祖先目录可见，避免输入框被渲染在折叠分支中“看起来像没弹出”。
        const findAncestors = (nodes: FileNode[], target: string, acc: string[]): { ancestors: string[], matchedPath: string } | null => {
            const targetNorm = normalizePath(target);
            for (const node of nodes) {
                if (normalizePath(node.path) === targetNorm) {
                    return { ancestors: acc, matchedPath: node.path };
                }
                if (node.isDirectory && node.children) {
                    const found = findAncestors(node.children, target, [...acc, node.path]);
                    if (found) return found;
                }
            }
            return null;
        };

        const match = findAncestors(fileTree, targetDir, []);
        if (match) {
            for (const ancestor of match.ancestors) {
                setExpanded(ancestor, true);
            }
            targetDir = match.matchedPath;
        }
        setExpanded(targetDir, true);
        startEditing(targetDir, type);
    };

    const handleRootDrop = (e: React.DragEvent) => {
        if (!projectRoot) return;
        const srcPath = e.dataTransfer.getData('text/plain');
        if (!srcPath) return;

        // [FIXED] 根目录拖拽多选支持
        if (selectedPaths.has(srcPath) && selectedPaths.size > 1) {
            selectedPaths.forEach(path => {
                if (path !== projectRoot) handleMove(path, projectRoot);
            });
        } else {
            handleMove(srcPath, projectRoot);
        }
    };

    const handleRootInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            isRootSubmittingRef.current = true;
            handleConfirmRename(rootNewValue);
            return;
        }

        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            stopEditing();
        }
    };

    const handleRootInputBlur = () => {
        if (isRootSubmittingRef.current) {
            return;
        }

        stopEditing();
    };

    return (
        <div
            data-region={UI_CONSTANTS.REGION.SIDEBAR_FILE_TREE}
            className="h-full flex flex-col select-none bg-sidebar text-sidebar-foreground"
            onClick={() => {
                setContextMenu(null);
                // [UX] 点击侧边栏任何空白区域，立即停止新建/重命名
                if (editingNode) stopEditing();
            }}
        >
            {/* 顶部工具栏 */}
            <div className="h-10 px-3 flex items-center justify-between border-b border-border/40 shrink-0 select-none">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    {projectRoot ? projectRoot.split(/[\\/]/).pop() : 'EXPLORER'}
                </span>
                <div
                    className="flex items-center gap-0.5"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button onClick={async (e) => {
                        e.stopPropagation();
                        const res = await fileSystem?.openDirectory();
                        if (res) setProjectRoot(res.path);
                    }} title="Open Folder" className="p-1 hover:bg-sidebar-hover rounded text-muted-foreground hover:text-foreground transition-colors"><FolderOpen className="w-3.5 h-3.5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleCreateInRoot('create-file'); }} title="New File" className="p-1 hover:bg-sidebar-hover rounded text-muted-foreground hover:text-foreground transition-colors"><FilePlus className="w-3.5 h-3.5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleCreateInRoot('create-folder'); }} title="New Folder" className="p-1 hover:bg-sidebar-hover rounded text-muted-foreground hover:text-foreground transition-colors"><FolderPlus className="w-3.5 h-3.5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); refreshTree(); }} title="Refresh" className="p-1 hover:bg-sidebar-hover rounded text-muted-foreground hover:text-foreground transition-colors"><RefreshCw className="w-3.5 h-3.5" /></button>
                </div>
            </div>

            {/* 文件树区域 */}
            <div
                ref={fileTreeContainerRef}
                tabIndex={-1}
                className="flex-1 overflow-y-auto custom-scrollbar p-2 relative outline-none"
                onDragOver={e => e.preventDefault()}
                onDrop={handleRootDrop}
                onMouseDown={handleSelectionMouseDown}
                onMouseMove={handleSelectionMouseMove}
                onMouseUp={handleSelectionMouseUp}
                onMouseLeave={handleSelectionMouseUp}
                onKeyDown={(e) => {
                    if (editingNode) return; // 编辑模式下不拦截

                    // Delete / Shift+Delete 删除选中文件
                    if (e.key === 'Delete' && selectedPaths.size > 0) {
                        e.preventDefault();
                        handleDelete(Array.from(selectedPaths), e.shiftKey, () => {
                            // 延迟聚焦：等待 CHECK_TABS_EXISTENCE 关闭标签页 + 编辑器切换完成后再抢回焦点
                            setTimeout(() => fileTreeContainerRef.current?.focus(), UI_CONSTANTS.FOCUS_RESTORE_DELAY_MS);
                        });
                        return;
                    }

                    // Ctrl+C 复制
                    if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedPaths.size > 0) {
                        e.preventDefault();
                        clipboardRef.current = { paths: Array.from(selectedPaths), mode: 'copy' };
                        return;
                    }

                    // Ctrl+X 剪切
                    if ((e.ctrlKey || e.metaKey) && e.key === 'x' && selectedPaths.size > 0) {
                        e.preventDefault();
                        clipboardRef.current = { paths: Array.from(selectedPaths), mode: 'cut' };
                        return;
                    }

                    // Ctrl+V 粘贴
                    if ((e.ctrlKey || e.metaKey) && e.key === 'v' && clipboardRef.current) {
                        e.preventDefault();
                        handlePaste();
                        return;
                    }
                }}
            >
                {projectRoot && (
                    <div className="space-y-0.5 min-h-full pb-20">
                        {fileTree.map(node => (
                            <FileNodeItem
                                key={node.path}
                                node={node}
                                level={0}
                                onClick={handleNodeClick}
                                onContextMenu={handleContextMenu}
                                onConfirmEdit={handleConfirmRename}
                                onMove={handleMove}
                                // 状态提升：由顶层统一分发，消除子组件重复订阅
                                selectedPaths={selectedPaths}
                                expandedPaths={expandedPaths}
                                editingNode={editingNode}
                                selectionDismissed={selectionDismissed}
                                stopEditing={stopEditing}
                            />
                        ))}

                        {/* 根目录新建输入框 */}
                        {editingNode && (normalizePath(editingNode.path) === normalizePath(projectRoot)) && (
                            <div className="pl-4 py-1 text-sm flex items-center gap-2">
                                {editingNode.type === 'create-folder' ? <Folder className="w-4 h-4 text-blue-500" /> : <FileIcon className="w-4 h-4 text-gray-500" />}
                                <input
                                    ref={rootInputRef}
                                    value={rootNewValue}
                                    onChange={e => setRootNewValue(e.target.value)}
                                    onKeyDown={handleRootInputKeyDown}
                                    onBlur={handleRootInputBlur}
                                    className="border border-blue-500 rounded px-1 outline-none h-6 bg-transparent w-full"
                                    onClick={(e) => e.stopPropagation()} // 防止冒泡到父容器触发 stopEditing
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* 框选矩形 */}
                {selectionBox && (
                    <div
                        className="absolute bg-blue-500/20 border border-blue-500 pointer-events-none z-40"
                        style={{
                            left: Math.min(selectionBox.startX, selectionBox.currentX),
                            top: Math.min(selectionBox.startY, selectionBox.currentY),
                            width: Math.abs(selectionBox.currentX - selectionBox.startX),
                            height: Math.abs(selectionBox.currentY - selectionBox.startY),
                        }}
                    />
                )}
            </div>

            {/* 弹窗层 */}
            {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextMenu.items} onClose={() => setContextMenu(null)} />}
            {confirmDialog && <ConfirmDialog {...confirmDialog} onCancel={() => { setConfirmDialog(null); fileTreeContainerRef.current?.focus(); }} />}
            {moveDialog && projectRoot && (
                <MoveToDialog
                    isOpen={moveDialog.isOpen}
                    projectRoot={projectRoot}
                    fileTree={fileTree}
                    onConfirm={async (dest) => {
                        for (const src of moveDialog.targets) await handleMove(src, dest);
                        setMoveDialog(null);
                    }}
                    onCancel={() => setMoveDialog(null)}
                />
            )}
            {messageDialog && (
                <MessageDialog
                    isOpen={messageDialog.isOpen}
                    title={messageDialog.title}
                    message={messageDialog.message}
                    type={messageDialog.type}
                    onClose={() => setMessageDialog({ ...messageDialog, isOpen: false })}
                />
            )}
        </div>
    );
}
