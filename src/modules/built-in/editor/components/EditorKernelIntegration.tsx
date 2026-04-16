/**
 * EditorKernelIntegration.tsx
 * 
 * 职责：
 * 1. 监听 Editor 内部状态 (activeTabId) 并同步到 Shared 层 (workspaceStore)
 * 2. 监听 Kernel 事件 (如 FILE_MOVED) 并调用 Editor 内部方法更新状态
 * 3. 检测无效标签页并清理
 * 
 * 目的：
 * 实现 Editor 模块与 Explorer 模块的解耦。Explorer 不再直接调用 Editor 的 store，
 * 而是通过 workspaceStore 读取状态，通过 Kernel 事件触发操作。
 */

import { useEffect, useCallback } from 'react';
import { useTabs } from '@/kernel/hooks/useTabs';
import { useEditor } from '@/kernel/hooks/useEditor';
import { useWorkspace } from '@/kernel/hooks/useWorkspace';
import { useKernelEvent } from '@/kernel/hooks/useKernelEvent';
import { useService } from '@/kernel/core/KernelContext';
import { IFileSystem } from '@/kernel/interfaces/IFileSystem';
import { EditorEvents } from '../constants/EditorEvents';
import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import { LoggerService } from '@/kernel/services/LoggerService';
import { normalizePath } from '@/shared/utils/path';

export function EditorKernelIntegration() {
    const { activeTabId, updateTabPath, closeTab, openTab, getTabs } = useTabs();
    const fileSystem = useService<IFileSystem>(ServiceId.FILE_SYSTEM);
    const loggerService = useService<LoggerService>(ServiceId.LOGGER, false);
    const logger = loggerService?.createLogger('EditorKernelIntegration');

    // Shared Store (公共状态)
    const { setSelectedFilePath } = useWorkspace();
    const { setCurrentFile, currentFileId } = useEditor();

    // 监听 OPEN_FILE 事件 (由 EditorTabs 或 Explorer 发出)
    // 1. 如果来自 Explorer，需要先打开标签页
    // 2. 然后更新 EditorStore 加载内容
    useKernelEvent(CoreEvents.OPEN_FILE, (path: string | null) => {
        if (path) {
            //获取文件名
            const name = path.split(/[\\/]/).pop() || 'Untitled';
            openTab(path, name); // Ensure tab exists
        }
        setCurrentFile(path);
    });

    // 1. 同步 Active Tab 到 Shared Store
    // 这样 Explorer 就可以通过 workspaceStore 知道当前选中的文件，而不需要依赖 editorTabsStore
    useEffect(() => {
        // activeTabId 即为 filePath (归一化后)
        setSelectedFilePath(activeTabId);
    }, [activeTabId, setSelectedFilePath]);

    // 2. 监听文件移动/重命名事件
    // Explorer 移动文件后发射此事件，Editor 响应更新标签页路径
    useKernelEvent(EditorEvents.FILE_MOVED, (payload: { oldPath: string, newPath: string }) => {
        logger?.info('Received FILE_MOVED:', payload);
        updateTabPath(payload.oldPath, payload.newPath);

        // 重命名当前正在编辑的文件时，同步更新 EditorService 当前路径，
        // 否则后续保存仍会命中旧路径（磁盘上已不存在）。
        const normalizedOld = normalizePath(payload.oldPath);
        const normalizedNew = normalizePath(payload.newPath);
        const normalizedActiveTab = activeTabId ? normalizePath(activeTabId) : null;
        const normalizedCurrentFile = currentFileId ? normalizePath(currentFileId) : null;

        if (normalizedActiveTab === normalizedOld || normalizedCurrentFile === normalizedOld) {
            logger?.info('Updating current editor file path after FILE_MOVED', {
                oldPath: normalizedOld,
                newPath: normalizedNew,
            });
            setCurrentFile(normalizedNew);
        }

    });

    // 3. Bug 2 修复：检测外部文件系统变化后标签页有效性
    // 当 FS Watcher 检测到变化时，检查每个打开的标签页对应的文件是否仍然存在
    const checkTabsExistence = useCallback(async () => {

        const currentTabs = getTabs();

        for (const tab of currentTabs) {
            // 跳过 untitled 临时文件
            if (tab.id.startsWith('untitled-')) continue;

            const exists = await fileSystem?.checkExists(tab.path);
            if (!exists) {
                logger?.info(`File no longer exists: ${tab.path}`);
                // 关闭不存在的标签页
                closeTab(tab.id);
            }
        }
    }, [fileSystem, closeTab]);

    useKernelEvent(EditorEvents.CHECK_TABS_EXISTENCE, checkTabsExistence);

    return null; // 逻辑组件，无 UI
}

