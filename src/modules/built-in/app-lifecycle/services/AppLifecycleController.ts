import { Kernel } from '@/kernel/core/Kernel';
import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import { IFileSystem } from '@/kernel/interfaces/IFileSystem';
import { ITabService } from '@/kernel/interfaces/ITabService';
import { SettingsService } from '@/kernel/services/SettingsService';
import { ILogger } from '@/kernel/services/LoggerService';

/**
 * AppLifecycleController
 *
 * 承载 AppLifecyclePlugin 的业务流程，入口文件仅保留 wiring。
 */
export class AppLifecycleController {
    private cleanups: (() => void)[] = [];

    constructor(
        private readonly kernel: Kernel,
        private readonly logger?: ILogger,
    ) { }

    init() {
        this.cleanups = [];
        this.handleNewWindowIsolation();
        this.registerOpenFileCommand();
        this.registerFileAssociation();
        this.logger?.info('Activated — app lifecycle handlers registered');
    }

    private handleNewWindowIsolation() {
        const params = new URLSearchParams(window.location.search);
        const isNewWindow = params.get('newWindow') === 'true';

        if (!isNewWindow) return;

        // 禁止 localStorage 写入，防止覆盖主窗口的持久化数据
        const settingsService = this.kernel.getService<SettingsService>(ServiceId.SETTINGS);
        settingsService.setReadOnly(true);

        // 通过事件通知各插件清空状态（调用时机由插件顺序保证）
        this.kernel.emit(CoreEvents.APP_CLEAR_STATE);

        this.logger?.info('New window detected, state cleared via event (readOnly enabled)');
        window.history.replaceState({}, '', window.location.pathname);
    }

    private registerOpenFileCommand() {
        const handleOpenFile = async () => {
            const fileSystem = this.kernel.getService<IFileSystem>(ServiceId.FILE_SYSTEM);
            const result = await fileSystem.openFile?.();
            if (result && result.length > 0) {
                for (const file of result) {
                    this.openPath(file.path);
                }
                this.logger?.info(`Opened ${result.length} file(s) via dialog`);
            }
        };

        this.kernel.on(CoreEvents.APP_CMD_OPEN_FILE, handleOpenFile);
        this.cleanups.push(() => this.kernel.off(CoreEvents.APP_CMD_OPEN_FILE, handleOpenFile));
    }

    private registerFileAssociation() {
        if (!window.electronAPI?.onOpenFile) return;

        const electronCleanup = window.electronAPI.onOpenFile((path: string) => {
            this.logger?.info('Received file association open request:', path);
            this.openPath(path);
        });

        if (electronCleanup) {
            this.cleanups.push(electronCleanup);
        }

        // 通知主进程：onOpenFile 监听器已注册，可以发送缓存的文件路径了
        window.electronAPI.notifyReadyForFile?.();
    }

    private openPath(path: string | null) {
        if (!path) {
            this.kernel.emit(CoreEvents.OPEN_FILE, null);
            return;
        }

        const normalizedPath = path.replace(/[\\/]+/g, '/');
        const fileName = normalizedPath.split('/').pop() || 'Untitled';
        const tabService = this.kernel.getService<ITabService>(ServiceId.TAB, false);

        // 冷启动时先修正活动标签，再走统一 OPEN_FILE 链路，避免首次挂载时被旧 activeTab 覆盖。
        tabService?.openTab(normalizedPath, fileName);
        this.kernel.emit(CoreEvents.OPEN_FILE, normalizedPath);
    }

    dispose() {
        this.cleanups.forEach(fn => fn());
        this.cleanups = [];
    }
}
