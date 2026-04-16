import React, { useEffect, useRef, useCallback } from 'react';
import { X, ChevronUp, ChevronDown, Replace, CaseSensitive, Regex } from 'lucide-react';
import { EditorView } from '@codemirror/view';
import { useSearchController } from '../hooks/useSearchController';

interface SearchReplacePanelProps {
    getView: () => EditorView | null;
    onClose: () => void;
    isVisible: boolean;
}

export function SearchReplacePanel({ getView, onClose, isVisible }: SearchReplacePanelProps) {
    const searchInputRef = useRef<HTMLInputElement>(null);

    const { state, actions } = useSearchController(getView, isVisible, onClose);

    const {
        searchTerm, replaceTerm, caseSensitive, isRegexp,
        matchCount, displayIndex, showReplace, isReplacing, replaceProgress
    } = state;

    const {
        setSearchTerm, setReplaceTerm, setCaseSensitive, setIsRegexp,
        setShowReplace, next, prev, replace, replaceAll, close
    } = actions;

    // Focus management
    useEffect(() => {
        if (isVisible && searchInputRef.current) {
            requestAnimationFrame(() => {
                searchInputRef.current?.focus();
                searchInputRef.current?.select();
            });
        }
    }, [isVisible]);

    // Keyboard handling
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault(); e.stopPropagation();
            if (e.shiftKey) prev(); else next();
            requestAnimationFrame(() => searchInputRef.current?.focus());
        } else if (e.key === 'Escape') {
            e.preventDefault(); e.stopPropagation();
            close();
        }
    }, [next, prev, close]);

    const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
        e.stopPropagation();
        if (e.key === 'Enter' || e.key === 'Escape') handleKeyDown(e);
    }, [handleKeyDown]);

    // Prevent button focus snatching
    const handleButtonMouseDown = useCallback((e: React.MouseEvent) => e.preventDefault(), []);

    if (!isVisible) return null;

    return (
        <div
            className="search-replace-panel absolute top-0 right-0 w-full bg-zinc-800 border-b border-zinc-700 px-4 py-2 flex flex-col gap-2 z-[100] select-none shadow-md"
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Search Row */}
            <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2">
                    <input
                        ref={searchInputRef}
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={handleInputKeyDown}
                        disabled={isReplacing}
                        placeholder="查找..."
                        className={`flex-1 bg-zinc-700 border border-zinc-600 rounded px-3 py-1.5 text-sm text-white placeholder-zinc-400 focus:outline-none focus:border-blue-500 ${isReplacing ? 'opacity-50' : ''}`}
                        autoComplete="off"
                        spellCheck={false}
                    />
                    <span className="text-xs text-zinc-400 min-w-[60px]">
                        {matchCount > 0 ? `${displayIndex} / ${matchCount}` : '无匹配'}
                    </span>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => setCaseSensitive()}
                        onMouseDown={handleButtonMouseDown}
                        disabled={isReplacing}
                        className={`p-1.5 rounded ${caseSensitive ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:bg-zinc-700'} ${isReplacing ? 'opacity-50' : ''}`}
                        title="区分大小写"
                    >
                        <CaseSensitive size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsRegexp()}
                        onMouseDown={handleButtonMouseDown}
                        disabled={isReplacing}
                        className={`p-1.5 rounded ${isRegexp ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:bg-zinc-700'} ${isReplacing ? 'opacity-50' : ''}`}
                        title="使用正则表达式"
                    >
                        <Regex size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={prev}
                        onMouseDown={handleButtonMouseDown}
                        disabled={matchCount === 0 || !searchTerm}
                        className="p-1.5 rounded text-zinc-400 hover:bg-zinc-700 disabled:opacity-50"
                        title="上一个 (Shift+Enter)"
                    >
                        <ChevronUp size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={next}
                        onMouseDown={handleButtonMouseDown}
                        disabled={matchCount === 0 || !searchTerm}
                        className="p-1.5 rounded text-zinc-400 hover:bg-zinc-700 disabled:opacity-50"
                        title="下一个 (Enter)"
                    >
                        <ChevronDown size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowReplace(!showReplace)}
                        onMouseDown={handleButtonMouseDown}
                        className={`p-1.5 rounded ${showReplace ? 'bg-zinc-600 text-white' : 'text-zinc-400 hover:bg-zinc-700'}`}
                        title="替换"
                    >
                        <Replace size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={close}
                        onMouseDown={handleButtonMouseDown}
                        className="p-1.5 rounded text-zinc-400 hover:bg-zinc-700"
                        title="关闭 (Esc)"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Replace Row */}
            {showReplace && (
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={replaceTerm}
                        onChange={(e) => setReplaceTerm(e.target.value)}
                        onKeyDown={handleInputKeyDown}
                        disabled={isReplacing}
                        placeholder="替换为..."
                        className={`flex-1 bg-zinc-700 border border-zinc-600 rounded px-3 py-1.5 text-sm text-white placeholder-zinc-400 focus:outline-none focus:border-blue-500 ${isReplacing ? 'opacity-50' : ''}`}
                        autoComplete="off"
                        spellCheck={false}
                    />
                    <button
                        type="button"
                        onClick={replace}
                        onMouseDown={handleButtonMouseDown}
                        disabled={matchCount === 0 || !searchTerm || isReplacing}
                        className="px-3 py-1.5 rounded bg-zinc-700 text-zinc-300 text-sm hover:bg-zinc-600 disabled:opacity-50"
                    >
                        替换
                    </button>
                    <button
                        type="button"
                        onClick={replaceAll}
                        onMouseDown={handleButtonMouseDown}
                        disabled={matchCount === 0 || !searchTerm || isReplacing}
                        className={`px-3 py-1.5 rounded bg-zinc-700 text-zinc-300 text-sm hover:bg-zinc-600 disabled:opacity-50 min-w-[100px] flex items-center justify-center`}
                    >
                        {isReplacing ? `正在替换 ${replaceProgress}%` : '全部替换'}
                    </button>
                </div>
            )}
        </div>
    );
}

export default SearchReplacePanel;
