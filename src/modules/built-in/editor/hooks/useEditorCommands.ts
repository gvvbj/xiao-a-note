/**
 * useEditorCommands - 编辑器命令接口
 *
 * 职责：
 * 通过 useImperativeHandle 暴露 IEditorRef 接口给外部。
 *
 * 包含：
 * - getContent / setContent
 * - getScrollState / resetState
 * - executeCommand
 * - getActiveStates
 * - focus / view
 *
 * 遵循原则：
 * - Plugin-First: 从 CodeMirrorEditor 中提取的纯 Hook
 * - 单一职责: 只管对外命令接口
 */

import { useImperativeHandle } from 'react';
import { EditorView } from '@codemirror/view';
import { Extension } from '@codemirror/state';
import { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { normalizeMarkdown } from '@/shared/utils/ContentUtils';
import { IEditorRef } from '@/modules/built-in/editor/framework/types';
import { PROGRAMMATIC_TRANSACTION_SOURCES } from '@/modules/built-in/editor/constants/ProgrammaticTransactionSources';
import { CommandRegistry } from '@/modules/built-in/editor/registries/CommandRegistry';
import { createInternalSyncTransaction } from '@/modules/built-in/editor/utils/InternalSyncTransaction';
import type { IEditorTextEdit } from '@/kernel/interfaces/IEditorActionService';

type MeasureSpec<TRead> = {
    read: (v: EditorView) => TRead;
    write: (m: TRead, v: EditorView) => void;
};

type MeasureCapableEditorView = EditorView & {
    requestMeasure<TRead>(spec: MeasureSpec<TRead>): void;
};

interface UseEditorCommandsOptions {
    forwardedRef: React.ForwardedRef<IEditorRef>;
    cmRef: React.RefObject<ReactCodeMirrorRef | null>;
    commandRegistry: CommandRegistry | null;
    activeStates: Record<string, boolean>;
    stableExtensions: Extension[];
    isDark: boolean;
    /** 共享 ref：标记当前是否正在内部同步 */
    isUpdatingRef: React.MutableRefObject<boolean>;
    /** 共享 ref：待恢复的滚动/光标状态 */
    pendingStateRef: React.MutableRefObject<{
        cursorPosition?: number;
        scrollTop?: number;
        topLineNumber?: number;
        topOffset?: number;
    } | null>;
}

export function useEditorCommands({
    forwardedRef,
    cmRef,
    commandRegistry,
    activeStates,
    stableExtensions,
    isDark,
    isUpdatingRef,
    pendingStateRef
}: UseEditorCommandsOptions): void {
    useImperativeHandle(forwardedRef, () => ({
        getContent: () => cmRef.current?.view?.state.doc.toString() || '',
        setContent: (content: string) => {
            const view = cmRef.current?.view;
            if (view) {
                view.dispatch(createInternalSyncTransaction(
                    {
                        changes: { from: 0, to: view.state.doc.length, insert: content }
                    },
                    { source: PROGRAMMATIC_TRANSACTION_SOURCES.EDITOR_SET_CONTENT }
                ));
            }
        },
        getScrollState: () => {
            const view = cmRef.current?.view;
            if (!view) return { cursorPosition: 0, scrollTop: 0, topLineNumber: 1, topOffset: 0 };
            const scroller = view.scrollDOM;
            const topBlock = view.lineBlockAtHeight(scroller.scrollTop);
            const line = view.state.doc.lineAt(topBlock.from);
            return {
                cursorPosition: view.state.selection.main.head,
                scrollTop: scroller.scrollTop,
                topLineNumber: line.number,
                topOffset: Math.max(0, scroller.scrollTop - topBlock.top)
            };
        },
        executeCommand: (cmd: string, args?: unknown) => {
            const view = cmRef.current?.view;
            if (view && commandRegistry) {
                commandRegistry.executeCommand(cmd, view, args);
            }
        },
        getActiveStates: () => activeStates,
        resetState: (content: string, cursorPosition?: number, scrollTop?: number, topLineNumber?: number, topOffset?: number) => {
            const view = cmRef.current?.view;
            if (!view) {
                pendingStateRef.current = { cursorPosition, scrollTop, topLineNumber, topOffset };
                return;
            }

            const normalizedTarget = normalizeMarkdown(content);
            const normalizedCurrent = normalizeMarkdown(view.state.doc.toString());

            if (normalizedTarget !== normalizedCurrent) {
                pendingStateRef.current = { cursorPosition, scrollTop, topLineNumber, topOffset };
                isUpdatingRef.current = true;
                view.dispatch(createInternalSyncTransaction(
                    {
                        changes: { from: 0, to: view.state.doc.length, insert: content }
                    },
                    { source: PROGRAMMATIC_TRANSACTION_SOURCES.EDITOR_RESET_STATE }
                ));
                isUpdatingRef.current = false;
                return;
            }

            if (cursorPosition !== undefined) {
                const safePos = Math.min(cursorPosition, view.state.doc.length);
                view.dispatch({ selection: { anchor: safePos, head: safePos }, scrollIntoView: false });
            }

            (view as MeasureCapableEditorView).requestMeasure({
                read: (v: EditorView) => {
                    const docLines = v.state.doc.lines;
                    const safeLine = Math.min(topLineNumber || 1, docLines);
                    return {
                        targetPos: (typeof topLineNumber === 'number' && topLineNumber > 0)
                            ? v.state.doc.line(safeLine).from
                            : null
                    };
                },
                write: (m: { targetPos: number | null }, v: EditorView) => {
                    if (!v || !v.scrollDOM) return;
                    const applyScroll = () => {
                        if (m.targetPos !== null && typeof topOffset === 'number' && m.targetPos <= v.state.doc.length) {
                            try {
                                const lineBlock = v.lineBlockAt(m.targetPos);
                                v.scrollDOM.scrollTop = lineBlock.top + topOffset;
                            } catch (e) {
                                if (scrollTop !== undefined) v.scrollDOM.scrollTop = scrollTop;
                            }
                        } else if (scrollTop !== undefined) {
                            v.scrollDOM.scrollTop = scrollTop;
                        }
                    };
                    applyScroll();
                    requestAnimationFrame(() => applyScroll());
                }
            });
        },
        getSelection: () => {
            const view = cmRef.current?.view;
            if (!view) return null;

            const { from, to } = view.state.selection.main;
            return {
                from,
                to,
                text: view.state.sliceDoc(from, to),
            };
        },
        applyTextEdits: (edits: IEditorTextEdit[], selection) => {
            const view = cmRef.current?.view;
            if (!view || edits.length === 0) {
                return;
            }

            const changes = edits
                .slice()
                .sort((left, right) => {
                    if (left.range.from !== right.range.from) {
                        return right.range.from - left.range.from;
                    }

                    return right.range.to - left.range.to;
                })
                .map((edit) => ({
                    from: edit.range.from,
                    to: edit.range.to,
                    insert: edit.text,
                }));

            view.dispatch({
                changes,
                ...(selection ? { selection } : {}),
            });
        },
        focus: () => cmRef.current?.view?.focus(),
        get view() { return cmRef.current?.view || undefined; }
    }), [stableExtensions, isDark, activeStates, commandRegistry]);
}
