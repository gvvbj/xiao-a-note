/**
 * LoggerService - 内核日志服务
 * 
 * 统一日志系统
 * 
 * 职责:
 * 1. 提供统一的日志 API (debug/info/warn/error)
 * 2. 维护内存缓冲区以供 UI 实时展示
 * 3. 通过 IPC 发送日志到主进程写入文件
 * 4. 发送事件以便 UI 订阅
 * 
 * 设计原则:
 * - 零硬编码: 使用常量定义日志级别和配置
 * - 单例模式: 作为 Kernel 核心服务
 */

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
 * 日志级别名称映射
 */
export const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
    [LogLevel.DEBUG]: 'DEBUG',
    [LogLevel.INFO]: 'INFO',
    [LogLevel.WARN]: 'WARN',
    [LogLevel.ERROR]: 'ERROR'
};

/**
 * 日志配置常量
 */
export const LOGGER_UI_CONFIG = {
    /** 内存缓冲区最大条目数 */
    MAX_BUFFER_SIZE: 1000,
    /** 批量写入阈值 */
    BATCH_THRESHOLD: 10,
    /** 批量写入延迟 (ms) */
    BATCH_DELAY: 500
} as const;

/**
 * 日志条目接口
 */
export interface ILogEntry {
    id: string;
    timestamp: string;
    level: LogLevel;
    namespace: string;
    message: string;
    data?: any;
}

/**
 * Logger 实例接口
 */
export interface ILogger {
    debug(message: string, data?: any): void;
    info(message: string, data?: any): void;
    warn(message: string, data?: any): void;
    error(message: string, data?: any): void;
}

/**
 * 日志事件类型
 */
export type LogEventHandler = (entry: ILogEntry) => void;

/**
 * LoggerService - 统一日志服务
 */
export class LoggerService {
    private static instance: LoggerService | null = null;

    private buffer: ILogEntry[] = [];
    private pendingBatch: ILogEntry[] = [];
    private batchTimer: ReturnType<typeof setTimeout> | null = null;
    private eventHandlers: Set<LogEventHandler> = new Set();
    private entryIdCounter = 0;
    private api = window.electronAPI;

    /**
     * 获取单例实例
     */
    static getInstance(): LoggerService {
        if (!LoggerService.instance) {
            LoggerService.instance = new LoggerService();
        }
        return LoggerService.instance;
    }

    private constructor() {
        // 构造阶段不输出 console，统一由 Logger API 控制日志出口。
    }

    /**
     * 创建带命名空间的 Logger 实例
     */
    createLogger(namespace: string): ILogger {
        return {
            debug: (message: string, data?: any) => this.log(LogLevel.DEBUG, namespace, message, data),
            info: (message: string, data?: any) => this.log(LogLevel.INFO, namespace, message, data),
            warn: (message: string, data?: any) => this.log(LogLevel.WARN, namespace, message, data),
            error: (message: string, data?: any) => this.log(LogLevel.ERROR, namespace, message, data)
        };
    }

    /**
     * 记录日志
     */
    private log(level: LogLevel, namespace: string, message: string, data?: any): void {
        const entry: ILogEntry = {
            id: `log_${++this.entryIdCounter}`,
            timestamp: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
            level,
            namespace,
            message,
            data
        };

        // 1. 添加到内存缓冲区
        this.addToBuffer(entry);

        // 2. 同时输出到控制台 (开发调试)
        this.logToConsole(entry);

        // 3. 发送事件通知 UI
        this.emit(entry);

        // 4. 添加到待写入批次
        this.addToPendingBatch(entry);
    }

    /**
     * 添加到内存缓冲区 (Ring Buffer)
     */
    private addToBuffer(entry: ILogEntry): void {
        this.buffer.push(entry);
        // 超过最大容量时移除最旧的条目
        while (this.buffer.length > LOGGER_UI_CONFIG.MAX_BUFFER_SIZE) {
            this.buffer.shift();
        }
    }

    /**
     * 输出到控制台
     */
    private logToConsole(entry: ILogEntry): void {
        const levelName = LOG_LEVEL_NAMES[entry.level];
        const prefix = `[${entry.timestamp}] [${levelName}] [${entry.namespace}]`;
        const args = entry.data ? [prefix, entry.message, entry.data] : [prefix, entry.message];

        switch (entry.level) {
            case LogLevel.DEBUG:
                console.debug(...args);
                break;
            case LogLevel.INFO:
                console.info(...args);
                break;
            case LogLevel.WARN:
                console.warn(...args);
                break;
            case LogLevel.ERROR:
                console.error(...args);
                break;
        }
    }

    /**
     * 添加到待写入批次
     */
    private addToPendingBatch(entry: ILogEntry): void {
        this.pendingBatch.push(entry);

        // 达到阈值立即写入
        if (this.pendingBatch.length >= LOGGER_UI_CONFIG.BATCH_THRESHOLD) {
            this.flushBatch();
            return;
        }

        // 否则设置延迟写入
        if (!this.batchTimer) {
            this.batchTimer = setTimeout(() => {
                this.flushBatch();
            }, LOGGER_UI_CONFIG.BATCH_DELAY);
        }
    }

    /**
     * 刷新批次到主进程
     */
    private async flushBatch(): Promise<void> {
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }

        if (this.pendingBatch.length === 0) {
            return;
        }

        const entriesToWrite = this.pendingBatch.splice(0, this.pendingBatch.length);

        try {
            await this.api.writeLogBatch(entriesToWrite.map(e => ({
                timestamp: e.timestamp,
                level: e.level,
                namespace: e.namespace,
                message: e.message,
                data: e.data
            })));
        } catch (e) {
            console.error('[LoggerService] Failed to write logs to file:', e);
        }
    }

    /**
     * 发送事件
     */
    private emit(entry: ILogEntry): void {
        this.eventHandlers.forEach(handler => {
            try {
                handler(entry);
            } catch (e) {
                console.error('[LoggerService] Event handler error:', e);
            }
        });
    }

    /**
     * 订阅日志事件
     */
    onLog(handler: LogEventHandler): () => void {
        this.eventHandlers.add(handler);
        return () => {
            this.eventHandlers.delete(handler);
        };
    }

    /**
     * 获取内存缓冲区中的日志
     */
    getBufferedLogs(): ILogEntry[] {
        return [...this.buffer];
    }

    /**
     * 清空内存缓冲区
     */
    clearBuffer(): void {
        this.buffer = [];
    }

    /**
     * 读取日志文件内容 (用于 UI 导出)
     */
    async readLogFile(): Promise<{ success: boolean; content?: string; error?: string }> {
        return await this.api.readLogFile();
    }

    /**
     * 清理所有日志 (内存 + 文件)
     */
    async clearAllLogs(): Promise<{ success: boolean; error?: string }> {
        this.clearBuffer();
        return await this.api.clearLogs();
    }
}

/**
 * 全局日志服务实例
 */
export const loggerService = LoggerService.getInstance();
