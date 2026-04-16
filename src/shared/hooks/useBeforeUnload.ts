import { useEffect, useState, useCallback } from 'react';
import { useWorkspace } from '@/kernel/hooks/useWorkspace';
import { useKernel } from '@/kernel/core/KernelContext';
import { CoreEvents } from '@/kernel/core/Events';

// Types are defined in vite-env.d.ts

interface UseBeforeUnloadResult {
    showConfirmDialog: boolean;
    handleSaveAll: () => void;
    handleConfirm: () => void;
    handleCancel: () => void;
    hasDirtyFiles: boolean;
}

/**
 * Hook to handle exit confirmation for unsaved changes (Issue #11)
 * Listens to Electron's before-close event and shows a confirmation dialog
 * if there are unsaved tabs.
 * 
 * 改用 workspaceStore.hasDirtyFiles，由 TabManagerPlugin 负责同步
 */
export function useBeforeUnload(): UseBeforeUnloadResult {
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const { hasDirtyFiles } = useWorkspace();
    const kernel = useKernel();

    useEffect(() => {
        // 检查 electronAPI 是否可用
        if (!window.electronAPI?.onBeforeClose) return;

        const handleBeforeClose = () => {
            if (hasDirtyFiles) {
                // 有未保存的内容，显示确认对话框
                setShowConfirmDialog(true);
                // 取消关闭等待用户确认
                window.electronAPI.cancelClose();
            } else {
                // 没有未保存的内容，直接关闭
                window.electronAPI.confirmClose();
            }
        };

        const cleanup = window.electronAPI.onBeforeClose(handleBeforeClose);
        return cleanup;
    }, [hasDirtyFiles]);

    // 保存所有文件并关闭
    const handleSaveAll = useCallback(() => {
        setShowConfirmDialog(false);
        // 触发保存所有文件事件
        kernel.emit(CoreEvents.SAVE_ALL_FILES);
        // 延迟关闭以等待保存完成
        setTimeout(() => {
            window.electronAPI?.confirmClose();
        }, 500);
    }, [kernel]);

    // 不保存直接关闭
    const handleConfirm = useCallback(() => {
        setShowConfirmDialog(false);
        // 确认关闭，放弃未保存的内容
        window.electronAPI?.confirmClose();
    }, []);

    const handleCancel = useCallback(() => {
        setShowConfirmDialog(false);
        // 取消关闭，继续编辑
        window.electronAPI?.cancelClose();
    }, []);

    return {
        showConfirmDialog,
        handleSaveAll,
        handleConfirm,
        handleCancel,
        hasDirtyFiles,
    };
}

