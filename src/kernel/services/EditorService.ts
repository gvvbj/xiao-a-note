import { EventEmitter } from 'events';
import { Kernel } from '../core/Kernel';
import { ServiceId } from '../core/ServiceId';
import { SettingsService } from './SettingsService';
import { normalizePath } from '@/shared/utils/path';
import {
    IEditorCompatibilityProbe,
    IEditorSelectionSnapshot,
    IEditorService,
    IEditorState
} from '../interfaces/IEditorService';
import { CoreEvents } from '../core/Events';

// Re-export for backward compatibility
export type EditorState = IEditorState;

export class EditorService extends EventEmitter implements IEditorService {
    private kernel: Kernel | null = null;
    private compatibilityProbe: IEditorCompatibilityProbe | null = null;
    private state: EditorState = {
        currentFileId: null,
        isUnsaved: false,
        headingNumbering: false,
        saveAsDialogOpen: false,
        viewMode: 'preview',
    };

    init(kernel: Kernel) {
        this.kernel = kernel;
        const settings = kernel.getService<SettingsService>(ServiceId.SETTINGS);

        // 从设置中恢复编辑器相关的持久状态
        if (settings) {
            this.state.currentFileId = settings.getSetting('editor.activeTabId', null);
            this.state.headingNumbering = settings.getSetting('editor.headingNumbering', false);
            this.state.viewMode = settings.getSetting('editor.viewMode', 'preview');
        }
    }

    getState(): EditorState {
        return {
            ...this.state,
            currentContent: this.getCurrentContent()
        };
    }

    setCurrentFile(id: string | null) {
        const normalizedId = id ? normalizePath(id) : null;
        if (this.state.currentFileId === normalizedId) return;
        this.state.currentFileId = normalizedId;
        this.emit(CoreEvents.EDITOR_CHANGED, this.getState());
    }

    setUnsaved(unsaved: boolean) {
        if (this.state.isUnsaved === unsaved) return;
        this.state.isUnsaved = unsaved;
        this.emit(CoreEvents.EDITOR_CHANGED, this.getState());
    }

    setHeadingNumbering(enable: boolean) {
        if (this.state.headingNumbering === enable) return;
        this.state.headingNumbering = enable;
        this.kernel?.getService<SettingsService>(ServiceId.SETTINGS)?.updateSettings('editor', { headingNumbering: enable });
        this.emit(CoreEvents.EDITOR_CHANGED, this.getState());
    }

    setViewMode(mode: 'source' | 'preview') {
        if (this.state.viewMode === mode) return;
        this.state.viewMode = mode;
        this.kernel?.getService<SettingsService>(ServiceId.SETTINGS)?.updateSettings('editor', { viewMode: mode });
        this.emit(CoreEvents.EDITOR_CHANGED, this.getState());
    }

    setSaveAsDialogOpen(open: boolean) {
        if (this.state.saveAsDialogOpen === open) return;
        this.state.saveAsDialogOpen = open;
        this.emit(CoreEvents.EDITOR_CHANGED, this.getState());
    }

    getCurrentContent(): string {
        return this.compatibilityProbe?.getCurrentContent?.() ?? '';
    }

    getEditorView(): unknown | null {
        return this.compatibilityProbe?.getEditorView?.() ?? null;
    }

    getSelection(): IEditorSelectionSnapshot | null {
        return this.compatibilityProbe?.getSelection?.() ?? null;
    }

    registerCompatibilityProbe(probe: IEditorCompatibilityProbe): () => void {
        this.compatibilityProbe = probe;
        return () => {
            if (this.compatibilityProbe === probe) {
                this.compatibilityProbe = null;
            }
        };
    }
}
