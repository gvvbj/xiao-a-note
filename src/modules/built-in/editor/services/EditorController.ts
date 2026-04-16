/**
 * EditorController - 编辑器控制器
 * 
 * 从 index.tsx 剥离的业务逻辑
 * 
 * 职责:
 * 1. 处理 EditorEvents.OPEN_FILE 事件
 * 2. 同步 EditorService 的当前文件状态
 * 
 * 遵循原则:
 * - Plugin-First: 业务逻辑集中在 Controller
 * - 0 硬编码: 事件名使用常量
 */

import { Kernel } from '@/kernel/core/Kernel';
import { ServiceId } from '@/kernel/core/ServiceId';
import { EditorService } from '@/kernel/services/EditorService';
import { EditorEvents } from '../constants/EditorEvents';

export class EditorController {
    private kernel: Kernel;
    private logger: any;
    private cleanups: (() => void)[] = [];

    constructor(kernel: Kernel, logger?: any) {
        this.kernel = kernel;
        this.logger = logger;
    }

    /**
     * 初始化控制器
     */
    init(): void {
        const handleOpenFile = (path: string | null) => this.handleOpenFile(path);
        this.kernel.on(EditorEvents.OPEN_FILE, handleOpenFile);
        this.cleanups.push(() => this.kernel.off(EditorEvents.OPEN_FILE, handleOpenFile));

        this.logger?.info('EditorController 已初始化');
    }

    /**
     * 销毁控制器
     */
    dispose(): void {
        this.cleanups.forEach(cleanup => cleanup());
        this.cleanups = [];
        this.logger?.info('EditorController 已销毁');
    }

    /**
     * 处理文件打开事件
     */
    private handleOpenFile(path: string | null): void {
        const editorService = this.kernel.getService<EditorService>(ServiceId.EDITOR, false);
        if (!path) {
            editorService?.setCurrentFile(null);
            return;
        }

        const normalizedPath = this.normalizePath(path);
        const currentPath = this.normalizePath(editorService?.getState().currentFileId || null);

        // 如果已经是当前文件，跳过
        if (normalizedPath === currentPath && currentPath !== null) return;

        // 切换文件前保存光标位置
        if (currentPath && normalizedPath !== currentPath) {
            const rawCurrentPath = editorService?.getState().currentFileId;
            if (rawCurrentPath) {
                this.kernel.emit(EditorEvents.REQUEST_SAVE_CURSOR, rawCurrentPath);
            }
        }

        // 同步 EditorService 的当前文件状态
        editorService?.setCurrentFile(path);
    }

    /**
     * 标准化路径
     */
    private normalizePath(path: string | null): string | null {
        return path?.replace(/[\\/]/g, '/').toLowerCase() || null;
    }
}
