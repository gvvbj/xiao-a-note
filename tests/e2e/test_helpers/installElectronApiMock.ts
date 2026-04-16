import type { Page } from '@playwright/test';

interface IOpenFileResultItem {
    path: string;
    content: string;
}

interface IElectronApiMockOptions {
    files?: Record<string, string>;
    openFileResult?: IOpenFileResultItem[] | null;
    openDirectoryResult?: { path: string; tree: any[] } | null;
    themeId?: string | null;
}

/**
 * Playwright 宿主注入辅助：
 * - 在浏览器态为应用补齐最小 electronAPI
 * - 提供受控的内存文件系统与 watch 事件触发器
 * - 不引入业务判断，只为 smoke/E2E 提供可重复运行的宿主环境
 */
export async function installElectronApiMock(page: Page, options: IElectronApiMockOptions = {}): Promise<void> {
    await page.addInitScript(
        ({ injectedOptions }) => {
            type WatchPayload = { eventType: string; filename: string };
            type OpenDirectoryResult = { path: string; tree: any[] } | null;
            type OpenFileResult = Array<{ path: string; content: string }> | null;

            const fileStore = new Map<string, string>(Object.entries(injectedOptions.files ?? {}));
            let themeId = injectedOptions.themeId ?? 'default-light';
            let openDirectoryResult: OpenDirectoryResult = injectedOptions.openDirectoryResult ?? null;
            let openFileResult: OpenFileResult = injectedOptions.openFileResult ?? null;

            const watchListeners = new Set<(payload: WatchPayload) => void>();
            const beforeCloseListeners = new Set<() => void>();
            const openFileListeners = new Set<(path: string) => void>();

            const toReadResult = (path: string) => {
                if (!fileStore.has(path)) {
                    return { success: false, error: `File not found: ${path}` };
                }
                return { success: true, content: fileStore.get(path) };
            };

            const electronAPI = {
                openDirectory: async () => openDirectoryResult,
                openFile: async () => openFileResult,
                readDirectoryTree: async () => openDirectoryResult?.tree ?? [],
                showSaveDialog: async () => null,
                readDir: async () => [],
                readFile: async (path: string) => toReadResult(path),
                writeFile: async (path: string, content: string) => {
                    fileStore.set(path, content);
                    return { success: true };
                },
                createFile: async (path: string, content = '') => {
                    fileStore.set(path, content);
                    return { success: true, path };
                },
                createDirectory: async (path: string) => ({ success: true, path }),
                rename: async (oldPath: string, newPath: string) => {
                    const oldContent = fileStore.get(oldPath);
                    if (typeof oldContent === 'string') {
                        fileStore.delete(oldPath);
                        fileStore.set(newPath, oldContent);
                    }
                    return { success: true };
                },
                delete: async (path: string) => {
                    fileStore.delete(path);
                    return { success: true };
                },
                move: async (srcPath: string, destPath: string) => {
                    const content = fileStore.get(srcPath);
                    if (typeof content === 'string') {
                        fileStore.delete(srcPath);
                        fileStore.set(destPath, content);
                    }
                    return { success: true };
                },
                copy: async (srcPath: string, destPath: string) => {
                    const content = fileStore.get(srcPath);
                    if (typeof content === 'string') {
                        fileStore.set(destPath, content);
                    }
                    return { success: true };
                },
                checkExists: async (path: string) => fileStore.has(path),
                showItemInFolder: async () => undefined,
                saveImage: async () => ({ success: true, path: 'mock-image.png' }),
                saveTempImage: async () => ({ success: true, path: 'mock-temp.png', url: 'mock://temp-image' }),
                getFilePath: (file: File) => file.name,
                exportToPDF: async () => ({ success: true }),
                exportToWord: async () => ({ success: true }),
                exportToZip: async () => ({ success: true }),
                getAllMarkdownFiles: async () => Array.from(fileStore.keys()).filter(path => path.endsWith('.md')),
                getDirname: async (path: string) => path.replace(/[\\/][^\\/]+$/, ''),
                pathJoin: async (...parts: string[]) => parts.filter(Boolean).join('/'),
                openExternal: async () => undefined,
                getSystemUsage: async () => ({ cpu: 0, memory: {} as Electron.ProcessMemoryInfo }),
                minimize: () => undefined,
                maximize: () => undefined,
                toggleMaximize: () => undefined,
                close: () => undefined,
                newWindow: async () => ({ success: true }),
                onOpenFile: (callback: (path: string) => void) => {
                    openFileListeners.add(callback);
                    return () => openFileListeners.delete(callback);
                },
                notifyReadyForFile: () => undefined,
                onBeforeClose: (callback: () => void) => {
                    beforeCloseListeners.add(callback);
                    return () => beforeCloseListeners.delete(callback);
                },
                confirmClose: () => undefined,
                cancelClose: () => undefined,
                getThemeList: async () => [],
                readThemeFile: async () => '',
                saveThemeId: async (nextThemeId: string) => {
                    themeId = nextThemeId;
                },
                loadThemeId: async () => themeId,
                watch: async () => undefined,
                onWatchEvent: (callback: (payload: WatchPayload) => void) => {
                    watchListeners.add(callback);
                    return () => watchListeners.delete(callback);
                },
                getExternalPluginList: async () => [],
                readPluginCode: async () => ({ success: false, error: 'No external plugins in playwright mock' }),
                readPluginDirectory: async () => ({}),
                loadWasm: async () => null,
                writeLog: async () => ({ success: true }),
                writeLogBatch: async () => ({ success: true }),
                readLogFile: async () => ({ success: true, content: '' }),
                clearLogs: async () => ({ success: true }),
            };

            Object.defineProperty(window, 'electronAPI', {
                value: electronAPI,
                configurable: true,
                writable: true,
            });

            Object.defineProperty(window, '__E2E__', {
                value: {
                    setFile(path: string, content: string) {
                        fileStore.set(path, content);
                    },
                    getFile(path: string) {
                        return fileStore.get(path) ?? null;
                    },
                    setOpenDirectoryResult(nextResult: OpenDirectoryResult) {
                        openDirectoryResult = nextResult;
                    },
                    setOpenFileResult(nextResult: OpenFileResult) {
                        openFileResult = nextResult;
                    },
                    emitWatchEvent(payload: WatchPayload) {
                        watchListeners.forEach(listener => listener(payload));
                    },
                    emitOpenFile(path: string) {
                        openFileListeners.forEach(listener => listener(path));
                    },
                    triggerBeforeClose() {
                        beforeCloseListeners.forEach(listener => listener());
                    },
                },
                configurable: true,
                writable: true,
            });
        },
        { injectedOptions: options },
    );
}
