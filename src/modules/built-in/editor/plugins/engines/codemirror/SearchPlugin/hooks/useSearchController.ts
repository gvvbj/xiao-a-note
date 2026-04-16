import { useState, useCallback, useRef, useEffect } from 'react';
import { EditorView } from '@codemirror/view';
import { EditorSearchService } from '../services/EditorSearchService';
import { EDITOR_CONSTANTS } from '../../../../../constants/EditorConstants';

/**
 * 搜索控制器 Hook
 * 封装搜索状态管理、防抖逻辑以及高层操作
 */
export function useSearchController(getView: () => EditorView | null, isVisible: boolean, onClose: () => void) {
    const [searchTerm, setSearchTerm] = useState('');
    const [replaceTerm, setReplaceTerm] = useState('');
    const [caseSensitive, setCaseSensitive] = useState(false);
    const [isRegexp, setIsRegexp] = useState(false); // 正则支持
    const [matchCount, setMatchCount] = useState(0);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showReplace, setShowReplace] = useState(false);
    const [isReplacing, setIsReplacing] = useState(false); // 异步替换状态锁
    const [replaceProgress, setReplaceProgress] = useState(0); // 替换进度

    const matchesRef = useRef<{ from: number, to: number }[]>([]);
    const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

    // 执行核心搜索逻辑
    const performSearch = useCallback((term: string, caseSens: boolean, regexp: boolean) => {
        const view = getView();
        if (!view) return;

        const matches = EditorSearchService.findMatches(view, term, { caseSensitive: caseSens, regexp });
        matchesRef.current = matches;
        setMatchCount(matches.length);
        setCurrentIndex(0);

        // 自动跳转到第一个匹配项，触发高亮装饰器 (setActiveMatchEffect)
        if (matches.length > 0) {
            EditorSearchService.jumpToMatch(view, matches[0]);
        }
    }, [getView]);

    // 面板可见性切换清理与卸载清理
    useEffect(() => {
        const view = getView();
        if (!isVisible) {
            if (view) EditorSearchService.clearSearch(view);
            matchesRef.current = [];
            setMatchCount(0);
            setCurrentIndex(0);
        } else if (searchTerm) {
            // 重新打开时恢复搜索
            performSearch(searchTerm, caseSensitive, isRegexp);
        }

        return () => {
            // 组件卸载时也要清理高亮
            const viewOnCleanup = getView();
            if (viewOnCleanup) EditorSearchService.clearSearch(viewOnCleanup);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isVisible]);

    // 搜索词变更 (带防抖)
    const handleSearchChange = useCallback((value: string) => {
        setSearchTerm(value);
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => {
            performSearch(value, caseSensitive, isRegexp);
        }, EDITOR_CONSTANTS.SEARCH_CONFIG.SEARCH_DEBOUNCE_MS);
    }, [caseSensitive, isRegexp, performSearch]);

    // 正则/大小写切换处理
    const toggleCaseSensitive = useCallback(() => {
        const nextVal = !caseSensitive;
        setCaseSensitive(nextVal);
        performSearch(searchTerm, nextVal, isRegexp);
    }, [caseSensitive, isRegexp, searchTerm, performSearch]);

    const toggleRegexp = useCallback(() => {
        const nextVal = !isRegexp;
        setIsRegexp(nextVal);
        performSearch(searchTerm, caseSensitive, nextVal);
    }, [isRegexp, caseSensitive, searchTerm, performSearch]);

    // 导航逻辑
    const navigate = useCallback((direction: 'next' | 'prev') => {
        const view = getView();
        const matches = matchesRef.current;
        if (!view || matches.length === 0) return;

        const nextIdx = direction === 'next'
            ? (currentIndex + 1) % matches.length
            : (currentIndex - 1 + matches.length) % matches.length;

        setCurrentIndex(nextIdx);
        EditorSearchService.jumpToMatch(view, matches[nextIdx]);
    }, [getView, currentIndex]);

    // 替换逻辑
    const handleReplace = useCallback(() => {
        const view = getView();
        const matches = matchesRef.current;
        if (!view || matches.length === 0 || isReplacing) return;

        EditorSearchService.replace(view, matches[currentIndex], replaceTerm);
        // 替换后需要延迟刷新搜索结果
        setTimeout(() => performSearch(searchTerm, caseSensitive, isRegexp), 50);
    }, [getView, currentIndex, replaceTerm, searchTerm, caseSensitive, isRegexp, performSearch, isReplacing]);

    const handleReplaceAll = useCallback(async () => {
        const view = getView();
        if (!view || matchesRef.current.length === 0 || isReplacing) return;

        setIsReplacing(true);
        setReplaceProgress(0);

        try {
            await EditorSearchService.replaceAllAsync(
                view,
                matchesRef.current,
                replaceTerm,
                (progress: number) => setReplaceProgress(progress)
            );
        } finally {
            setIsReplacing(false);
            setReplaceProgress(0);
            // 异步替换全部结束后刷新匹配状态
            performSearch(searchTerm, caseSensitive, isRegexp);
        }
    }, [getView, replaceTerm, searchTerm, caseSensitive, isRegexp, performSearch, isReplacing]);

    return {
        state: {
            searchTerm,
            replaceTerm,
            caseSensitive,
            isRegexp,
            matchCount,
            currentIndex,
            showReplace,
            isReplacing,
            replaceProgress,
            displayIndex: matchCount > 0 ? currentIndex + 1 : 0
        },
        actions: {
            setSearchTerm: handleSearchChange,
            setReplaceTerm,
            setCaseSensitive: toggleCaseSensitive,
            setIsRegexp: toggleRegexp,
            setShowReplace,
            next: () => navigate('next'),
            prev: () => navigate('prev'),
            replace: handleReplace,
            replaceAll: handleReplaceAll,
            close: onClose
        }
    };
}
