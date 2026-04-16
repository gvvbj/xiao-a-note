import { EventEmitter } from 'eventemitter3';
import { Kernel } from '@/kernel/core/Kernel';
import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import { SettingsService } from './SettingsService';
import { normalizePath } from '@/shared/utils/path';

const SETTINGS_NAMESPACE = 'workspace';

/**
 * WorkspaceService - 工作区状态服务
 * 
 * 职责:
 * 1. 管理 projectRoot（项目根目录）
 * 2. 管理 selectedFilePath（当前选中文件）
 * 3. 管理 hasDirtyFiles（是否有未保存文件）
 * 4. 通过 SettingsService 持久化 projectRoot
 * 
 * 遵循原则:
 * - 零 Store: 完全独立，不依赖 Zustand
 * - 事件驱动: 状态变更通过事件通知
 */
export class WorkspaceService extends EventEmitter {
    private _projectRoot: string | null = null;
    private _selectedFilePath: string | null = null;
    private _hasDirtyFiles: boolean = false;
    private _kernel?: Kernel;

    constructor() {
        super();
    }

    /**
     * 初始化服务，从 SettingsService 加载持久化状态
     */
    init(kernel: Kernel): void {
        this._kernel = kernel;
        const settingsService = kernel.getService<SettingsService>(ServiceId.SETTINGS, false);
        if (settingsService) {
            const savedProjectRoot = settingsService.getSetting<string | null>(`${SETTINGS_NAMESPACE}.projectRoot`, null);
            this._projectRoot = savedProjectRoot;
        }
    }

    // === Getters ===
    getProjectRoot(): string | null {
        return this._projectRoot;
    }

    getSelectedFilePath(): string | null {
        return this._selectedFilePath;
    }

    getHasDirtyFiles(): boolean {
        return this._hasDirtyFiles;
    }

    // === Setters ===
    setProjectRoot(path: string | null): void {
        if (this._projectRoot === path) return;
        this._projectRoot = path;

        // 持久化到 SettingsService
        if (this._kernel) {
            const settingsService = this._kernel.getService<SettingsService>(ServiceId.SETTINGS, false);
            if (settingsService) {
                settingsService.updateSettings(SETTINGS_NAMESPACE, { projectRoot: path });
            }
        }

        this.emit(CoreEvents.WORKSPACE_PROJECT_ROOT_CHANGED, path);
        this.emit(CoreEvents.WORKSPACE_CHANGED, this.getState());
    }

    setSelectedFilePath(path: string | null): void {
        const normalizedPath = path ? normalizePath(path) : null;
        if (this._selectedFilePath === normalizedPath) return;
        this._selectedFilePath = normalizedPath;
        this.emit(CoreEvents.WORKSPACE_SELECTED_FILE_CHANGED, normalizedPath);
        this.emit(CoreEvents.WORKSPACE_CHANGED, this.getState());
    }

    setHasDirtyFiles(dirty: boolean): void {
        if (this._hasDirtyFiles === dirty) return;
        this._hasDirtyFiles = dirty;
        this.emit(CoreEvents.WORKSPACE_DIRTY_STATE_CHANGED, dirty);
        this.emit(CoreEvents.WORKSPACE_CHANGED, this.getState());
    }

    // === 获取完整状态 ===
    getState() {
        return {
            projectRoot: this._projectRoot,
            selectedFilePath: this._selectedFilePath,
            hasDirtyFiles: this._hasDirtyFiles
        };
    }
}
