import React, { useState, useEffect, useRef } from 'react';
import { useKernel } from '@/kernel/core/KernelContext';
import { ServiceId } from '@/kernel/core/ServiceId';
import { LogLevel, LOG_LEVEL_NAMES, ILogEntry, LoggerService } from '@/kernel/services/LoggerService';
import { cn } from '@/shared/utils';
import { Trash2, Download, Filter, RefreshCw } from 'lucide-react';

/**
 * LogPanel - 日志查看面板
 * 
 * Logger UI Plugin
 * 
 * 功能:
 * 1. 实时显示日志流
 * 2. 按级别筛选
 * 3. 清空日志
 * 4. 导出日志文件
 */
export function LogPanel() {
    const kernel = useKernel();
    const loggerService = kernel.getService<LoggerService>(ServiceId.LOGGER, false);

    const [logs, setLogs] = useState<ILogEntry[]>([]);
    const [filterLevel, setFilterLevel] = useState<LogLevel>(LogLevel.DEBUG);
    const [autoScroll, setAutoScroll] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);

    // 初始化：加载已有缓冲区日志
    useEffect(() => {
        if (loggerService) {
            setLogs(loggerService.getBufferedLogs());
        }
    }, [loggerService]);

    // 订阅新日志
    useEffect(() => {
        if (!loggerService) return;

        const unsubscribe = loggerService.onLog((entry: ILogEntry) => {
            setLogs(prev => {
                const newLogs = [...prev, entry];
                // 限制显示数量
                if (newLogs.length > 500) {
                    return newLogs.slice(-500);
                }
                return newLogs;
            });
        });

        return unsubscribe;
    }, [loggerService]);

    // 自动滚动到底部
    useEffect(() => {
        if (autoScroll && containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [logs, autoScroll]);

    // 筛选后的日志
    const filteredLogs = logs.filter(log => log.level >= filterLevel);

    // 清空日志
    const handleClear = async () => {
        loggerService?.clearBuffer();
        setLogs([]);
    };

    // 导出日志
    const handleExport = async () => {
        const result = await loggerService?.readLogFile();
        if (result?.success && result.content) {
            const blob = new Blob([result.content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `app-log-${new Date().toISOString().split('T')[0]}.log`;
            a.click();
            URL.revokeObjectURL(url);
        }
    };

    // 刷新日志
    const handleRefresh = () => {
        if (loggerService) {
            setLogs(loggerService.getBufferedLogs());
        }
    };

    // 获取日志级别的样式
    const getLevelClass = (level: LogLevel): string => {
        switch (level) {
            case LogLevel.DEBUG:
                return 'text-muted-foreground/60';
            case LogLevel.INFO:
                return 'text-primary';
            case LogLevel.WARN:
                return 'text-yellow-500/80 dark:text-yellow-400/80';
            case LogLevel.ERROR:
                return 'text-destructive';
            default:
                return 'text-muted-foreground/60';
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="flex items-center gap-2 pb-3 border-b border-border/30">
                {/* 级别筛选 */}
                <div className="flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                    <select
                        value={filterLevel}
                        onChange={(e) => setFilterLevel(Number(e.target.value) as LogLevel)}
                        className="text-xs px-2 py-1 border border-border/50 rounded bg-background"
                    >
                        <option value={LogLevel.DEBUG}>DEBUG</option>
                        <option value={LogLevel.INFO}>INFO</option>
                        <option value={LogLevel.WARN}>WARN</option>
                        <option value={LogLevel.ERROR}>ERROR</option>
                    </select>
                </div>

                {/* 自动滚动 */}
                <label className="flex items-center gap-1 text-xs cursor-pointer">
                    <input
                        type="checkbox"
                        checked={autoScroll}
                        onChange={(e) => setAutoScroll(e.target.checked)}
                        className="w-3 h-3"
                    />
                    自动滚动
                </label>

                <div className="flex-1" />

                {/* 操作按钮 */}
                <button
                    onClick={handleRefresh}
                    className="p-1.5 hover:bg-muted rounded text-muted-foreground"
                    title="刷新"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={handleExport}
                    className="p-1.5 hover:bg-muted rounded text-muted-foreground"
                    title="导出日志"
                >
                    <Download className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={handleClear}
                    className="p-1.5 hover:bg-muted rounded text-red-400"
                    title="清空日志"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* 日志列表 */}
            <div
                ref={containerRef}
                className="flex-1 overflow-y-auto font-mono text-xs leading-relaxed mt-2 bg-muted/20 border border-border/20 rounded p-2 custom-scrollbar"
                style={{ maxHeight: '380px' }}
            >
                {filteredLogs.length === 0 ? (
                    <div className="text-muted-foreground text-center py-8">
                        暂无日志
                    </div>
                ) : (
                    filteredLogs.map(log => (
                        <div key={log.id} className="flex items-start gap-2 py-0.5 hover:bg-accent/10 transition-colors">
                            <span className="text-muted-foreground/50 shrink-0">
                                {log.timestamp.split('T')[1]?.split('.')[0] || log.timestamp}
                            </span>
                            <span className={cn('shrink-0 w-12 font-bold', getLevelClass(log.level))}>
                                [{LOG_LEVEL_NAMES[log.level]}]
                            </span>
                            <span className="text-primary/60 shrink-0 italic">
                                [{log.namespace}]
                            </span>
                            <span className="text-foreground/90 break-all">
                                {log.message}
                                {log.data && (
                                    <span className="text-muted-foreground/50 ml-2 italic">
                                        {JSON.stringify(log.data)}
                                    </span>
                                )}
                            </span>
                        </div>
                    ))
                )}
            </div>

            {/* 统计 */}
            <div className="text-xs text-muted-foreground mt-2">
                显示 {filteredLogs.length} / {logs.length} 条日志
            </div>
        </div>
    );
}
