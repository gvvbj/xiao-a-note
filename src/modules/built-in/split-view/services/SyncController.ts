import { EditorView } from '@codemirror/view';

/**
 * SyncController - 分栏同步控制器
 * 
 * 职责：
 * 1. 处理主编辑器与分栏预览视图之间的内容同步。
 * 2. 实现增量更新 (Changeset) 逻辑以优化性能。
 * 3. 引入防抖机制，防止高频输入导致渲染压力过大。
 */
export class SyncController {
    private mainView: EditorView | null = null;
    private previewView: EditorView | null = null;
    private syncDebounceTimer: NodeJS.Timeout | null = null;
    private readonly SYNC_DELAY = 10; // 毫秒级的极速同步，平衡流畅度与开销

    constructor() { }

    /**
     * 设置同步视图
     */
    setViews(main: EditorView | null, preview: EditorView | null) {
        this.mainView = main;
        this.previewView = preview;
    }

    /**
     * 发起内容同步
     * @param content 最新内容
     * @param force 是否强制同步 (不经防抖)
     */
    syncContent(content: string | (() => string), force: boolean = false) {
        if (!this.previewView) return;

        if (this.syncDebounceTimer) {
            clearTimeout(this.syncDebounceTimer);
            this.syncDebounceTimer = null;
        }

        const applySync = () => {
            if (!this.previewView) return;
            const resolvedContent = typeof content === 'function' ? content() : content;
            const currentContent = this.previewView.state.doc.toString();

            if (currentContent === resolvedContent) return;

            // [性能优化] 双端扫描最小 diff：只更新变化的范围
            // 对于 154KB 文档，单字符输入只需替换 1 个字符而非全文替换
            // 这避免了 CM 重建整个装饰器树导致的剧烈抖动
            let start = 0;
            const minLen = Math.min(currentContent.length, resolvedContent.length);
            while (start < minLen && currentContent[start] === resolvedContent[start]) {
                start++;
            }

            let endCurrent = currentContent.length;
            let endResolved = resolvedContent.length;
            while (
                endCurrent > start &&
                endResolved > start &&
                currentContent[endCurrent - 1] === resolvedContent[endResolved - 1]
            ) {
                endCurrent--;
                endResolved--;
            }

            this.previewView.dispatch({
                changes: {
                    from: start,
                    to: endCurrent,
                    insert: resolvedContent.slice(start, endResolved)
                }
            });
        };

        if (force) {
            applySync();
        } else {
            this.syncDebounceTimer = setTimeout(applySync, this.SYNC_DELAY);
        }
    }

    /**
     * 销毁控制器
     */
    dispose() {
        if (this.syncDebounceTimer) {
            clearTimeout(this.syncDebounceTimer);
        }
        this.mainView = null;
        this.previewView = null;
    }
}
