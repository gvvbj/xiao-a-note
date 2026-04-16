import { Kernel } from '@/kernel/core/Kernel';
import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import { EDITOR_CONSTANTS } from '../../../../constants/EditorConstants';
import { EditorEvents } from '../../../../constants/EditorEvents';
import { SettingsService } from '@/kernel/services/SettingsService';
import { TabService } from '@/kernel/services/TabService';
import { EditorService } from '@/kernel/services/EditorService';
import { IFileSystem } from '@/kernel/interfaces/IFileSystem';
import {
    EXTERNAL_OVERWRITE_GUARD_SERVICE_ID,
    FILE_CHANGE_CLASSIFICATION_SERVICE_ID,
    IExternalOverwriteGuardService,
    IFileChangeClassificationService,
    INoteService,
} from '@/modules/interfaces';
import { normalizePath } from '@/shared/utils/path';
import { IPersistenceService } from '@/modules/interfaces';
import { loggerService } from '@/kernel/services/LoggerService';

interface IAssetTransformer {
    transform(content: string, targetPath: string): Promise<{
        content: string;
        replacements: Array<{ oldText: string; newText: string }>;
    }>;
}

export function resolveAutoSaveDelayMs(intervalMinutes: number): number | null {
    const autoSaveMs = intervalMinutes * 60 * 1000;
    if (autoSaveMs <= 0) return null;
    return Math.max(EDITOR_CONSTANTS.AUTO_SAVE_MIN_MS, autoSaveMs);
}

/**
 * PersistenceService - 持久化核心服务
 * 负责：
 * 1. 自动保存 (防抖)
 * 2. 手动保存 (Ctrl+S / 关闭标签页时触发)
 * 3. 另存为 (SaveAs)
 * 4. 管理脏状态同步
 */
export class PersistenceService implements IPersistenceService {
    private kernel: Kernel;
    private _saveTimer: ReturnType<typeof setTimeout> | null = null;
    private _disposeHandlers: (() => void)[] = [];
    private logger = loggerService.createLogger('PersistenceService');

    constructor(kernel: Kernel) {
        this.kernel = kernel;
    }

    private get noteService(): INoteService | undefined {
        return this.kernel.getService<INoteService>(ServiceId.NOTE, false);
    }

    private get fileSystem(): IFileSystem | undefined {
        return this.kernel.getService<IFileSystem>(ServiceId.FILE_SYSTEM, false);
    }

    private get tabService(): TabService | undefined {
        return this.kernel.getService<TabService>(ServiceId.TAB, false);
    }

    private get editorService(): EditorService | undefined {
        return this.kernel.getService<EditorService>(ServiceId.EDITOR, false);
    }

    private get fileChangeClassificationService(): IFileChangeClassificationService | undefined {
        return this.kernel.getService<IFileChangeClassificationService>(FILE_CHANGE_CLASSIFICATION_SERVICE_ID, false);
    }

    private get externalOverwriteGuardService(): IExternalOverwriteGuardService | undefined {
        return this.kernel.getService<IExternalOverwriteGuardService>(EXTERNAL_OVERWRITE_GUARD_SERVICE_ID, false);
    }

