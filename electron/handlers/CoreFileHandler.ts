/**
 * CoreFileHandler - 核心文件处理器
 * 
 * [Phase 9] 后端架构重构
 * 
 * 职责:
 * - 对话框 (dialog:openDirectory, dialog:showSaveDialog, dialog:openFile)
 * - 文件读写 (fs:readFile, fs:writeFile, fs:createFile, fs:createDirectory)
 * - CRUD 操作 (fs:rename, fs:delete, fs:move, fs:copy)
 * - 目录树 (fs:readDirectoryTree, fs:getAllMarkdownFiles)
 * - 路径工具 (path:dirname, path:join)
 * - 主题系统 (fs:getThemeList, fs:readThemeFile)
 * - 文件监听 (fs:watch)
 * 
 * 设计原则:
 * - 单一职责: 核心文件操作
 * - 无硬编码: 使用 channels.ts 常量
 * - 单例模式: 避免多次注册
 */

import { ipcMain, dialog, BrowserWindow, app, shell, IpcMainInvokeEvent } from 'electron';
import fs from 'fs';
import path from 'path';
import { SecurityManager } from '../core/security';
import { CORE_CHANNELS, FILE_TREE_LIMITS, PLUGIN_CHANNELS } from '../constants/channels';
import { MainLoggerHandler } from './MainLoggerHandler';

export class CoreFileHandler {
    private static instance: CoreFileHandler | null = null;
    private static isRegistered = false;

    private themeDir: string;
    private logger = MainLoggerHandler.initialize();
    private ns = 'CoreFileHandler';
    private watchers: Map<number, fs.FSWatcher> = new Map();

    /**
     * 初始化核心文件处理器（单例）
     */
    static initialize(): CoreFileHandler {
        if (CoreFileHandler.isRegistered) {
            return CoreFileHandler.instance!;
        }

        CoreFileHandler.instance = new CoreFileHandler();
        CoreFileHandler.isRegistered = true;
        return CoreFileHandler.instance;
    }

    private constructor() {
        const basePath = path.dirname(app.getPath('exe'));
        this.themeDir = process.env.NODE_ENV === 'development'
            ? path.resolve('.', 'themes')
            : path.join(basePath, 'themes');

        if (!fs.existsSync(this.themeDir)) {
            fs.mkdirSync(this.themeDir, { recursive: true });
        }

        this.registerHandlers();
    }

    private getWindow(event: IpcMainInvokeEvent): BrowserWindow | null {
        return BrowserWindow.fromWebContents(event.sender);
    }

    private ensurePathAllowed(targetPath: string): boolean {
        return SecurityManager.getInstance().validatePath(targetPath);
    }

    private ensureOperationPathsAllowed(paths: string[]): boolean {
        return paths.every((targetPath) => this.ensurePathAllowed(targetPath));
    }

