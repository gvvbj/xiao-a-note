/**
 * ExplorerController - 资源管理器控制器
 * 
 * 从 index.ts 剥离的业务逻辑
 * 
 * 职责:
 * 1. 处理 APP_CMD_NEW_FILE 命令
 * 2. 处理 EXPLORER_CREATE_FILE 事件
 * 3. 处理 EXPLORER_CREATE_FOLDER 事件
 * 4. 处理 EXPLORER_SET_FILE_TREE 事件
 * 5. 监听 projectRoot 变化
 * 
 * 遵循原则:
 * - Plugin-First: 业务逻辑集中在 Controller，index.ts 只负责 wiring
 * - 0 硬编码: 事件名使用 CoreEvents 常量
 */

import { Kernel } from '@/kernel/core/Kernel';
import { ServiceId } from '@/kernel/core/ServiceId';
import { ExplorerService, FileNode } from '@/kernel/services/ExplorerService';
import { WorkspaceService } from '@/kernel/services/WorkspaceService';
import { CoreEvents } from '@/kernel/core/Events';
import { UI_CONSTANTS } from '@/shared/constants/UIConstants';

export class ExplorerController {
    private kernel: Kernel;
    private explorerService: ExplorerService | null;
    private workspaceService: WorkspaceService | null;
    private logger: any;

    private cleanups: (() => void)[] = [];

    constructor(kernel: Kernel, logger?: any) {
        this.kernel = kernel;
        this.logger = logger;
        this.explorerService = kernel.getService<ExplorerService>(ServiceId.EXPLORER, false);
        this.workspaceService = kernel.getService<WorkspaceService>(ServiceId.WORKSPACE, false);
    }

    /**
     * 初始化控制器 - 绑定所有事件
     */
    init(): void {
        // 1. 监听 APP_CMD_NEW_FILE 命令
        const handleNewFile = () => this.handleNewFileCommand();
        this.kernel.on(CoreEvents.APP_CMD_NEW_FILE, handleNewFile);
        this.cleanups.push(() => this.kernel.off(CoreEvents.APP_CMD_NEW_FILE, handleNewFile));

        // 2. 监听 EXPLORER_CREATE_FILE 事件
        const handleCreateFile = () => this.handleCreateFile();
        this.kernel.on(CoreEvents.EXPLORER_CREATE_FILE, handleCreateFile);
        this.cleanups.push(() => this.kernel.off(CoreEvents.EXPLORER_CREATE_FILE, handleCreateFile));

        // 3. 监听 EXPLORER_CREATE_FOLDER 事件
        const handleCreateFolder = () => this.handleCreateFolder();
        this.kernel.on(CoreEvents.EXPLORER_CREATE_FOLDER, handleCreateFolder);
        this.cleanups.push(() => this.kernel.off(CoreEvents.EXPLORER_CREATE_FOLDER, handleCreateFolder));

        // 4. 监听 EXPLORER_SET_FILE_TREE 事件
        const handleSetFileTree = (tree: FileNode[]) => this.explorerService?.setFileTree(tree);
        this.kernel.on(CoreEvents.EXPLORER_SET_FILE_TREE, handleSetFileTree);
        this.cleanups.push(() => this.kernel.off(CoreEvents.EXPLORER_SET_FILE_TREE, handleSetFileTree));

        // 5. 监听 projectRoot 变化
        let prevProjectRoot = this.workspaceService?.getProjectRoot();
        const handleProjectRootChange = (newProjectRoot: string | null) => {
            if (newProjectRoot !== prevProjectRoot) {
                prevProjectRoot = newProjectRoot;
                this.explorerService?.setFileTree([]);
                this.logger?.info(`工作区根目录已变更: ${newProjectRoot}`);
            }
        };
        this.workspaceService?.on(CoreEvents.WORKSPACE_PROJECT_ROOT_CHANGED, handleProjectRootChange);
        this.cleanups.push(() => this.workspaceService?.off(CoreEvents.WORKSPACE_PROJECT_ROOT_CHANGED, handleProjectRootChange));

        // 6. 监听 APP_CLEAR_STATE 事件（子窗口状态隔离）
        const handleClearState = () => {
            this.workspaceService?.setProjectRoot(null);
            this.explorerService?.setFileTree([]);
            this.logger?.info('Cleared workspace state on APP_CLEAR_STATE');
        };
        this.kernel.on(CoreEvents.APP_CLEAR_STATE, handleClearState);
        this.cleanups.push(() => this.kernel.off(CoreEvents.APP_CLEAR_STATE, handleClearState));

        this.logger?.info('ExplorerController 已初始化');
    }

