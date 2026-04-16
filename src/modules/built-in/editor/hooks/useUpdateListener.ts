/**
 * useUpdateListener - 编辑器更新监听器
 *
 * 职责：
 * 1. 监听文档变更并转发给 parent（onUpdate）
 * 2. 监听光标活动并转发给 parent（onCursorActivity）
 * 3. 监听滚动并转发百分比（onScrollPercentage）
 * 4. 首次 View 就绪时触发 editorView 状态同步
 *
 * 遵循原则：
 * - Plugin-First: 从 CodeMirrorEditor 中提取的纯 Hook
 * - 单一职责: 只管 CodeMirror UpdateListener
 */

import { useMemo } from 'react';
import { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { normalizeMarkdown } from '@/shared/utils/ContentUtils';
import { InternalSyncAnnotation } from '@/modules/built-in/editor/constants/Annotations';
import { viewModeFacet, basePathFacet } from '@/modules/built-in/editor/constants/Facets';

interface UseUpdateListenerOptions {
    onUpdate?: (content: string | (() => string), changes?: any) => void;
    onCursorActivity?: (line: number, head: number) => void;
    onScrollPercentage?: (percentage: number) => void;
    viewMode: 'source' | 'preview';
    basePath: string | null;
    readOnly?: boolean;
    currentFilePath: string | null;
    /** 共享 ref：标记当前是否正在内部同步 */
    isUpdatingRef: React.MutableRefObject<boolean>;
    /** 共享 ref：记录最近一次同步内容指纹 */
    lastInitialSyncRef: React.MutableRefObject<string | null>;
    /** 回调：首次检测到 View 时设置 editorView 状态 */
    onEditorViewDetected: (view: EditorView) => void;
    /** 当前 editorView 是否已就绪 */
    editorViewReady: boolean;
    /** 动态扩展列表 */
    dynamicExtensions: Extension[];
    /** kernel 实例（用于 memo deps） */
    kernelRef: any;
}

export function useUpdateListener({
    onUpdate,
    onCursorActivity,
    onScrollPercentage,
    viewMode,
    basePath,
    readOnly,
    currentFilePath,
    isUpdatingRef,
    lastInitialSyncRef,
    onEditorViewDetected,
    editorViewReady,
    dynamicExtensions,
    kernelRef
}: UseUpdateListenerOptions): Extension[] {
    return useMemo(() => {
        const updateListener = EditorView.updateListener.of((update) => {
            if (update.docChanged && !isUpdatingRef.current) {
                if (onUpdate) {
                    const content = normalizeMarkdown(update.state.doc.toString());
                    const isInternal = update.transactions.some(tr => tr.annotation(InternalSyncAnnotation));

                    // 记录最近一次同步出去的内容，用于属性回填时的回声判定
                    lastInitialSyncRef.current = content;

                    onUpdate(content, { changes: update.changes, isInternal });
                }
            }

            // 首次检测到 View 时同步到 React 状态
            if (!editorViewReady && update.view) {
                onEditorViewDetected(update.view);
            }

            if (update.selectionSet || update.docChanged) {
                if (onCursorActivity) {
                    const head = update.state.selection.main.head;
                    const line = update.state.doc.lineAt(head);
                    onCursorActivity(line.number, head);
                }
            }

            if (update.geometryChanged && onScrollPercentage) {
                const scroller = update.view.scrollDOM;
                const scrollHeight = scroller.scrollHeight - scroller.clientHeight;
                if (scrollHeight > 0) onScrollPercentage(scroller.scrollTop / scrollHeight);
            }
        });

        return [
            ...dynamicExtensions,
            updateListener,
            viewModeFacet.of(viewMode),
            basePathFacet.of(basePath)
        ];
    }, [dynamicExtensions, onUpdate, onScrollPercentage, onCursorActivity, viewMode, basePath, readOnly, currentFilePath, kernelRef]);
}