    private registerHandlers() {
        this.logger.info(this.ns, 'Registering handlers...');

        // === 1. 对话框 ===
        ipcMain.handle(CORE_CHANNELS.DIALOG_OPEN_DIRECTORY, async (event) => {
            const win = this.getWindow(event);
            const result = await dialog.showOpenDialog(win!, { properties: ['openDirectory'] });
            if (result.canceled) return null;
            const dirPath = result.filePaths[0];
            SecurityManager.getInstance().addAllowedDir(dirPath);
            const tree = await this.generateFileTreeSafe(dirPath);
            return { path: dirPath, tree };
        });

        ipcMain.handle(CORE_CHANNELS.DIALOG_SHOW_SAVE, async (event, options) => {
            const win = this.getWindow(event);
            const { defaultPath, filters } = options || {};
            const result = await dialog.showSaveDialog(win!, {
                title: '保存文件',
                defaultPath: defaultPath || 'Untitled.md',
                filters: filters || [{ name: 'Markdown', extensions: ['md'] }]
            });
            if (result.canceled || !result.filePath) return null;
            const dirName = path.dirname(result.filePath);
            SecurityManager.getInstance().addAllowedDir(dirName);
            return result.filePath;
        });

        ipcMain.handle(CORE_CHANNELS.DIALOG_OPEN_FILE, async (event) => {
            const win = this.getWindow(event);
            const result = await dialog.showOpenDialog(win!, {
                properties: ['openFile', 'multiSelections'],
                filters: [
                    { name: 'Markdown', extensions: ['md'] },
                    { name: 'Text', extensions: ['txt'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });
            if (result.canceled || result.filePaths.length === 0) return null;

            const files: Array<{ path: string; content: string }> = [];
            for (const filePath of result.filePaths) {
                SecurityManager.getInstance().addAllowedDir(path.dirname(filePath));
                try {
                    const content = await fs.promises.readFile(filePath, 'utf-8');
                    files.push({ path: filePath, content });
                } catch (err) {
                    this.logger.error(this.ns, `Failed to read file: ${filePath}`, err);
                }
            }
            return files.length > 0 ? files : null;
        });

        // === 2. 文件读写 ===
        ipcMain.handle(CORE_CHANNELS.FS_READ_FILE, async (_event, filePath) => {
            try {
                if (!SecurityManager.getInstance().validatePath(filePath)) return { error: 'Access Denied' };
                const content = await fs.promises.readFile(filePath, 'utf-8');
                return { success: true, content };
            } catch (err: unknown) {
                const error = err as Error;
                return { error: error.message };
            }
        });

        ipcMain.handle(CORE_CHANNELS.FS_WRITE_FILE, async (_event, filePath, content) => {
            try {
                if (!SecurityManager.getInstance().validatePath(filePath)) return { success: false, error: 'Access Denied' };
                await fs.promises.writeFile(filePath, content, 'utf-8');
                return { success: true };
            } catch (err: unknown) {
                const error = err as Error;
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle(CORE_CHANNELS.FS_CREATE_FILE, async (_event, targetPath, content = '') => {
            try {
                if (!SecurityManager.getInstance().validatePath(targetPath)) return { error: 'Access Denied' };
                await fs.promises.writeFile(targetPath, content, 'utf-8');
                return { success: true, path: targetPath };
            } catch (err: unknown) {
                const error = err as Error;
                this.logger.error(this.ns, `FS_CREATE_FILE failed: ${targetPath}`, error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle(CORE_CHANNELS.FS_CREATE_DIRECTORY, async (_event, targetPath) => {
            try {
                if (!SecurityManager.getInstance().validatePath(targetPath)) return { error: 'Access Denied' };
                await fs.promises.mkdir(targetPath, { recursive: true });
                return { success: true, path: targetPath };
            } catch (err: unknown) {
                const error = err as Error;
                this.logger.error(this.ns, `FS_CREATE_DIRECTORY failed: ${targetPath}`, error);
                return { success: false, error: error.message };
            }
        });

        // === 3. CRUD 操作 ===
        ipcMain.handle(CORE_CHANNELS.FS_RENAME, async (_event, oldPath, newPath) => {
            try {
                if (!this.ensureOperationPathsAllowed([oldPath, newPath])) {
                    return { success: false, error: 'Access Denied' };
                }
                await fs.promises.rename(oldPath, newPath);
                return { success: true };
            } catch (err: unknown) {
                const error = err as Error;
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle(CORE_CHANNELS.FS_DELETE, async (_event, targetPath, moveToTrash) => {
            try {
                if (!SecurityManager.getInstance().validatePath(targetPath)) return { error: 'Access Denied' };
                if (moveToTrash) await shell.trashItem(targetPath);
                else await fs.promises.rm(targetPath, { recursive: true, force: true });
                return { success: true };
            } catch (err: unknown) {
                const error = err as Error;
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle(CORE_CHANNELS.FS_MOVE, async (_event, srcPath, destPath) => {
            try {
                if (!this.ensureOperationPathsAllowed([srcPath, destPath])) {
                    return { success: false, error: 'Access Denied' };
                }
                if (!fs.existsSync(srcPath)) return { success: false, error: 'Source not found' };
                const destDir = path.dirname(destPath);
                if (!fs.existsSync(destDir)) await fs.promises.mkdir(destDir, { recursive: true });
                try {
                    await fs.promises.rename(srcPath, destPath);
                } catch {
                    await fs.promises.cp(srcPath, destPath, { recursive: true });
                    await fs.promises.rm(srcPath, { recursive: true, force: true });
                }
                return { success: true };
            } catch (err: unknown) {
                const error = err as Error;
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle(CORE_CHANNELS.FS_COPY, async (_event, srcPath, destPath) => {
            try {
                if (!this.ensureOperationPathsAllowed([srcPath, destPath])) {
                    return { success: false, error: 'Access Denied' };
                }
                if (!fs.existsSync(srcPath)) return { success: false, error: 'Source not found' };
                const destDir = path.dirname(destPath);
                if (!fs.existsSync(destDir)) await fs.promises.mkdir(destDir, { recursive: true });
                await fs.promises.cp(srcPath, destPath, { recursive: true });
                return { success: true };
            } catch (err: unknown) {
                const error = err as Error;
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle(CORE_CHANNELS.FS_CHECK_EXISTS, async (_event, targetPath) => fs.existsSync(targetPath));
        ipcMain.handle(CORE_CHANNELS.FS_SHOW_IN_FOLDER, async (_event, targetPath) => shell.showItemInFolder(targetPath));

        // === 4. 目录树 ===
        ipcMain.handle(CORE_CHANNELS.FS_READ_DIRECTORY_TREE, async (_event, dirPath: string) => {
            if (!SecurityManager.getInstance().validatePath(dirPath)) {
                if (fs.existsSync(dirPath)) SecurityManager.getInstance().addAllowedDir(dirPath);
                else return [];
            }
            return await this.generateFileTreeSafe(dirPath);
        });

        ipcMain.handle(CORE_CHANNELS.FS_GET_ALL_MARKDOWN, async (_event, dirPath: string) => {
            return await this.getAllMarkdownFiles(dirPath);
        });

        // === 5. 路径工具 ===
        ipcMain.handle(CORE_CHANNELS.PATH_DIRNAME, (_event, filePath) => path.dirname(filePath));
        ipcMain.handle(CORE_CHANNELS.PATH_JOIN, (_event, ...args) => path.join(...args));
        ipcMain.handle(CORE_CHANNELS.PATH_USER_DATA, () => {
            const userDataPath = app.getPath('userData');
            SecurityManager.getInstance().addAllowedDir(userDataPath);
            return userDataPath;
        });

        // === 6. 主题系统 ===
        ipcMain.handle(CORE_CHANNELS.FS_GET_THEME_LIST, async () => {
            try {
                const files = await fs.promises.readdir(this.themeDir);
                return files.filter(f => f.endsWith('.css')).map(f => {
                    const baseName = f.replace('.css', '');
                    return {
                        id: baseName,  // [Phase 11 Fix] ID 不带 .css 后缀，确保与内置主题 ID 一致
                        name: baseName,
                        path: path.join(this.themeDir, f)
                    };
                });
            } catch (e) {
                this.logger.error(this.ns, "Failed to list themes", e);
                return [];
            }
        });

        ipcMain.handle(CORE_CHANNELS.FS_READ_THEME_FILE, async (_event, themePath) => {
            try {
                if (!themePath.startsWith(this.themeDir)) return "";
                return await fs.promises.readFile(themePath, 'utf-8');
            } catch (e) {
                return "";
            }
        });

        ipcMain.handle(CORE_CHANNELS.FS_SAVE_THEME_ID, async (_event, themeId: string) => {
            try {
                // [Portable] 存储在程序运行目录，实现绿色便携
                const basePath = process.env.NODE_ENV === 'development'
                    ? path.resolve('.')
                    : path.dirname(app.getPath('exe'));
                const themeConfigPath = path.join(basePath, 'theme.json');

                const data = JSON.stringify({ themeId });
                await fs.promises.writeFile(themeConfigPath, data, 'utf-8');
                return { success: true };
            } catch (e: any) {
                this.logger.error(this.ns, 'Failed to save theme ID:', e);
                return { success: false, error: e.message };
            }
        });

        ipcMain.handle(CORE_CHANNELS.FS_LOAD_THEME_ID, async () => {
            try {
                // [Portable] 从程序运行目录读取
                const basePath = process.env.NODE_ENV === 'development'
                    ? path.resolve('.')
                    : path.dirname(app.getPath('exe'));
                const themeConfigPath = path.join(basePath, 'theme.json');

                if (!fs.existsSync(themeConfigPath)) {
                    return null;
                }
                const data = await fs.promises.readFile(themeConfigPath, 'utf-8');
                const json = JSON.parse(data);
                return json.themeId || null;
            } catch (e) {
                this.logger.warn(this.ns, 'Failed to load theme ID:', e);
                return null;
            }
        });

        // === 7. 文件监听 ===
        ipcMain.handle(CORE_CHANNELS.FS_WATCH, async (event, dirPath: string) => {
            const win = this.getWindow(event);
            if (!win) return;

            const windowId = win.id;

            if (this.watchers.has(windowId)) {
                this.watchers.get(windowId)!.close();
                this.watchers.delete(windowId);
            }

            if (!dirPath || !fs.existsSync(dirPath)) return;

            try {
                const watcher = fs.watch(dirPath, { recursive: true }, (eventType, filename) => {
                    if (!win.isDestroyed()) {
                        win.webContents.send(CORE_CHANNELS.FS_WATCH_EVENT, { eventType, filename });
                    }
                });
                this.watchers.set(windowId, watcher);

                win.on('closed', () => {
                    if (this.watchers.has(windowId)) {
                        this.watchers.get(windowId)!.close();
                        this.watchers.delete(windowId);
                    }
                });
            } catch (e) {
                this.logger.error(this.ns, "Watch failed:", e);
            }
        });

        // === 8. [Phase 10 P3 -> Phase 13 Portable] 外部插件系统 ===
        // [Phase 13] 使用 EXE 同级目录，实现便携化（与 themeDir 保持一致）
        const basePath = path.dirname(app.getPath('exe'));
        const pluginsDir = process.env.NODE_ENV === 'development'
            ? path.resolve('.', 'plugins')
            : path.join(basePath, 'plugins');

        ipcMain.handle(PLUGIN_CHANNELS.GET_EXTERNAL_PLUGIN_LIST, async () => {
            try {
                if (!fs.existsSync(pluginsDir)) {
                    fs.mkdirSync(pluginsDir, { recursive: true });
                    return [];
                }

                const dirs = await fs.promises.readdir(pluginsDir, { withFileTypes: true });
                const plugins: Array<{ id: string; name: string; version: string; path: string; main: string; hidden?: boolean }> = [];

                for (const dir of dirs) {
                    if (!dir.isDirectory()) continue;
                    const pluginPath = path.join(pluginsDir, dir.name);
                    const manifestPath = path.join(pluginPath, 'manifest.json');

                    if (!fs.existsSync(manifestPath)) continue;

                    try {
                        const manifestData = await fs.promises.readFile(manifestPath, 'utf-8');
                        const manifest = JSON.parse(manifestData);

                        if (!manifest.id || !manifest.name || !manifest.version || !manifest.main) {
                            this.logger.warn(this.ns, `Invalid manifest in ${dir.name}`);
                            continue;
                        }

                        plugins.push({
                            id: manifest.id,
                            name: manifest.name,
                            version: manifest.version,
                            path: pluginPath,
                            main: manifest.main,
                            hidden: manifest.hidden
                        });
                    } catch (e) {
                        this.logger.error(this.ns, `Failed to parse manifest in ${dir.name}`, e);
                    }
                }

                return plugins;
            } catch (e) {
                this.logger.error(this.ns, 'Failed to list external plugins', e);
                return [];
            }
        });

        ipcMain.handle(PLUGIN_CHANNELS.READ_PLUGIN_CODE, async (_event, pluginPath: string) => {
            try {
                // 安全检查：必须在 pluginsDir 下
                const normalizedPath = path.normalize(pluginPath);
                if (!normalizedPath.startsWith(pluginsDir)) {
                    return { success: false, error: 'Security: Path outside plugins directory' };
                }

                if (!fs.existsSync(normalizedPath)) {
                    return { success: false, error: 'Plugin file not found' };
                }

                const code = await fs.promises.readFile(normalizedPath, 'utf-8');
                return { success: true, code };
            } catch (e: any) {
                return { success: false, error: e.message };
            }
        });

        // [New in Phase 13] 递归读取插件目录下的所有 JS 文件
        ipcMain.handle(PLUGIN_CHANNELS.READ_PLUGIN_DIRECTORY, async (_event, pluginPath: string) => {
            try {
                const normalizedRoot = path.normalize(pluginPath);
                // 安全检查
                if (!normalizedRoot.startsWith(pluginsDir)) {
                    throw new Error('Security: Path outside plugins directory');
                }

                if (!fs.existsSync(normalizedRoot)) {
                    throw new Error('Plugin directory not found');
                }

                const results: Record<string, string> = {};

                const scanDir = async (currentPath: string) => {
                    const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
                    for (const entry of entries) {
                        const fullPath = path.join(currentPath, entry.name);
                        const relPath = path.relative(normalizedRoot, fullPath).replace(/\\/g, '/');

                        if (entry.isDirectory()) {
                            await scanDir(fullPath);
                        } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.json'))) {
                            const content = await fs.promises.readFile(fullPath, 'utf-8');
                            results[relPath] = content;
                        }
                    }
                };

                await scanDir(normalizedRoot);
                return results;
            } catch (e) {
                this.logger.error(this.ns, 'Failed to read plugin directory', e);
                return {};
            }
        });

        ipcMain.handle(PLUGIN_CHANNELS.LOAD_WASM, async (_event, name: string) => {
            try {
                // [Portable] WASM 存储在 resources/bin 目录下
                const basePath = process.env.NODE_ENV === 'development'
                    ? path.resolve('.')
                    : path.dirname(app.getPath('exe'));
                const wasmPath = path.join(basePath, 'resources', 'bin', name);

                if (!fs.existsSync(wasmPath)) {
                    this.logger.error(this.ns, `WASM not found: ${wasmPath}`);
                    return null;
                }

                const buffer = await fs.promises.readFile(wasmPath);
                return new Uint8Array(buffer);
            } catch (e) {
                console.error('[CoreFileHandler] Failed to load WASM:', e);
                return null;
            }
        });

        this.logger.info(this.ns, 'Handlers registered successfully.');
    }

    // === 辅助方法 ===

    /** 生成安全的文件树（限制深度和文件数量） */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private async generateFileTreeSafe(rootDir: string): Promise<any[]> {
        let fileCount = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const traverse = async (currentPath: string, depth: number): Promise<any[]> => {
            if (depth > FILE_TREE_LIMITS.MAX_DEPTH) return [];
            if (fileCount > FILE_TREE_LIMITS.MAX_FILES_TOTAL) return [];
            try {
                const stats = await fs.promises.stat(currentPath);
                if (!stats.isDirectory()) return [];
                const children = await fs.promises.readdir(currentPath);
                const jobs = children.map(async (child) => {
                    if (child.startsWith('.') || child === 'node_modules' || child === '.git' || child === 'dist') return null;
                    const childPath = path.join(currentPath, child);
                    try {
                        const childStats = await fs.promises.stat(childPath);
                        const isDirectory = childStats.isDirectory();
                        fileCount++;
                        if (fileCount > FILE_TREE_LIMITS.MAX_FILES_TOTAL) return null;
                        if (isDirectory || child.endsWith('.md') || child.endsWith('.txt')) {
                            return { name: child, path: childPath, isDirectory, children: isDirectory ? await traverse(childPath, depth + 1) : undefined };
                        }
                    } catch {
                        return null;
                    }
                    return null;
                });
                const results = await Promise.all(jobs);
                return results
                    .filter((item) => item !== null)
                    .sort((a, b) => {
                        if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
                        return a.isDirectory ? -1 : 1;
                    });
            } catch {
                return [];
            }
        };
        return traverse(rootDir, 0);
    }

    private async getAllMarkdownFiles(dirPath: string): Promise<string[]> {
        const results: string[] = [];

        const traverse = async (currentPath: string): Promise<void> => {
            try {
                const stats = await fs.promises.stat(currentPath);
                if (stats.isFile() && currentPath.toLowerCase().endsWith('.md')) {
                    results.push(currentPath);
                } else if (stats.isDirectory()) {
                    const children = await fs.promises.readdir(currentPath);
                    for (const child of children) {
                        if (child.startsWith('.') || child === 'node_modules' || child === 'dist') continue;
                        await traverse(path.join(currentPath, child));
                    }
                }
            } catch (e) {
                this.logger.error(this.ns, 'Error traversing:', { path: currentPath, error: e });
            }
        };

        await traverse(dirPath);
        return results;
    }
}
