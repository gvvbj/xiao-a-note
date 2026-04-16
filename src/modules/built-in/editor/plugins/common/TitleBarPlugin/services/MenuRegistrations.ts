import { Kernel } from '@/kernel/core/Kernel';
import { ServiceId } from '@/kernel/core/ServiceId';
import { MenuService } from '@/kernel/services/MenuService';
import { CoreEvents } from '@/kernel/core/Events';
import { WorkspaceService } from '@/kernel/services/WorkspaceService';
import { ExplorerService } from '@/kernel/services/ExplorerService';
import { IFileSystem } from '@/kernel/interfaces/IFileSystem';
import { IWindowService } from '@/kernel/interfaces/IWindowService';
import { EDITOR_CONSTANTS } from '@/modules/built-in/editor/constants/EditorConstants';
import { ILifecycleService } from '@/modules/interfaces/ILifecycleService';

/**
 * 菜单注册服务
 * 负责注册所有标题栏菜单项
 */
export function registerMenuItems(kernel: Kernel, menuService: MenuService): (() => void)[] {
    const cleanups: (() => void)[] = [];

    // ===== 文件菜单组 =====
    cleanups.push(menuService.registerMenuGroup({
        id: 'file',
        label: '文件',
        order: 10
    }));

    // 新建文件
    cleanups.push(menuService.registerMenuItem('file', {
        id: 'new-file',
        label: '新建文件',
        shortcut: 'Ctrl+N',
        order: 10,
        action: () => {
            const workspaceService = kernel.getService<WorkspaceService>(ServiceId.WORKSPACE, false);
            const projectRoot = workspaceService?.getProjectRoot();
            if (projectRoot) {
                kernel.emit(CoreEvents.EXPLORER_CREATE_FILE);
            } else {
                kernel.emit(CoreEvents.APP_CMD_NEW_FILE);
            }
        }
    }));

    // 新建文件夹
    cleanups.push(menuService.registerMenuItem('file', {
        id: 'new-folder',
        label: '新建文件夹',
        order: 20,
        action: () => kernel.emit(CoreEvents.EXPLORER_CREATE_FOLDER)
    }));

    // 新建窗口
    cleanups.push(menuService.registerMenuItem('file', {
        id: 'new-window',
        label: '新建窗口',
        shortcut: 'Ctrl+Shift+N',
        order: 30,
        action: () => window.electronAPI?.newWindow()
    }));

    cleanups.push(menuService.registerMenuItem('file', {
        id: 'divider-1',
        label: '',
        divider: true,
        order: 40
    }));

    // 打开文件夹
    cleanups.push(menuService.registerMenuItem('file', {
        id: 'open-folder',
        label: '打开文件夹',
        order: 45,
        action: async () => {
            const fileSystem = kernel.getService<IFileSystem>(ServiceId.FILE_SYSTEM);
            const workspaceService = kernel.getService<WorkspaceService>(ServiceId.WORKSPACE, false);
            const result = await fileSystem.openDirectory();
            if (result && result.path) {
                workspaceService?.setProjectRoot(result.path);
                kernel.emit(CoreEvents.EXPLORER_SET_FILE_TREE, result.tree);
            }
        }
    }));

    // 打开文件
    cleanups.push(menuService.registerMenuItem('file', {
        id: 'open-file',
        label: '打开文件',
        shortcut: 'Ctrl+O',
        order: 50,
        action: () => kernel.emit(CoreEvents.APP_CMD_OPEN_FILE)
    }));

    cleanups.push(menuService.registerMenuItem('file', {
        id: 'divider-2',
        label: '',
        divider: true,
        order: 60
    }));

    // 保存
    cleanups.push(menuService.registerMenuItem('file', {
        id: 'save',
        label: '保存',
        shortcut: 'Ctrl+S',
        order: 70,
        action: () => kernel.emit(CoreEvents.APP_CMD_SAVE)
    }));

    // 另存为
    cleanups.push(menuService.registerMenuItem('file', {
        id: 'save-as',
        label: '另存为...',
        shortcut: 'Ctrl+Shift+S',
        order: 80,
        action: () => kernel.emit(CoreEvents.APP_CMD_SAVE_AS)
    }));

    cleanups.push(menuService.registerMenuItem('file', {
        id: 'divider-5',
        label: '',
        divider: true,
        order: 85
    }));

    // 自动保存设置
    cleanups.push(menuService.registerMenuItem('file', {
        id: 'auto-save-setting',
        label: '自动保存设置',
        order: 86,
        action: () => kernel.emit(CoreEvents.APP_SHOW_AUTO_SAVE_DIALOG)
    }));

    cleanups.push(menuService.registerMenuItem('file', {
        id: 'divider-3',
        label: '',
        divider: true,
        order: 90
    }));

    // 导出 PDF
    cleanups.push(menuService.registerMenuItem('file', {
        id: 'export-pdf',
        label: '导出为 PDF...',
        order: 100,
        action: () => {
            const explorerService = kernel.getService<ExplorerService>(ServiceId.EXPLORER, false);
            const selectedPaths = explorerService?.getSelectedPaths() as Set<string> | undefined;
            let paths: string[] | undefined;
            if (selectedPaths && selectedPaths.size > 0) {
                paths = Array.from(selectedPaths);
            } else {
                const lifecycleService = kernel.getService<ILifecycleService>(EDITOR_CONSTANTS.SERVICE_NAMES.LIFECYCLE, false);
                const activePath = lifecycleService?.getState()?.activePath;
                paths = activePath ? [activePath] : undefined;
            }
            kernel.emit(CoreEvents.APP_CMD_EXPORT_PDF, paths);
        }
    }));

    // 导出 Word
    cleanups.push(menuService.registerMenuItem('file', {
        id: 'export-word',
        label: '导出为 Word...',
        order: 110,
        action: () => {
            const explorerService = kernel.getService<ExplorerService>(ServiceId.EXPLORER, false);
            const selectedPaths = explorerService?.getSelectedPaths() as Set<string> | undefined;
            let paths: string[] | undefined;
            if (selectedPaths && selectedPaths.size > 0) {
                paths = Array.from(selectedPaths);
            } else {
                const lifecycleService = kernel.getService<ILifecycleService>(EDITOR_CONSTANTS.SERVICE_NAMES.LIFECYCLE, false);
                const activePath = lifecycleService?.getState()?.activePath;
                paths = activePath ? [activePath] : undefined;
            }
            kernel.emit(CoreEvents.APP_CMD_EXPORT_WORD, paths);
        }
    }));

    cleanups.push(menuService.registerMenuItem('file', {
        id: 'divider-4',
        label: '',
        divider: true,
        order: 115
    }));

    // 退出
    cleanups.push(menuService.registerMenuItem('file', {
        id: 'exit',
        label: '退出',
        order: 120,
        action: () => kernel.getService<IWindowService>(ServiceId.WINDOW)?.close()
    }));

    // ===== 语法格式菜单组 =====
    cleanups.push(menuService.registerMenuGroup({
        id: 'format',
        label: '语法格式',
        order: 20
    }));

    cleanups.push(menuService.registerMenuItem('format', {
        id: 'markdown-guide',
        label: 'Markdown 指南',
        order: 10,
        action: () => kernel.getService<IFileSystem>(ServiceId.FILE_SYSTEM)?.openExternal('https://www.markdownguide.org/')
    }));

    // ===== 快捷键菜单组 =====
    cleanups.push(menuService.registerMenuGroup({
        id: 'shortcuts',
        label: '快捷键',
        order: 40
    }));

    cleanups.push(menuService.registerMenuItem('shortcuts', {
        id: 'shortcut-list',
        label: '查看快捷键列表',
        order: 10,
        action: () => kernel.emit(CoreEvents.APP_SHOW_SHORTCUT_DIALOG)
    }));

    return cleanups;
}
