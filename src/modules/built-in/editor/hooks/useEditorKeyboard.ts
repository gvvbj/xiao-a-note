/**
 * useEditorKeyboard.ts
 * 
 * 编辑器键盘状态管理。
 * 
 * 注意：Ctrl+F / ESC 的键盘监听已移至 SearchPlugin 统一处理，
 * 此处仅保留面板状态管理供旧代码兼容。
 * Ctrl+S / Ctrl+Shift+S 的处理在 KeymapPlugin 中。
 */

import { useCallback, useState } from 'react';

interface UseEditorKeyboardResult {
    showSearchPanel: boolean;
    toggleSearchPanel: () => void;
    closeSearchPanel: () => void;
}

export function useEditorKeyboard(): UseEditorKeyboardResult {
    const [showSearchPanel, setShowSearchPanel] = useState(false);

    const toggleSearchPanel = useCallback(() => {
        setShowSearchPanel(prev => !prev);
    }, []);

    const closeSearchPanel = useCallback(() => {
        setShowSearchPanel(false);
    }, []);

    // 注意：Ctrl+F / ESC 键盘事件由 SearchPlugin 统一监听处理。
    // 此处不再注册 window.addEventListener，避免重复触发。

    return {
        showSearchPanel,
        toggleSearchPanel,
        closeSearchPanel,
    };
}
