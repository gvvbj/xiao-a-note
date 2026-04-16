/**
 * MainLoggerHandler - 主进程日志处理器
 * 
 * [Phase 10 P4] 统一日志系统
 * 
 * 职责:
 * 1. 接收 Renderer 进程的日志写入请求
 * 2. 写入日志文件 (%APPDATA%/logs/app.log)
 * 3. 实现日志文件轮转 (Size > 10MB 时备份)
 * 
 * 设计原则:
 * - 零硬编码: 使用 channels.ts 常量
 * - 单例模式: 避免多次注册
 */

import { ipcMain, app } from 'electron';
import fs from 'fs';
import path from 'path';
import { LOGGER_CHANNELS, LOGGER_CONFIG } from '../constants/channels';

/**
 * 日志级别枚举
 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

/**
 * 日志条目接口
 */
export interface ILogEntry {
    timestamp: string;
    level: LogLevel;
    namespace: string;
    message: string;
    data?: any;
}

export class MainLoggerHandler {
    private static instance: MainLoggerHandler | null = null;
    private static isRegistered = false;

    private logDir: string;
    private logFilePath: string;
    private writeQueue: string[] = [];
    private isWriting = false;

    /**
     * 初始化日志处理器（单例）
     */
    static initialize(): MainLoggerHandler {
        if (MainLoggerHandler.isRegistered) {
            return MainLoggerHandler.instance!;
        }

        MainLoggerHandler.instance = new MainLoggerHandler();
        MainLoggerHandler.isRegistered = true;
        return MainLoggerHandler.instance;
    }

    private constructor() {
        // 开发环境：项目根目录/.logs
        // 生产环境：%APPDATA%/frontend-notes/.logs（app.getPath('userData')）
        // 注意：生产环境不能用 app.getAppPath()，因为返回的是 app.asar 路径，
        //       在 asar 包内 mkdirSync 会触发 ENOTDIR 错误。
        const isDev = process.env.NODE_ENV === 'development';
        const baseDir = isDev ? process.cwd() : app.getPath('userData');
        this.logDir = path.join(baseDir, '.' + LOGGER_CONFIG.DIR_NAME); // .logs
        this.logFilePath = path.join(this.logDir, LOGGER_CONFIG.FILE_NAME);

        // 确保日志目录存在
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }

