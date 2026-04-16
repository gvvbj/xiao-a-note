import { EditorView } from '@codemirror/view';
import { SearchQuery } from '@codemirror/search';
import { EditorSelection, Transaction } from '@codemirror/state';
import { setActiveMatchEffect, setAllMatchesEffect } from '../cm-extensions/searchHighlight';
import { EDITOR_CONSTANTS } from '../../../../../constants/EditorConstants';
import { loggerService } from '@/kernel/services/LoggerService';

const logger = loggerService.createLogger('EditorSearchService');

/**
 * 编辑器搜索服务
 * 封装所有与 CodeMirror 搜索/替换相关的底层操作
 */
export class EditorSearchService {
    /**
     * 执行搜索并获取匹配列表
     */
    static findMatches(view: EditorView, term: string, options: { caseSensitive: boolean, regexp: boolean }) {
        if (!view) return [];
        if (!term) {
            EditorSearchService.clearSearch(view);
            return [];
        }

        try {
            const query = new SearchQuery({
                search: term,
                caseSensitive: options.caseSensitive,
                regexp: options.regexp,
                wholeWord: false,
            });

            // 创建搜索游标（不再依赖 setSearchQuery 的内置高亮，
            // 因为 @codemirror/search 的 search() 扩展未注册）

            const cursor = query.getCursor(view.state);
            const matches: { from: number, to: number }[] = [];
            let result = cursor.next();
            while (!result.done) {
                matches.push({ from: result.value.from, to: result.value.to });
                result = cursor.next();
            }

            // 发射全匹配高亮装饰
            view.dispatch({
                effects: setAllMatchesEffect.of(matches)
            });

            return matches;
        } catch (err) {
            // 正则表达式不合法时捕获错误，防止崩溃
            logger.warn('Invalid search query', err);
            return [];
        }
    }

    /**
     * 跳转到指定索引的匹配项
     */
    static jumpToMatch(view: EditorView, match: { from: number, to: number }) {
        if (!view || !match) return;

        const docLength = view.state.doc.length;
        if (match.from < 0 || match.to > docLength || match.from > match.to) return;

        view.dispatch({
            selection: EditorSelection.single(match.from, match.to),
            effects: [
                EditorView.scrollIntoView(match.from, { y: 'center', yMargin: 50 }),
                setActiveMatchEffect.of({ from: match.from, to: match.to })
            ]
        });
    }

    /**
     * 清除搜索状态
     */
    static clearSearch(view: EditorView) {
        if (!view) return;
        try {
            view.dispatch({
                effects: [
                    setAllMatchesEffect.of([]),
                    setActiveMatchEffect.of(null)
                ]
            });
        } catch {
            // ignore
        }
    }

    /**
     * 替换单个匹配
     */
    static replace(view: EditorView, match: { from: number, to: number }, text: string) {
        if (!view || !match) return;
        view.dispatch({
            changes: { from: match.from, to: match.to, insert: text }
        });
    }

    /**
     * 异步替换所有匹配 (切片批处理算法)
     */
    static async replaceAllAsync(
        view: EditorView,
        matches: { from: number, to: number }[],
        text: string,
        onProgress?: (progress: number) => void
    ) {
        if (!view || matches.length === 0) return;

        // 确保编辑器获得焦点，防止某些环境下的 Dispatch 失效
        view.focus();

        try {
            const CHUNK_SIZE = EDITOR_CONSTANTS.SEARCH_CONFIG?.REPLACE_CHUNK_SIZE || 500;

            // 1. 预处理：按坐标从后往前排序
            const docLength = view.state.doc.length;
            const sortedMatches = [...matches]
                .filter(m => m.from >= 0 && m.to <= docLength && m.from <= m.to)
                .sort((a, b) => b.from - a.from);

            const total = sortedMatches.length;
            if (total === 0) return;

            let processed = 0;

            // 2. 切片异步执行
            for (let i = 0; i < total; i += CHUNK_SIZE) {
                const chunk = sortedMatches.slice(i, i + CHUNK_SIZE);
                const changes = chunk.map(m => ({ from: m.from, to: m.to, insert: text }));

                // 显式创建事务并分发
                // 说明：将 CHUNK_SIZE 设为 1000 是平衡性能与撤销的最佳实践。
                // 虽然撤销可能需要按几次，但保证了替换过程“不卡死”且“有进度”。
                view.dispatch(view.state.update({
                    changes,
                    annotations: Transaction.userEvent.of('input.replace.all')
                }));

                processed += chunk.length;
                if (onProgress) onProgress(Math.round((processed / total) * 100));

                // 释放主线程：利用 setTimeout(0) 获得更好的兼容性
                await new Promise(resolve => setTimeout(resolve, 0));

                // 每次循环后检查 view 是否依然有效
                if (!view.state) break;
            }
        } catch (error) {
            logger.error('replaceAllAsync encountered an error', error);
            throw error;
        }
    }
}
