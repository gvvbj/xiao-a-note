import { EditorPanelRegistry } from '../../../../../registries/EditorPanelRegistry';

/**
 * 搜索快捷键处理器
 * 负责处理 Ctrl+F 和 Escape 键盘事件
 */
export function createSearchKeyHandler(panelRegistry: EditorPanelRegistry): (e: KeyboardEvent) => void {
    return (e: KeyboardEvent) => {
        const isCtrl = e.ctrlKey || e.metaKey;

        if (isCtrl && e.key.toLowerCase() === 'f') {
            e.preventDefault();
            e.stopPropagation();
            panelRegistry.openPanel('search-replace');
        }

        if (e.key === 'Escape' && panelRegistry.isPanelVisible('search-replace')) {
            e.preventDefault();
            e.stopPropagation();
            panelRegistry.closePanel('search-replace');
        }
    };
}