    /**
     * 销毁控制器 - 解绑所有事件
     */
    dispose(): void {
        this.cleanups.forEach(cleanup => cleanup());
        this.cleanups = [];
        this.logger?.info('ExplorerController 已销毁');
    }

    /**
     * 处理 APP_CMD_NEW_FILE 命令
     * 
     * 焦点感知逻辑:
     * - 焦点在侧边栏文件树且有可用目录 → 在目录中创建新文件（命名输入框）
     * - 焦点在编辑器区域或其他位置，或无目录 → 创建暂存区（Untitled 标签）
     */
    private handleNewFileCommand(): void {
        const targetDir = this.resolveTargetDirectory();
        const isSidebarFocused = this.isFocusInSidebar();

        if (targetDir && isSidebarFocused && this.explorerService) {
            // 焦点在文件树区域，在目录中创建新文件
            this.explorerService.setExpanded(targetDir, true);
            this.explorerService.startEditing(targetDir, 'create-file');
        } else {
            // 焦点在编辑区域或其他位置，或无目录 → 创建暂存区
            this.kernel.emit(CoreEvents.CREATE_UNTITLED_TAB);
        }
    }

    /**
     * 检测焦点是否在侧边栏文件树区域内
     * 通过 data-region 属性定位，避免依赖 CSS class 硬编码
     */
    private isFocusInSidebar(): boolean {
        const activeElement = document.activeElement;
        if (!activeElement) return false;
        return activeElement.closest(
            `[data-region="${UI_CONSTANTS.REGION.SIDEBAR_FILE_TREE}"]`
        ) !== null;
    }

    /**
     * 处理 EXPLORER_CREATE_FILE 事件
     */
    private handleCreateFile(): void {
        if (!this.explorerService) return;

        const projectRoot = this.workspaceService?.getProjectRoot();
        if (!projectRoot) {
            this.kernel.emit(CoreEvents.CREATE_UNTITLED_TAB);
            return;
        }

        const targetDir = this.resolveTargetDirectorySimple(projectRoot);
        this.explorerService.setExpanded(targetDir, true);
        this.explorerService.startEditing(targetDir, 'create-file');
    }

    /**
     * 处理 EXPLORER_CREATE_FOLDER 事件
     */
    private handleCreateFolder(): void {
        if (!this.explorerService) return;

        const projectRoot = this.workspaceService?.getProjectRoot();
        if (!projectRoot) return;

        const targetDir = this.resolveTargetDirectorySimple(projectRoot);
        this.explorerService.setExpanded(targetDir, true);
        this.explorerService.startEditing(targetDir, 'create-folder');
    }

    /**
     * 解析目标目录 (复杂版 - 用于 APP_CMD_NEW_FILE)
     * 需要考虑选中项是文件还是目录
     */
    private resolveTargetDirectory(): string | null {
        const projectRoot = this.workspaceService?.getProjectRoot();
        if (!projectRoot) return null;

        const selectedPaths = this.explorerService?.getSelectedPaths() || new Set();
        if (selectedPaths.size === 0) return projectRoot;

        const firstSelected = Array.from(selectedPaths)[0] as string;
        const normalizedSelected = firstSelected.replace(/\\/g, '/');
        const fileTree = this.explorerService?.getFileTree() || [];

        const node = this.findNode(fileTree, normalizedSelected);
        if (node?.isDirectory) return firstSelected;

        // 选中的是文件，返回其父目录
        return this.getParentDirectory(firstSelected);
    }

    /**
     * 解析目标目录 (简化版 - 用于 EXPLORER_CREATE_FILE/FOLDER)
     */
    private resolveTargetDirectorySimple(projectRoot: string): string {
        const selectedPaths = this.explorerService?.getSelectedPaths() || new Set();
        if (selectedPaths.size === 0) return projectRoot;

        const firstSelected = Array.from(selectedPaths)[0] as string;
        const isFile = firstSelected.split(/[\\/]/).pop()?.includes('.');

        if (isFile) {
            return this.getParentDirectory(firstSelected);
        }
        return firstSelected;
    }

    /**
     * 在文件树中查找节点
     */
    private findNode(nodes: FileNode[], targetPath: string): FileNode | null {
        for (const node of nodes) {
            const nodePath = node.path.replace(/\\/g, '/');
            if (nodePath === targetPath) return node;
            if (node.children) {
                const found = this.findNode(node.children, targetPath);
                if (found) return found;
            }
        }
        return null;
    }

    /**
     * 获取父目录路径
     */
    private getParentDirectory(path: string): string {
        const separator = path.includes('\\') ? '\\' : '/';
        const parts = path.split(/[\\/]/);
        parts.pop();
        return parts.join(separator);
    }
}
