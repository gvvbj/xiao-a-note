/**
 * ScrollPositionService - 标签页滚动位置保存/恢复服务
 *
 * 职责：
 * 1. 保存端：监听 LIFECYCLE_SWITCHING_START → 从 EditorView 读取光标/滚动数据 → 写入 Tab Store
 * 2. 恢复端：监听 LIFECYCLE_FILE_LOADED → 从 payload.scrollState 读取 → 通过 EditorView.requestMeasure 恢复
 * 3. 通过 MAIN_VIEW_READY 获取 EditorView 引用
 *
 * 遵循原则：
 * - Plugin-First：零核心修改，全部通过事件总线 + CM API
 * - 单一职责：只管保存/恢复位置，不涉及内容同步或 Tab 管理
 */

import { Kernel } from '@/kernel/core/Kernel';
import { ServiceId } from '@/kernel/core/ServiceId';
import { EditorView } from '@codemirror/view';
import { EditorEvents } from '../../../../../constants/EditorEvents';
import { TabService } from '@/kernel/services/TabService';
import { IFileLoadedPayload } from '@/modules/interfaces';

export class ScrollPositionService {
    private kernel: Kernel;
    private editorView: EditorView | null = null;
    private cleanupHandlers: (() => void)[] = [];

    constructor(kernel: Kernel) {
        this.kernel = kernel;
    }

    start(): void {
        // 获取 EditorView 引用
        const handleViewReady = (view: EditorView) => {
            this.editorView = view;
        };

        // 保存端：切换前从 EditorView 读取光标/滚动状态写入 Tab Store
        const handleSwitchingStart = (payload: { prevPath: string | null; nextPath: string | null }) => {
            const { prevPath } = payload;
            if (!prevPath || !this.editorView) return;

            const tabService = this.kernel.getService<TabService>(ServiceId.TAB, false);
            if (!tabService) return;

            try {
                const view = this.editorView;
                const scroller = view.scrollDOM;
                const topBlock = view.lineBlockAtHeight(scroller.scrollTop);
                const line = view.state.doc.lineAt(topBlock.from);

                tabService.setTabCursor(
                    prevPath,
                    view.state.selection.main.head,                // cursorPosition
                    scroller.scrollTop,                            // scrollTop
                    line.number,                                   // topLineNumber
                    Math.max(0, scroller.scrollTop - topBlock.top) // topOffset
                );
            } catch {
                // EditorView 可能已销毁，静默忽略
            }
        };

        // 恢复端：文件加载完成后恢复滚动位置
        const handleFileLoaded = (payload: IFileLoadedPayload) => {
            if (!payload.scrollState || !this.editorView) return;

            const { cursorPosition, scrollTop, topLineNumber, topOffset } = payload.scrollState;
            const view = this.editorView;

            // 延迟恢复：等待 useSyncProtocol 完成内容 dispatch 后再设置光标和滚动
            // 使用 requestAnimationFrame 确保 DOM 已更新
            requestAnimationFrame(() => {
                if (!view.dom.isConnected) return;

                // 1. 恢复光标位置
                if (cursorPosition !== undefined) {
                    const safePos = Math.min(cursorPosition, view.state.doc.length);
                    view.dispatch({
                        selection: { anchor: safePos, head: safePos },
                        scrollIntoView: false,
                    });
                }

                // 2. 精确恢复滚动位置（优先按行号+偏移，fallback 到 scrollTop）
                view.requestMeasure({
                    read: (v: EditorView) => {
                        const docLines = v.state.doc.lines;
                        const safeLine = Math.min(topLineNumber || 1, docLines);
                        return {
                            targetPos: (typeof topLineNumber === 'number' && topLineNumber > 0)
                                ? v.state.doc.line(safeLine).from
                                : null,
                        };
                    },
                    write: (m: { targetPos: number | null }, v: EditorView) => {
                        if (!v || !v.scrollDOM) return;

                        const applyScroll = () => {
                            if (m.targetPos !== null && typeof topOffset === 'number' && m.targetPos <= v.state.doc.length) {
                                try {
                                    const lineBlock = v.lineBlockAt(m.targetPos);
                                    v.scrollDOM.scrollTop = lineBlock.top + topOffset;
                                } catch {
                                    if (scrollTop !== undefined) v.scrollDOM.scrollTop = scrollTop;
                                }
                            } else if (scrollTop !== undefined) {
                                v.scrollDOM.scrollTop = scrollTop;
                            }
                        };

                        applyScroll();
                        // 双重保障：确保在 CM 内部布局计算完成后再次设置
                        requestAnimationFrame(() => applyScroll());
                    },
                });
            });
        };

        // 注册事件监听
        this.kernel.on(EditorEvents.MAIN_VIEW_READY, handleViewReady);
        this.kernel.on(EditorEvents.LIFECYCLE_SWITCHING_START, handleSwitchingStart);
        this.kernel.on(EditorEvents.LIFECYCLE_FILE_LOADED, handleFileLoaded);

        this.cleanupHandlers.push(() => {
            this.kernel.off(EditorEvents.MAIN_VIEW_READY, handleViewReady);
            this.kernel.off(EditorEvents.LIFECYCLE_SWITCHING_START, handleSwitchingStart);
            this.kernel.off(EditorEvents.LIFECYCLE_FILE_LOADED, handleFileLoaded);
        });
    }

    dispose(): void {
        this.cleanupHandlers.forEach(fn => fn());
        this.cleanupHandlers = [];
        this.editorView = null;
    }
}
