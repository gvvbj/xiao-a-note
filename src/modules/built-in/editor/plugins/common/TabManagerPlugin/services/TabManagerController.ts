import { Kernel } from '@/kernel/core/Kernel';
import { ServiceId } from '@/kernel/core/ServiceId';
import { TabService } from '@/kernel/services/TabService';
import { WorkspaceService } from '@/kernel/services/WorkspaceService';
import { EditorService } from '@/kernel/services/EditorService';
import { CoreEvents } from '@/kernel/core/Events';
import { EditorEvents } from '../../../../constants/EditorEvents';
import { EDITOR_CONSTANTS } from '../../../../constants/EditorConstants';
import { normalizeMarkdown } from '@/shared/utils/ContentUtils';
import { createDirtySyncHandler } from './TabSyncService';

interface IContentInputPayload {
    path: string | null;
    newContent: string;
    initialContent: string;
    isInternal?: boolean;
}

export class TabManagerController {
    private kernel: Kernel;
    private tabService: TabService | null;
    private workspaceService: WorkspaceService | null;
    private editorService: EditorService | null;
    private logger: any;
    private cleanups: Array<() => void> = [];
    private contentSyncTimer: ReturnType<typeof setTimeout> | null = null;
    private isSwitching = false;
    private lifecycleService: any;

    constructor(kernel: Kernel, logger?: any) {
        this.kernel = kernel;
        this.logger = logger;
        this.tabService = kernel.getService<TabService>(ServiceId.TAB, false);
        this.workspaceService = kernel.getService<WorkspaceService>(ServiceId.WORKSPACE, false);
        this.editorService = kernel.getService<EditorService>(ServiceId.EDITOR, false);
        this.lifecycleService = kernel.getService(ServiceId.LIFECYCLE, false);
    }

    init(): void {
        const handleClearState = () => {
            this.tabService?.closeAllTabs();
            this.editorService?.setCurrentFile(null);
            this.logger?.info('Cleared all tabs and editor state on APP_CLEAR_STATE');
        };
        this.kernel.on(CoreEvents.APP_CLEAR_STATE, handleClearState);
        this.cleanups.push(() => this.kernel.off(CoreEvents.APP_CLEAR_STATE, handleClearState));

        const syncDirtyState = createDirtySyncHandler(this.tabService, this.workspaceService);
        syncDirtyState();
        this.tabService?.on(CoreEvents.TABS_CHANGED, syncDirtyState);
        this.cleanups.push(() => this.tabService?.off(CoreEvents.TABS_CHANGED, syncDirtyState));

        const releaseSwitchLock = () => {
            if (this.contentSyncTimer) {
                clearTimeout(this.contentSyncTimer);
                this.contentSyncTimer = null;
            }

            setTimeout(() => {
                this.isSwitching = false;
            }, 150);
        };

        const handleSwitchStart = () => {
            this.isSwitching = true;
        };

        this.kernel.on(EditorEvents.LIFECYCLE_SWITCHING_START, handleSwitchStart);
        this.kernel.on(EditorEvents.LIFECYCLE_FILE_LOADED, releaseSwitchLock);
        this.kernel.on(EditorEvents.LIFECYCLE_SWITCHING_FAILED, releaseSwitchLock);
        this.cleanups.push(() => {
            this.kernel.off(EditorEvents.LIFECYCLE_SWITCHING_START, handleSwitchStart);
            this.kernel.off(EditorEvents.LIFECYCLE_FILE_LOADED, releaseSwitchLock);
            this.kernel.off(EditorEvents.LIFECYCLE_SWITCHING_FAILED, releaseSwitchLock);
        });

        const handleContentInput = (payload: IContentInputPayload) => {
            const { path, newContent, initialContent, isInternal } = payload;

            if (this.isSwitching || isInternal || !path) {
                return;
            }

            const normalizedNew = normalizeMarkdown(newContent);
            const normalizedInitial = normalizeMarkdown(initialContent);
            const isDirty = normalizedNew !== normalizedInitial;

            if (
                isDirty &&
                normalizedNew.length === normalizedInitial.length &&
                normalizedNew.trim() === normalizedInitial.trim()
            ) {
                return;
            }

            const currentState = this.lifecycleService?.getState();
            if (path === currentState?.activePath) {
                this.lifecycleService?.setUnsaved(isDirty);
            } else {
                this.tabService?.setTabDirty(path, isDirty);
            }

            if (this.contentSyncTimer) {
                clearTimeout(this.contentSyncTimer);
            }

            this.contentSyncTimer = setTimeout(() => {
                this.tabService?.updateTabContent(path, normalizedNew, isDirty);
                this.contentSyncTimer = null;
            }, EDITOR_CONSTANTS.CONTENT_UPDATE_DEBOUNCE_MS);
        };

        this.kernel.on(EditorEvents.EDITOR_CONTENT_INPUT, handleContentInput);
        this.cleanups.push(() => {
            this.kernel.off(EditorEvents.EDITOR_CONTENT_INPUT, handleContentInput);
            if (this.contentSyncTimer) {
                clearTimeout(this.contentSyncTimer);
            }
        });

        this.logger?.info('TabManagerController initialized');
    }

    dispose(): void {
        this.cleanups.forEach((cleanup) => cleanup());
        this.cleanups = [];
        this.logger?.info('TabManagerController disposed');
    }
}
