import { EventEmitter } from 'events';
import { Kernel } from '../core/Kernel';
import { ServiceId } from '../core/ServiceId';
import { SettingsService } from './SettingsService';
import { CoreEvents } from '../core/Events';

export interface FileNode {
    name: string;
    path: string;
    isDirectory: boolean;
    children?: FileNode[];
}

export interface EditingState {
    path: string;
    type: 'rename' | 'create-file' | 'create-folder';
}

export class ExplorerService extends EventEmitter {
    private _fileTree: FileNode[] = [];
    private _selectedPaths: Set<string> = new Set();
    private _lastFocusedPath: string | null = null;
    private _expandedPaths: Set<string> = new Set();
    private _editingNode: EditingState | null = null;
    private _selectionDismissed: boolean = false;
    private kernel: Kernel | null = null;

    constructor() {
        super();
        this.setMaxListeners(100); // 应对合理的多组件订阅场景，防止 10 个以上组件订阅时报警
    }

    init(kernel: Kernel): void {
        this.kernel = kernel;
        const settingsService = kernel.getService<SettingsService>(ServiceId.SETTINGS);

        // 从设置中加载持久化的展开路径
        const savedExpanded = settingsService.getSetting<string[]>('explorer.expandedPaths', []);
        this._expandedPaths = new Set(savedExpanded);

        this.emit(CoreEvents.EXPLORER_CHANGED);
    }

    private persist(): void {
        if (!this.kernel) return;
        const settingsService = this.kernel.getService<SettingsService>(ServiceId.SETTINGS);
        settingsService.updateSettings('explorer', {
            expandedPaths: Array.from(this._expandedPaths)
        });
    }

    getFileTree(): FileNode[] {
        return this._fileTree;
    }

    setFileTree(tree: FileNode[]): void {
        this._fileTree = tree;
        this.emit(CoreEvents.EXPLORER_CHANGED);
    }

    getSelectedPaths(): Set<string> {
        return new Set(this._selectedPaths);
    }

    getLastFocusedPath(): string | null {
        return this._lastFocusedPath;
    }

    getExpandedPaths(): Set<string> {
        return new Set(this._expandedPaths);
    }

    getEditingNode(): EditingState | null {
        return this._editingNode;
    }

    /** 用户是否主动取消了选中（点击空白区域） */
    isSelectionDismissed(): boolean {
        return this._selectionDismissed;
    }

    /** 规范化路径格式：Windows 下统一使用反斜杠 */
    private normalizePath(p: string): string {
        // 检测 Windows 路径（如 C:/ 或 e:/）
        if (/^[a-zA-Z]:[\/]/.test(p)) {
            return p.replace(/\//g, '\\');
        }
        return p;
    }

    selectPath(path: string): void {
        const normalized = this.normalizePath(path);
        this._selectedPaths = new Set([normalized]);
        this._lastFocusedPath = normalized;
        this._selectionDismissed = false;
        this.emit(CoreEvents.EXPLORER_CHANGED);
    }

    toggleSelection(path: string): void {
        const normalized = this.normalizePath(path);
        const newSelection = new Set(this._selectedPaths);
        if (newSelection.has(normalized)) {
            newSelection.delete(normalized);
        } else {
            newSelection.add(normalized);
        }
        this._selectedPaths = newSelection;
        this._lastFocusedPath = normalized;
        this._selectionDismissed = false;
        this.emit(CoreEvents.EXPLORER_CHANGED);
    }

    setSelection(paths: Set<string>, focusedPath: string | null): void {
        const normalized = new Set(Array.from(paths).map(p => this.normalizePath(p)));
        const normalizedFocus = focusedPath ? this.normalizePath(focusedPath) : null;
        this._selectedPaths = normalized;
        this._lastFocusedPath = normalizedFocus || (normalized.size > 0 ? Array.from(normalized)[0] : null);
        this._selectionDismissed = false;
        this.emit(CoreEvents.EXPLORER_CHANGED);
    }

    clearSelection(): void {
        this._selectedPaths = new Set();
        this._lastFocusedPath = null;
        this._selectionDismissed = true;
        this.emit(CoreEvents.EXPLORER_CHANGED);
    }

    toggleExpand(path: string): void {
        if (this._expandedPaths.has(path)) {
            this._expandedPaths.delete(path);
        } else {
            this._expandedPaths.add(path);
        }
        this.persist();
        this.emit(CoreEvents.EXPLORER_CHANGED);
    }

    setExpanded(path: string, expanded: boolean): void {
        if (expanded) {
            this._expandedPaths.add(path);
        } else {
            this._expandedPaths.delete(path);
        }
        this.persist();
        this.emit(CoreEvents.EXPLORER_CHANGED);
    }

    startEditing(path: string, type: EditingState['type']): void {
        this._editingNode = { path, type };
        this.emit(CoreEvents.EXPLORER_CHANGED);
    }

    stopEditing(): void {
        this._editingNode = null;
        this.emit(CoreEvents.EXPLORER_CHANGED);
    }
}
