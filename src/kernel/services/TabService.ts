import { EventEmitter } from 'events';
import { Kernel } from '../core/Kernel';
import { ServiceId } from '../core/ServiceId';
import { SettingsService } from './SettingsService';
import { CoreEvents } from '../core/Events';
import { normalizePath as globalNormalizePath } from '@/shared/utils/path';
import { ITabService, IEditorTab } from '../interfaces/ITabService';

// Re-export for backward compatibility
export type EditorTab = IEditorTab;

export class TabService extends EventEmitter implements ITabService {
    private _tabs: EditorTab[] = [];
    private _activeTabId: string | null = null;
    private kernel: Kernel | null = null;

    constructor() {
        super();
    }

    init(kernel: Kernel): void {
        this.kernel = kernel;
        const settingsService = kernel.getService<SettingsService>(ServiceId.SETTINGS);

        // 从设置中加载持久化的标签页 (不包含内容)
        const savedTabs = settingsService.getSetting<any[]>('editor.tabs', []);
        this._tabs = savedTabs.map(t => ({ ...t, isDirty: false })); // 加载时不带 Dirty 标记

        this._activeTabId = settingsService.getSetting<string | null>('editor.activeTabId', null);

        // 如果激活的 ID 不在列表中，重置
        if (this._activeTabId && !this._tabs.find(t => t.id === this._activeTabId)) {
            this._activeTabId = this._tabs.length > 0 ? this._tabs[0].id : null;
        }

        this.emit(CoreEvents.TABS_CHANGED);
    }

    private persist(): void {
        if (!this.kernel) return;
        const settingsService = this.kernel.getService<SettingsService>(ServiceId.SETTINGS);

        // 仅持久化关键元数据，不持久化 content
        const tabsToSave = this._tabs.map(({ content, isDirty, ...rest }) => rest);
        settingsService.updateSettings('editor', {
            tabs: tabsToSave,
            activeTabId: this._activeTabId
        });
    }

    private normalizePath(path: string): string {
        return globalNormalizePath(path);
    }

    getTabs(): EditorTab[] {
        return [...this._tabs];
    }

    getActiveTabId(): string | null {
        return this._activeTabId;
    }

    setActiveTab(id: string | null): void {
        if (id === this._activeTabId) return;
        this._activeTabId = id;
        this.persist();
        this.emit(CoreEvents.TABS_CHANGED);
    }

    openTab(path: string, name: string): void {
        const normalizedPath = this.normalizePath(path);
        const existingTab = this._tabs.find(t => this.normalizePath(t.path) === normalizedPath);

        if (existingTab) {
            this.setActiveTab(existingTab.id);
        } else {
            const newTab: EditorTab = {
                id: normalizedPath,
                path: normalizedPath,
                name,
                isDirty: false
            };
            this._tabs = [...this._tabs, newTab];
            this._activeTabId = newTab.id;
            this.persist();
            this.emit(CoreEvents.TABS_CHANGED);
        }
    }

    closeTab(id: string): void {
        const normalizedId = this.normalizePath(id);
        const tabIndex = this._tabs.findIndex(t => this.normalizePath(t.id) === normalizedId);
        if (tabIndex === -1) return;

        const newTabs = this._tabs.filter(t => this.normalizePath(t.id) !== normalizedId);
        let newActiveId = this._activeTabId;

        if (this._activeTabId && this.normalizePath(this._activeTabId) === normalizedId) {
            if (newTabs.length === 0) {
                newActiveId = null;
            } else if (tabIndex >= newTabs.length) {
                newActiveId = newTabs[newTabs.length - 1].id;
            } else {
                newActiveId = newTabs[tabIndex].id;
            }
        }

        this._tabs = newTabs;
        this._activeTabId = newActiveId;
        this.persist();
        this.emit(CoreEvents.TABS_CHANGED);

        // 如果没有标签了，可能需要通知工作区清除选中状态
        if (newTabs.length === 0 && this.kernel) {
            this.kernel.emit(CoreEvents.WORKSPACE_CHANGED, { selectedFilePath: null });
        }
    }

    closeAllTabs(): void {
        this._tabs = [];
        this._activeTabId = null;
        this.persist();
        this.emit(CoreEvents.TABS_CHANGED);
    }

    setTabDirty(id: string, isDirty: boolean): void {
        const normalizedId = this.normalizePath(id);
        let changed = false;
        this._tabs = this._tabs.map(t => {
            if (this.normalizePath(t.id) === normalizedId) {
                if (t.isDirty !== isDirty) changed = true;
                return { ...t, isDirty };
            }
            return t;
        });

        if (changed) {
            this.emit(CoreEvents.TABS_CHANGED);
        }
    }

    updateTabContent(id: string, content: string, isDirty?: boolean): void {
        const normalizedId = this.normalizePath(id);
        this._tabs = this._tabs.map(t =>
            this.normalizePath(t.id) === normalizedId
                ? { ...t, content, isDirty: isDirty !== undefined ? isDirty : true }
                : t
        );
        this.emit(CoreEvents.TABS_CHANGED);
    }

    reorderTabs(fromIndex: number, toIndex: number): void {
        const newTabs = [...this._tabs];
        const [moved] = newTabs.splice(fromIndex, 1);
        newTabs.splice(toIndex, 0, moved);
        this._tabs = newTabs;
        this.persist();
        this.emit(CoreEvents.TABS_CHANGED);
    }

    updateTabPath(oldPath: string, newPath: string): void {
        const normalizedOld = this.normalizePath(oldPath);
        const normalizedNew = this.normalizePath(newPath);
        const newName = newPath.split(/[\\/]/).pop() || '';

        this._tabs = this._tabs.map(t =>
            this.normalizePath(t.id) === normalizedOld ? {
                ...t,
                id: normalizedNew,
                path: normalizedNew,
                name: newName
            } : t
        );

        if (this._activeTabId && this.normalizePath(this._activeTabId) === normalizedOld) {
            this._activeTabId = normalizedNew;
        }

        this.persist();
        this.emit(CoreEvents.TABS_CHANGED);
    }

    setTabCursor(id: string, cursorPosition: number, scrollTop: number, topLineNumber?: number, topOffset?: number): void {
        const normalizedId = this.normalizePath(id);
        this._tabs = this._tabs.map(t =>
            this.normalizePath(t.id) === normalizedId ? { ...t, cursorPosition, scrollTop, topLineNumber, topOffset } : t
        );
        // 光标位置通常不作为触发重绘的全局事件，仅内部静默更新
    }

    getTab(id: string): EditorTab | undefined {
        const normalizedId = this.normalizePath(id);
        return this._tabs.find(t => this.normalizePath(t.id) === normalizedId);
    }

    getTabContent(id: string): string | undefined {
        return this.getTab(id)?.content;
    }

    clearTabContent(id: string): void {
        const normalizedId = this.normalizePath(id);
        this._tabs = this._tabs.map(t =>
            this.normalizePath(t.id) === normalizedId ? { ...t, content: undefined, isDirty: false } : t
        );
        this.emit(CoreEvents.TABS_CHANGED);
    }
}