        this.registerHandlers();
        console.log(`[MainLoggerHandler] Initialized. Log path: ${this.logFilePath}`);
    }

    private registerHandlers() {
        // === 写入单条日志 ===
        ipcMain.handle(LOGGER_CHANNELS.WRITE_LOG, async (_event, entry: ILogEntry) => {
            await this.writeLog(entry);
            return { success: true };
        });

        // === 批量写入日志 ===
        ipcMain.handle(LOGGER_CHANNELS.WRITE_LOG_BATCH, async (_event, entries: ILogEntry[]) => {
            for (const entry of entries) {
                await this.writeLog(entry);
            }
            return { success: true };
        });

        // === 读取日志文件 (用于 UI 导出) ===
        ipcMain.handle(LOGGER_CHANNELS.READ_LOG_FILE, async () => {
            try {
                if (!fs.existsSync(this.logFilePath)) {
                    return { success: true, content: '' };
                }
                const content = await fs.promises.readFile(this.logFilePath, 'utf-8');
                return { success: true, content };
            } catch (e: any) {
                return { success: false, error: e.message };
            }
        });

        // === 清理日志文件 ===
        ipcMain.handle(LOGGER_CHANNELS.CLEAR_LOGS, async () => {
            try {
                if (fs.existsSync(this.logFilePath)) {
                    await fs.promises.writeFile(this.logFilePath, '');
                }
                // 清理备份文件
                for (let i = 1; i <= LOGGER_CONFIG.MAX_BACKUP_COUNT; i++) {
                    const backupPath = `${this.logFilePath}.${i}`;
                    if (fs.existsSync(backupPath)) {
                        await fs.promises.unlink(backupPath);
                    }
                }
                return { success: true };
            } catch (e: any) {
                return { success: false, error: e.message };
            }
        });

        console.log('[MainLoggerHandler] Handlers registered successfully.');
    }

    /**
     * 写入单条日志
     */
    public async writeLog(entry: ILogEntry): Promise<void> {
        const line = this.formatLogEntry(entry);
        this.writeQueue.push(line);
        await this.processQueue();
    }

    /**
     * 主进程内部使用的日志便捷方法
     */
    public info(namespace: string, message: string, data?: any) {
        this.writeLog({
            timestamp: new Date().toISOString(),
            level: LogLevel.INFO,
            namespace,
            message,
            data
        });
    }

    public warn(namespace: string, message: string, data?: any) {
        this.writeLog({
            timestamp: new Date().toISOString(),
            level: LogLevel.WARN,
            namespace,
            message,
            data
        });
    }

    public error(namespace: string, message: string, data?: any) {
        this.writeLog({
            timestamp: new Date().toISOString(),
            level: LogLevel.ERROR,
            namespace,
            message,
            data
        });
    }

    /**
     * 格式化日志条目
     */
    private formatLogEntry(entry: ILogEntry): string {
        const levelStr = LogLevel[entry.level] || 'INFO';
        const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
        return `[${entry.timestamp}] [${levelStr}] [${entry.namespace}] ${entry.message}${dataStr}\n`;
    }

    /**
     * 处理写入队列 (防止并发写入)
     */
    private async processQueue(): Promise<void> {
        if (this.isWriting || this.writeQueue.length === 0) {
            return;
        }

        this.isWriting = true;

        try {
            // 检查是否需要轮转
            await this.checkAndRotate();

            // 取出所有待写入内容
            const lines = this.writeQueue.splice(0, this.writeQueue.length);
            const content = lines.join('');

            // 追加写入
            await fs.promises.appendFile(this.logFilePath, content, 'utf-8');
        } catch (e) {
            console.error('[MainLoggerHandler] Write failed:', e);
        } finally {
            this.isWriting = false;

            // 如果队列中还有新内容，继续处理
            if (this.writeQueue.length > 0) {
                await this.processQueue();
            }
        }
    }

    /**
     * 检查并执行日志轮转
     */
    private async checkAndRotate(): Promise<void> {
        try {
            if (!fs.existsSync(this.logFilePath)) {
                return;
            }

            const stats = await fs.promises.stat(this.logFilePath);

            if (stats.size >= LOGGER_CONFIG.MAX_FILE_SIZE) {
                console.log('[MainLoggerHandler] Log rotation triggered (size exceeded)');
                await this.rotateLogFiles();
            }
        } catch (e) {
            console.error('[MainLoggerHandler] Rotation check failed:', e);
        }
    }

    /**
     * 执行日志文件轮转
     * app.log -> app.log.1 -> app.log.2 -> app.log.3 (删除)
     */
    private async rotateLogFiles(): Promise<void> {
        // 从最老的备份开始处理
        const maxBackup: number = LOGGER_CONFIG.MAX_BACKUP_COUNT;
        for (let i = maxBackup; i >= 1; i--) {
            const oldPath = i === 1 ? this.logFilePath : `${this.logFilePath}.${i - 1}`;
            const newPath = `${this.logFilePath}.${i}`;

            if (fs.existsSync(oldPath)) {
                // 最后一个备份直接删除
                if (i === LOGGER_CONFIG.MAX_BACKUP_COUNT && fs.existsSync(newPath)) {
                    await fs.promises.unlink(newPath);
                }
                await fs.promises.rename(oldPath, newPath);
            }
        }

        // 创建新的空日志文件
        await fs.promises.writeFile(this.logFilePath, '');
        console.log('[MainLoggerHandler] Log rotation completed');
    }
}
