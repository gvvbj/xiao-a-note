/**
 * useSyncProtocol - 终极防护协议 v2.1
 *
 * 职责：
 * 外部 Props (initialContent, currentFilePath) → 编辑器内部的受控同步。
 *
 * 核心逻辑：
 * 只有在以下情况允许从外部 Props 同步到编辑器内部：
 * 1. 首次加载 (firstLoadDoneRef)
 * 2. 路径变了 (isPathChanged)
 * 3. 基准内容变了 (isBaseChanged) 且 非回声 (isEcho)
 *
 * 遵循原则：
 * - Plugin-First: 从 CodeMirrorEditor 中提取的纯 Hook
 * - 单一职责: 只管外部→内部同步
 */

import { useEffect, useRef } from 'react';
import { EditorView } from '@codemirror/view';
import { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { normalizeMarkdown } from '@/shared/utils/ContentUtils';
import { IEditorRef } from '@/modules/built-in/editor/framework/types';
import { PROGRAMMATIC_TRANSACTION_SOURCES } from '@/modules/built-in/editor/constants/ProgrammaticTransactionSources';
import { createInternalSyncTransaction } from '@/modules/built-in/editor/utils/InternalSyncTransaction';

interface UseSyncProtocolOptions {
    editorView: EditorView | null;
    cmRef: React.RefObject<ReactCodeMirrorRef | null>;
    initialContent: string | (() => string);
    currentFilePath: string | null;
    forwardedRef: React.ForwardedRef<IEditorRef>;
    /** 共享 ref：标记当前是否正在内部同步 */
    isUpdatingRef: React.MutableRefObject<boolean>;
    /** 共享 ref：记录最近一次同步内容指纹 */
    lastInitialSyncRef: React.MutableRefObject<string | null>;
    /** 共享 ref：待恢复的滚动/光标状态 */
    pendingStateRef: React.MutableRefObject<{
        cursorPosition?: number;
        scrollTop?: number;
        topLineNumber?: number;
        topOffset?: number;
    } | null>;
}

export function useSyncProtocol({
    editorView,
    cmRef,
    initialContent,
    currentFilePath,
    forwardedRef,
    isUpdatingRef,
    lastInitialSyncRef,
    pendingStateRef
}: UseSyncProtocolOptions): void {
    const activePathRef = useRef<string | null>(currentFilePath);
    const processedBaseRef = useRef<string | null>(
        normalizeMarkdown(typeof initialContent === 'function' ? initialContent() : initialContent)
    );
    const firstLoadDoneRef = useRef(false);

    useEffect(() => {
        // [彻底去受控化] 同步逻辑仅在 View 就绪后执行
        const view = editorView || cmRef.current?.view;
        const resolvedInitial = normalizeMarkdown(
            typeof initialContent === 'function' ? initialContent() : initialContent
        );

        if (view) {
            const currentDoc = normalizeMarkdown(view.state.doc.toString());

            // [终极防护协议 v2.1] 去受控 + 反射防护版
            const isPathChanged = currentFilePath !== activePathRef.current;
            const isBaseChanged = resolvedInitial !== processedBaseRef.current;
            const isEcho = !isPathChanged && resolvedInitial === lastInitialSyncRef.current;

            const isFirstLoad = !firstLoadDoneRef.current;

            if (!isFirstLoad && !isPathChanged && !isBaseChanged) {
                return;
            }

            // [防错乱守卫] 路径已变但内容尚未更新（React state 不同步）
            // 此时 initialContent 仍属于旧文件，不能 dispatch 到新路径的编辑器
            // 只更新路径跟踪，等待 LifecycleService 发射 FILE_LOADED 后内容到达再同步
            if (!isFirstLoad && isPathChanged && !isBaseChanged) {
                activePathRef.current = currentFilePath;
                return;
            }

            if (!isFirstLoad && isEcho) {
                // 命中回声，仅更新指纹，不触碰编辑器内核
                processedBaseRef.current = resolvedInitial;
                return;
            }

            // 执行同步
            firstLoadDoneRef.current = true;
            activePathRef.current = currentFilePath;
            processedBaseRef.current = resolvedInitial;

            if (resolvedInitial !== currentDoc) {
                isUpdatingRef.current = true;
                lastInitialSyncRef.current = resolvedInitial;

                view.dispatch(createInternalSyncTransaction(
                    {
                        changes: { from: 0, to: view.state.doc.length, insert: resolvedInitial },
                    },
                    { source: PROGRAMMATIC_TRANSACTION_SOURCES.SYNC_PROTOCOL },
                ));

                if (pendingStateRef.current) {
                    const state = pendingStateRef.current;
                    pendingStateRef.current = null;
                    const ref = forwardedRef as React.MutableRefObject<IEditorRef | null>;
                    ref.current?.resetState(
                        resolvedInitial,
                        state.cursorPosition,
                        state.scrollTop,
                        state.topLineNumber,
                        state.topOffset
                    );
                }
                isUpdatingRef.current = false;
            }
        }
    }, [initialContent, currentFilePath, forwardedRef, editorView]);
}