    /**
     * 启动持久化服务监听
     */
    start(): void {
        // 1. 自动保存监听 - 现在监听 EDITOR_CONTENT_INPUT 事件
        const handleContentInput = (payload: { path: string | null, newContent: string, initialContent?: string }) => {
            // 跳过无路径或暂存区文件
            if (!payload.path || payload.path.startsWith(EDITOR_CONSTANTS.UNTITLED_PREFIX)) return;

            const settingsService = this.kernel.getService<SettingsService>(ServiceId.SETTINGS);
            const autoSaveIntervalMinutes = settingsService.getSetting<number>('app.autoSaveIntervalMinutes', 1);
            const delay = resolveAutoSaveDelayMs(autoSaveIntervalMinutes);
            if (delay === null) return;

            if (this._saveTimer) clearTimeout(this._saveTimer);

            // 保存一个归一化的标签 ID，后续在 timer 触发时重新获取最新路径
            const normalizedTabId = normalizePath(payload.path);

            this._saveTimer = setTimeout(async () => {
                try {
                    // 从 TabService 获取最新的 Tab 信息，使用其当前路径
                    const tab = this.tabService?.getTab(normalizedTabId);
                    if (!tab) {
                        // Tab 可能已经关闭或者路径已变更，跳过保存
                        this.logger.info('Tab not found, skipping auto-save:', { normalizedTabId });
                        return;
                    }
                    // 使用 Tab 的当前路径和内容进行保存
                    await this.saveFile(tab.path, tab.content || payload.newContent, true);
                } catch (e) {
                    this.logger.error('Auto-save failed', e);
                }
            }, delay);
        };

        // 2. 手动保存监听 (Ctrl+S)
        const handleSaveCommand = () => {
            const currentPath = this.editorService?.getState().currentFileId;
            if (currentPath) {
                const tab = this.tabService?.getTab(currentPath);
                const content = tab?.content;
                if (content !== undefined) {
                    this.saveFile(currentPath, content, false);
                }
            }
        };

        // 3. 保存请求监听 (关闭标签页时)
        const handleSaveRequest = (payload: string | { path?: string, content?: string, silent?: boolean }) => {
            const path = typeof payload === 'string' ? payload : payload.path;
            const content = typeof payload === 'object' ? payload.content : undefined;
            const silent = typeof payload === 'object' ? payload.silent : false;
            if (!path) return;

            // 如果提供了内容，直接使用；否则从 TabService 获取
            const resolvedContent = content ?? this.tabService?.getTab(path)?.content;
            if (resolvedContent !== undefined) {
                this.saveFile(path, resolvedContent, silent ?? false);
            }
        };

        // 使用 EDITOR_CONTENT_INPUT 替代 DOCUMENT_CHANGED
        this.kernel.on(EditorEvents.EDITOR_CONTENT_INPUT, handleContentInput);
        this.kernel.on(EditorEvents.SAVE_FILE, handleSaveCommand);
        this.kernel.on(CoreEvents.SAVE_FILE_REQUEST, handleSaveRequest);

        this._disposeHandlers.push(() => {
            if (this._saveTimer) clearTimeout(this._saveTimer);
            this.kernel.off(EditorEvents.EDITOR_CONTENT_INPUT, handleContentInput);
            this.kernel.off(EditorEvents.SAVE_FILE, handleSaveCommand);
            this.kernel.off(CoreEvents.SAVE_FILE_REQUEST, handleSaveRequest);
        });
    }

    /**
     * 保存文件
     */
    async saveFile(path: string, content: string, silent: boolean = false): Promise<boolean> {
        if (!path || path.startsWith(EDITOR_CONSTANTS.UNTITLED_PREFIX)) {
            return this.saveAs(content);
        }

        const normalizedPath = normalizePath(path);
        const saveTargetPath = await this.resolveWritablePath(normalizedPath, silent);
        if (!saveTargetPath) {
            return false;
        }

        if (this.externalOverwriteGuardService?.hasBlockingConflict(normalizedPath)) {
            if (silent) {
                this.logger.info('Skipped auto-save because file has unresolved external conflict:', { path: normalizedPath });
                return false;
            }

            this.promptExternalConflictSaveDialog(normalizedPath, content);
            return false;
        }

        return this.performSaveFile(saveTargetPath, content, silent);
    }

    private async performSaveFile(path: string, content: string, silent: boolean = false): Promise<boolean> {
        const service = this.noteService;
        if (!service) {
            this.logger.error('NoteService not available');
            return false;
        }

        try {
            const normalizedPath = normalizePath(path);
            // 使用 AssetTransformer 处理临时资源链接
            const transformer = this.kernel.getService<IAssetTransformer>(ServiceId.ASSET_TRANSFORMER, false);
            let processedContent = content;
            let replacements: Array<{ oldText: string; newText: string }> = [];

            if (transformer) {
                const result = await transformer.transform(content, normalizedPath);
                processedContent = result.content;
                replacements = result.replacements;
            }

            await service.saveFile(normalizedPath, processedContent);
            this.fileChangeClassificationService?.markInternalWrite(normalizedPath);

            // 同步编辑器内容 (如果有资产路径替换)
            if (replacements.length > 0) {
                this.kernel.emit(EditorEvents.SYNC_EDITOR_CONTENT, { replacements, savedContent: processedContent });
            }

            // 更新 Tab 状态
            if (this.tabService) {
                this.tabService.updateTabContent(normalizedPath, processedContent, false);
                this.tabService.setTabDirty(normalizedPath, false);
            }

            // 更新 EditorService 状态
            if (this.editorService) {
                this.editorService.setUnsaved(false);
            }

            this.externalOverwriteGuardService?.clearConflict(path);

            // 发射保存完成事件
            this.kernel.emit(CoreEvents.FILE_SAVED, path);

            if (!silent) {
                this.logger.info(`Saved: ${path}`);
            }

            return true;
        } catch (e) {
            this.logger.error('Save failed:', e);
            return false;
        }
    }

