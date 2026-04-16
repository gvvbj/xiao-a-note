import { IFileSystem } from '@/kernel/interfaces/IFileSystem';
import { normalizePath } from '@/shared/utils/path';

export interface SearchResult {
    filePath: string;
    fileName: string;
    lineNumber: number;
    lineContent: string;
    matchIndex: number;
    matchLength: number;
}

const GLOBAL_MATCH_LIMIT = 100000;
const LINE_PREVIEW_LENGTH = 100;

export interface ILogger {
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
}

/**
 * SearchService - 全文搜索服务
 * 
 * 遵循原则:
 * - 0 硬编码: 搜索逻辑完全封装在服务内
 * - 解耦: 仅依赖 IFileSystem 接口
 */
export class SearchService {
    constructor(private fileSystem: IFileSystem, private logger?: ILogger) { }

    /**
     * 在工作区中搜索关键词
     * @param getLiveContent 可选回调，用于获取 Tab 中未保存的实时内容
     */
    async search(
        query: string,
        rootPath: string,
        getLiveContent?: (filePath: string) => string | undefined,
        additionalFiles: string[] = []
    ): Promise<SearchResult[]> {
        if (!query || !rootPath) return [];

        const results: SearchResult[] = [];

        // 1. 获取所有磁盘上的 Markdown 文件并合并额外文件（去重并规范化）
        const diskFiles = await this.fileSystem.getAllMarkdownFiles(rootPath);

        // 使用 Map 记录 规范化路径 -> 原始路径 的映射，以便去重同时保留显示用的原始名称
        const pathMap = new Map<string, string>();

        const addToMap = (paths: string[]) => {
            for (const p of paths) {
                const norm = this.normalizePath(p);
                if (!pathMap.has(norm)) {
                    pathMap.set(norm, p);
                }
            }
        };

        addToMap(diskFiles);
        addToMap(additionalFiles);

        // 搜索每个文件
        for (const [normPath, originalPath] of pathMap.entries()) {
            await this.searchInFile(normPath, originalPath, query, results, getLiveContent);

            // 限制总结果数 (避免内存溢出)
            if (results.length >= GLOBAL_MATCH_LIMIT) break;
        }

        return results;
    }

    private normalizePath(path: string): string {
        return normalizePath(path);
    }

    private async searchInFile(
        filePath: string,
        originalPath: string,
        query: string,
        results: SearchResult[],
        getLiveContent?: (filePath: string) => string | undefined
    ): Promise<void> {
        try {
            let content = '';

            // 优先从实时内容获取（未保存内容）
            const liveContent = getLiveContent ? getLiveContent(filePath) : undefined;
            if (liveContent !== undefined) {
                content = liveContent;
            } else {
                const res = await this.fileSystem.readFile(originalPath);
                if (!res.success || !res.content) return;
                content = res.content;
            }

            const lines = content.split('\n');
            const fileName = originalPath.split(/[\\/]/).pop() || originalPath;
            let matchCount = 0;

            // 尝试直接作为正则处理，实现默认支持搜索正则模式
            let regex: RegExp;
            try {
                regex = new RegExp(query, 'gi');
            } catch (e) {
                // 如果是无效正则，则回退为普通字符串匹配（转义）
                const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                regex = new RegExp(escapedQuery, 'gi');
            }

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                let match;

                regex.lastIndex = 0;

                while ((match = regex.exec(line)) !== null) {
                    results.push({
                        filePath,
                        fileName,
                        lineNumber: i + 1,
                        lineContent: line.trim().substring(0, LINE_PREVIEW_LENGTH),
                        matchIndex: match.index,
                        matchLength: match[0].length
                    });

                    matchCount++;
                }
            }
        } catch (e) {
            this.logger?.warn(`Failed to search in ${originalPath}:`, e);
        }
    }
}
