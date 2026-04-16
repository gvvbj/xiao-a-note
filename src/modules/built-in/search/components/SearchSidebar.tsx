import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, FileText, X, ChevronDown } from 'lucide-react';
import { MarkdownBadge } from '@/shared/components/ui/MarkdownBadge';
import { useKernel, useService } from '@/kernel/core/KernelContext';
import { useWorkspace } from '@/kernel/hooks/useWorkspace';
import { useTabs } from '@/kernel/hooks/useTabs';
import { IFileSystem } from '@/kernel/interfaces/IFileSystem';
import { SearchService, SearchResult } from '../services/SearchService';
import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import { LoggerService } from '@/kernel/services/LoggerService';
import { cn } from '@/shared/utils';

/**
 * SearchSidebar - 全局搜索侧边栏
 * 
 * 遵循原则:
 * - 0 硬编码: 搜索逻辑委托给 SearchService
 * - Plugin-First: 通过插件注册到侧边栏
 */
const SEARCH_PAGE_SIZE = 10;
const GLOBAL_MATCH_LIMIT = 50000;

const cachedState = {
    query: '',
    results: [] as SearchResult[],
    collapsedFiles: new Set<string>(),
    visibleLimits: {} as Record<string, number>,
    scrollPosition: 0
};

export function SearchSidebar() {
    const kernel = useKernel();
    const fileSystem = useService<IFileSystem>(ServiceId.FILE_SYSTEM);
    const loggerService = useService<LoggerService>(ServiceId.LOGGER, false);
    const { projectRoot } = useWorkspace();
    const { getTabContent, tabs } = useTabs();

    // [防闪烁] 用 ref 存储最新 tabs，避免 tabs 引用变化导致 performSearch 重建
    // 打断 TABS_CHANGED → performSearch 重建 → useEffect 重触发搜索 的级联链
    const tabsRef = useRef(tabs);
    tabsRef.current = tabs;

    const [query, setQuery] = useState(cachedState.query);
    const [results, setResults] = useState<SearchResult[]>(cachedState.results);
    const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set(cachedState.collapsedFiles));
    const [visibleLimits, setVisibleLimits] = useState<Record<string, number>>({ ...cachedState.visibleLimits });
    const [isSearching, setIsSearching] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const logger = React.useMemo(
        () => loggerService?.createLogger('SearchSidebar'),
        [loggerService]
    );

    const searchService = React.useMemo(
        () => fileSystem ? new SearchService(fileSystem, logger) : null,
        [fileSystem, logger]
    );

    // 监听外部触发的刷新（如新建文件、保存等）
    useEffect(() => {
        const handleRefresh = () => setRefreshTrigger(prev => prev + 1);
        kernel.on(CoreEvents.FS_FILE_CREATED, handleRefresh);
        kernel.on(CoreEvents.FS_FILE_DELETED, handleRefresh);
        kernel.on(CoreEvents.FILE_SAVED, handleRefresh);

        return () => {
            kernel.off(CoreEvents.FS_FILE_CREATED, handleRefresh);
            kernel.off(CoreEvents.FS_FILE_DELETED, handleRefresh);
            kernel.off(CoreEvents.FILE_SAVED, handleRefresh);
        };
    }, [kernel]);

    // Sync state to cache
    useEffect(() => {
        cachedState.query = query;
        cachedState.results = results;
        cachedState.collapsedFiles = collapsedFiles;
        cachedState.visibleLimits = visibleLimits;
    }, [query, results, collapsedFiles, visibleLimits]);

    const performSearch = useCallback(async (currentQuery: string) => {
        if (!currentQuery.trim() || !projectRoot || !searchService) {
            setResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const getLiveContent = (path: string) => getTabContent(path);
            const tabPaths = tabsRef.current.map(t => t.path).filter(Boolean) as string[];

            const searchResults = await searchService.search(
                currentQuery,
                projectRoot,
                getLiveContent,
                tabPaths
            );
            setResults(searchResults);
        } catch (e) {
            logger?.error('Search failed:', e);
            setResults([]);
        } finally {
            setIsSearching(false);
        }
    }, [projectRoot, searchService, getTabContent]);

    // 防抖搜索
    useEffect(() => {
        const timer = setTimeout(() => {
            performSearch(query);
            if (query !== cachedState.query) {
                setCollapsedFiles(new Set());
                setVisibleLimits({});
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query, refreshTrigger, performSearch]);

    const handleResultClick = useCallback((result: SearchResult) => {
        // 打开文件
        kernel.emit(CoreEvents.OPEN_FILE, result.filePath);

        // 发送精确选中指令
        setTimeout(() => {
            kernel.emit(CoreEvents.EDITOR_SELECT_MATCH, {
                line: result.lineNumber,
                matchIndex: result.matchIndex,
                matchLength: result.matchLength
            });
        }, 100);
    }, [kernel]);

    const handleClear = () => {
        setQuery('');
        setResults([]);
        setVisibleLimits({});
    };

    const toggleCollapse = (filePath: string) => {
        const newSet = new Set(collapsedFiles);
        if (newSet.has(filePath)) {
            newSet.delete(filePath);
        } else {
            newSet.add(filePath);
        }
        setCollapsedFiles(newSet);
    };

    const showMore = (filePath: string) => {
        setVisibleLimits(prev => ({
            ...prev,
            [filePath]: (prev[filePath] || SEARCH_PAGE_SIZE) + SEARCH_PAGE_SIZE
        }));
    };

    // 按文件和行号分组结果
    const groupedResults = React.useMemo(() => {
        const fileGroups: Record<string, { matches: SearchResult[], lines: Record<number, SearchResult[]> }> = {};

        for (const result of results) {
            if (!fileGroups[result.filePath]) {
                fileGroups[result.filePath] = { matches: [], lines: {} };
            }
            fileGroups[result.filePath].matches.push(result);

            if (!fileGroups[result.filePath].lines[result.lineNumber]) {
                fileGroups[result.filePath].lines[result.lineNumber] = [];
            }
            fileGroups[result.filePath].lines[result.lineNumber].push(result);
        }

        return fileGroups;
    }, [results]);

    return (
        <div className="flex flex-col h-full">
            {/* 标题 */}
            <div className="px-4 py-3 border-b border-border/50">
                <h2 className="text-sm font-medium text-foreground">搜索</h2>
            </div>

            {/* 搜索框 */}
            <div className="p-3 border-b border-border/30">
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="搜索文件内容 (支持正则及实时预览)..."
                        className="w-full pl-8 pr-8 py-1.5 text-sm bg-background border border-border/50 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                    {query && (
                        <button
                            onClick={handleClear}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded"
                        >
                            <X className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                    )}
                </div>
            </div>

            {/* 搜索结果 */}
            <div className="flex-1 overflow-y-auto">
                {!projectRoot ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        请先打开文件夹
                    </div>
                ) : isSearching ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        搜索中...
                    </div>
                ) : results.length === 0 && query ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        未找到匹配结果
                    </div>
                ) : (
                    Object.entries(groupedResults).map(([filePath, fileData]) => {
                        const isCollapsed = collapsedFiles.has(filePath);
                        const sortedLineNumbers = Object.keys(fileData.lines)
                            .map(Number)
                            .sort((a, b) => a - b);

                        const limit = visibleLimits[filePath] || SEARCH_PAGE_SIZE;
                        const visibleLineNumbers = sortedLineNumbers.slice(0, limit);
                        const hasMore = sortedLineNumbers.length > limit;

                        return (
                            <div key={filePath} className="border-b border-border/20">
                                {/* 文件名 */}
                                <div
                                    className="px-3 py-2 bg-muted/30 text-xs font-medium text-muted-foreground flex items-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors select-none"
                                    onClick={() => toggleCollapse(filePath)}
                                >
                                    <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isCollapsed && "-rotate-90")} />
                                    {filePath.endsWith('.md') ? <MarkdownBadge className="mr-0" /> : <FileText className="w-3.5 h-3.5" />}
                                    <span className="truncate">{fileData.matches[0].fileName}</span>
                                    <span className="ml-auto text-[10px]">
                                        {fileData.matches.length}
                                    </span>
                                </div>

                                {/* 匹配行 */}
                                {!isCollapsed && (
                                    <>
                                        {visibleLineNumbers.map((lineNum) => {
                                            const lineMatches = fileData.lines[lineNum];
                                            const firstMatch = lineMatches[0];

                                            return (
                                                <button
                                                    key={`${filePath}-${lineNum}`}
                                                    onClick={() => handleResultClick(firstMatch)}
                                                    className={cn(
                                                        "w-full text-left px-3 py-1.5 text-xs pl-8",
                                                        "hover:bg-primary/10 transition-colors",
                                                        "flex items-start gap-2 group"
                                                    )}
                                                >
                                                    <span className="text-muted-foreground/60 w-6 text-right shrink-0 group-hover:text-foreground/80 font-mono">
                                                        {lineNum}
                                                    </span>
                                                    <span className="text-foreground/80 truncate">
                                                        {highlightMatches(firstMatch.lineContent, lineMatches)}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                        {hasMore && (
                                            <button
                                                onClick={() => showMore(filePath)}
                                                className="w-full text-left px-3 py-1.5 text-xs pl-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                            >
                                                显示更多 (+{Math.min(SEARCH_PAGE_SIZE, sortedLineNumbers.length - limit)}) ...
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* 结果统计 */}
            {results.length > 0 && (
                <div className="px-3 py-2 border-t border-border/30 text-[10px] text-muted-foreground">
                    共 {results.length} 处匹配，{Object.keys(groupedResults).length} 个文件
                </div>
            )}
        </div>
    );
}

/**
 * 高亮匹配文本 (支持单行多个匹配)
 */
function highlightMatches(text: string, matches: SearchResult[]): React.ReactNode {
    if (matches.length === 0) return text;

    // 按索引排序匹配项，防止重叠导致的逻辑错误（正则 gi 模式通常不会重叠但保险起见）
    const sortedMatches = [...matches].sort((a, b) => a.matchIndex - b.matchIndex);

    const result: React.ReactNode[] = [];
    let lastIndex = 0;

    for (const match of sortedMatches) {
        // 添加匹配前的普通文本
        if (match.matchIndex > lastIndex) {
            result.push(text.substring(lastIndex, match.matchIndex));
        }

        // 添加高亮文本
        const matchText = text.substring(match.matchIndex, match.matchIndex + match.matchLength);
        result.push(
            <span key={`${match.lineNumber}-${match.matchIndex}`} className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded text-yellow-900 dark:text-yellow-100 font-bold">
                {matchText}
            </span>
        );

        lastIndex = match.matchIndex + match.matchLength;
    }

    // 添加剩余文本
    if (lastIndex < text.length) {
        result.push(text.substring(lastIndex));
    }

    return <>{result}</>;
}