    private promptExternalConflictSaveDialog(path: string, content: string): void {
        this.externalOverwriteGuardService?.promptSaveProtection(path, () => this.performSaveFile(path, content, false));
    }

    private async resolveWritablePath(path: string, silent: boolean): Promise<string | null> {
        const normalizedPath = normalizePath(path);
        const exists = await this.fileSystem?.checkExists?.(normalizedPath);

        if (exists !== false) {
            return normalizedPath;
        }

        if (silent) {
            this.logger.info('Skipped auto-save because target path no longer exists:', { path: normalizedPath });
            return null;
        }

        this.logger.warn('Blocked save because target path no longer exists:', { path: normalizedPath });
        this.kernel.emit(CoreEvents.APP_SHOW_MESSAGE_DIALOG, {
            title: '保存已阻止',
            message: `当前文件原路径已不存在：${normalizedPath}\n\n为避免在旧位置重建文件，本次未执行保存。请重新打开新位置的文件，或使用“另存为”保存当前内容。`,
            type: 'warning',
        });
        return null;
    }

    /**
     * 另存为
     */
    async saveAs(content: string): Promise<boolean> {
        const service = this.noteService;
        if (!service) {
            this.logger.error('NoteService not available');
            return false;
        }

        try {
            const sourcePath = this.editorService?.getState().currentFileId ?? null;
            const newPath = await service.saveAs(null, content);
            if (newPath) {
                const normalizedPath = normalizePath(newPath);
                const fileName = newPath.split(/[\\/]/).pop() || EDITOR_CONSTANTS.DEFAULT_FILENAME;
                this.fileChangeClassificationService?.markInternalWrite(normalizedPath);

                const normalizedSourcePath = sourcePath ? normalizePath(sourcePath) : null;
                const isReplacingUntitled =
                    !!normalizedSourcePath &&
                    normalizedSourcePath.startsWith(EDITOR_CONSTANTS.UNTITLED_PREFIX);
                const targetTabExists = !!this.tabService?.getTab(normalizedPath);

                // 优先将暂存区标签替换为正式文件，避免残留重复的 untitled 标签
                if (this.tabService) {
                    if (isReplacingUntitled && normalizedSourcePath !== normalizedPath) {
                        if (targetTabExists) {
                            this.tabService.closeTab(normalizedSourcePath!);
                            this.tabService.openTab(normalizedPath, fileName);
                        } else {
                            this.tabService.updateTabPath(normalizedSourcePath!, normalizedPath);
                        }
                    } else {
                        this.tabService.openTab(normalizedPath, fileName);
                    }

                    this.tabService.updateTabContent(normalizedPath, content, false);
                    this.tabService.setTabDirty(normalizedPath, false);
                }

                // 切换到新文件
                if (this.editorService) {
                    this.editorService.setCurrentFile(normalizedPath);
                    this.editorService.setUnsaved(false);
                }

                this.kernel.emit(CoreEvents.FILE_SAVED, normalizedPath);
                this.logger.info(`SaveAs completed: ${normalizedPath}`);
                return true;
            }
            return false;
        } catch (e) {
            this.logger.error('SaveAs failed:', e);
            return false;
        }
    }

    /**
     * 停止并清理
     */
    dispose(): void {
        this._disposeHandlers.forEach(fn => fn());
        this._disposeHandlers = [];
    }
}
