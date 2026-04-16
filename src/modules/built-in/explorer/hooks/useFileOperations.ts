import { useState, useCallback } from 'react';
import { useKernel, useService } from '@/kernel/core/KernelContext';
import { useExplorer } from '@/kernel/hooks/useExplorer';
import { useWorkspace } from '@/kernel/hooks/useWorkspace';
import { IFileSystem } from '@/kernel/interfaces/IFileSystem';
import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import { LoggerService } from '@/kernel/services/LoggerService';
import React from 'react';

export function useFileOperations(refreshTree: () => Promise<void>) {
    const kernel = useKernel();
    const fileSystem = useService<IFileSystem>(ServiceId.FILE_SYSTEM, false);
    const loggerService = useService<LoggerService>(ServiceId.LOGGER, false);
    const logger = React.useMemo(() => loggerService?.createLogger('FileOperations'), [loggerService]);

    const { editingNode, stopEditing } = useExplorer();
    const { projectRoot } = useWorkspace();

    const [messageDialog, setMessageDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'info' | 'warning' | 'error';
    }>({ isOpen: false, title: '', message: '', type: 'info' });

    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        onConfirm: () => Promise<void>;
        isDanger?: boolean;
    } | null>(null);

    // === Bug 1 修复与重命名核心逻辑 ===
    const handleConfirmRename = useCallback(async (name: string) => {
        if (!name.trim() || !editingNode || !fileSystem) {
            stopEditing();
            return;
        }

        const { path, type } = editingNode;

        // 1. 如果名字没变，直接停止
        if (type === 'rename' && path.endsWith(name)) {
            stopEditing();
            return;
        }

        stopEditing();

        try {
            if (type === 'rename') {
                const dir = await fileSystem.getDirname(path);
                const newPath = await fileSystem.pathJoin(dir, name);

                // === 关键：增强型碰撞预检 (应对 Windows 大小写不敏感) ===
                const exists = await fileSystem.checkExists(newPath);
                // 特殊处理：如果是 a.md -> A.md，exists 会返回 true。
                // 我们需要通过路径字符串比较来判断是否是真的“冲突”还是仅仅是“改大小写”
                const normalizedNew = newPath.toLowerCase();
                const normalizedOld = path.toLowerCase();

                // [Rename Debug] 诊断重命名碰撞检测
                logger?.info('Rename validation:', { oldPath: path, newPath, exists, normalizedNew, normalizedOld, shouldBlock: exists && normalizedNew !== normalizedOld });

                if (exists && normalizedNew !== normalizedOld) {
                    setMessageDialog({
                        isOpen: true,
                        title: '提示',
                        message: `文件或文件夹 "${name}" 已存在，请使用其他名称`,
                        type: 'warning'
                    });
                    return;
                }

                await fileSystem.rename(path, newPath);
                kernel.emit(CoreEvents.FILE_MOVED, { oldPath: path, newPath });

            } else if (type === 'create-file' || type === 'create-folder') {
                const fullName = (type === 'create-file' && !name.endsWith('.md')) ? `${name}.md` : name;
                const newPath = await fileSystem.pathJoin(path, fullName);
                logger?.info('Create target resolved', {
                    type,
                    parentPath: path,
                    inputName: name,
                    fullName,
                    newPath,
                });

                if (await fileSystem.checkExists(newPath)) {
                    setMessageDialog({ isOpen: true, title: '提示', message: '该名称已存在', type: 'warning' });
                    return;
                }

                if (type === 'create-file') {
                    const result = await fileSystem.createFile(newPath, '');
                    if (!result?.success) {
                        logger?.error('Create file failed', {
                            path: newPath,
                            error: result?.error || 'unknown',
                        });
                        setMessageDialog({
                            isOpen: true,
                            title: '错误',
                            message: result?.error || '文件创建失败',
                            type: 'error'
                        });
                        return;
                    }

                    await refreshTree();
                    kernel.emit(CoreEvents.OPEN_FILE, newPath);
                } else {
                    const result = await fileSystem.createDirectory(newPath);
                    if (!result?.success) {
                        logger?.error('Create directory failed', {
                            path: newPath,
                            error: result?.error || 'unknown',
                        });
                        setMessageDialog({
                            isOpen: true,
                            title: '错误',
                            message: result?.error || '文件夹创建失败',
                            type: 'error'
                        });
                        return;
                    }

                    await refreshTree();
                }
                return;
            }
        } catch (e) {
            logger?.error("FS Error:", e);
            setMessageDialog({ isOpen: true, title: '错误', message: '操作失败', type: 'error' });
        }

        await refreshTree();
    }, [editingNode, stopEditing, fileSystem, kernel, refreshTree]);

    const handleDelete = useCallback(async (paths: string[], permanent: boolean = false, onComplete?: () => void) => {
        if (!paths.length) return;
        setConfirmDialog({
            isOpen: true,
            title: permanent ? '⚠️ 永久删除确认' : '删除确认',
            description: permanent
                ? `确实要永久删除选中的 ${paths.length} 个项目吗？文件将不会进入回收站，此操作不可恢复！`
                : `确实要删除选中的 ${paths.length} 个项目吗？此操作不可撤销。`,
            isDanger: true,
            onConfirm: async () => {
                if (!fileSystem) return;
                for (const p of paths) {
                    await fileSystem.delete(p, !permanent);
                }
                setConfirmDialog(null);
                await refreshTree();
                // 关闭已删除文件的标签页，防止残留内容
                kernel.emit(CoreEvents.CHECK_TABS_EXISTENCE);
                onComplete?.();
            }
        });
    }, [fileSystem, refreshTree, kernel]);

    const handleMove = useCallback(async (src: string, dest: string) => {
        if (src === dest || !fileSystem) return;
        const fileName = src.split(/[\\/]/).pop() || '';
        const destPath = await fileSystem.pathJoin(dest, fileName);
        if (src === destPath) return;

        const exists = await fileSystem.checkExists(destPath);
        if (exists) {
            setConfirmDialog({
                isOpen: true,
                title: '文件冲突',
                description: `目标位置已存在 "${fileName}"。点击确认将覆盖原有文件。`,
                isDanger: true,
                onConfirm: async () => {
                    setConfirmDialog(null);
                    if (fileSystem) {
                        // 先关闭被覆盖文件的标签页，避免重复标签
                        kernel.emit(CoreEvents.FILE_OVERWRITTEN, destPath);
                        await fileSystem.move(src, destPath);
                        kernel.emit(CoreEvents.FILE_MOVED, { oldPath: src, newPath: destPath });
                        await refreshTree();
                    }
                }
            });
            return;
        }

        await fileSystem.move(src, destPath);
        kernel.emit(CoreEvents.FILE_MOVED, { oldPath: src, newPath: destPath });
        await refreshTree();
    }, [fileSystem, kernel, refreshTree]);

    return {
        handleConfirmRename,
        handleDelete,
        handleMove,
        messageDialog,
        setMessageDialog,
        confirmDialog,
        setConfirmDialog
    };
}
