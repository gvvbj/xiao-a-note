import React from 'react';
import { useKernelEvent } from '@/kernel/hooks/useKernelEvent';
import { IEditorRef } from '../framework/types';
import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import { EditorEvents } from '../constants/EditorEvents';
import { EDITOR_CONSTANTS } from '../constants/EditorConstants';
import { PROGRAMMATIC_TRANSACTION_SOURCES } from '../constants/ProgrammaticTransactionSources';
import { EditorView } from '@codemirror/view';
import { createInternalSyncTransaction } from '../utils/InternalSyncTransaction';

interface UseEditorEventsProps {
    editorRef: React.MutableRefObject<IEditorRef | null>;
    liveContentRef: React.MutableRefObject<string | (() => string)>;
    isSyncingRef: React.MutableRefObject<boolean>;
    cursorLineRef: React.MutableRefObject<number>;
    currentPath: string | null;
    // [Refactored] isUnsaved, saveFile 已移除，由 PersistenceService 统一管理
    openTab: (id: string, title: string) => void;
    setSaveAsDialogOpen: (val: boolean) => void;
    kernel: any;
}

export function useEditorEvents({
    editorRef,
    liveContentRef,
    isSyncingRef,
    cursorLineRef,
    currentPath,
    openTab,
    setSaveAsDialogOpen,
    kernel
}: UseEditorEventsProps) {
    // 1. 监听内容同步（如图片路径替换后）
    useKernelEvent(CoreEvents.SYNC_EDITOR_CONTENT, (data: { replacements: { oldText: string; newText: string }[]; savedContent: string }) => {
        if (!editorRef.current?.view) return;
        const view = editorRef.current.view;
        const { replacements, savedContent } = data;

        isSyncingRef.current = true;
        const scrollTop = view.scrollDOM.scrollTop;

        const changes: { from: number; to: number; insert: string }[] = [];
        const docText = view.state.doc.toString();

        for (const { oldText, newText } of replacements) {
            let searchFrom = 0;
            while (true) {
                const idx = docText.indexOf(oldText, searchFrom);
                if (idx === -1) break;
                changes.push({ from: idx, to: idx + oldText.length, insert: newText });
                searchFrom = idx + oldText.length;
            }
        }

        if (changes.length > 0) {
            changes.sort((a, b) => b.from - a.from);
            view.dispatch(createInternalSyncTransaction(
                { changes },
                { source: PROGRAMMATIC_TRANSACTION_SOURCES.SYNC_EDITOR_CONTENT },
            ));
        }

        liveContentRef.current = savedContent;

        requestAnimationFrame(() => {
            view.scrollDOM.scrollTop = scrollTop;
            setTimeout(() => { isSyncingRef.current = false; }, EDITOR_CONSTANTS.UI_FEEDBACK_DELAY_MS);
        });
    });

    // 2. 监听文本插入
    useKernelEvent(CoreEvents.EDITOR_INSERT_TEXT, (text: string) => {
        const view = editorRef.current?.view;
        if (!view) return;
        const { from, to } = view.state.selection.main;

        let insertText = text;
        let anchorOffset = text.length;

        // 支持 $0 光标占位符
        const cursorIdx = text.indexOf('$0');
        if (cursorIdx !== -1) {
            insertText = text.replace('$0', '');
            anchorOffset = cursorIdx;
        }

        view.dispatch({
            changes: { from, to, insert: insertText },
            selection: { anchor: from + anchorOffset }
        });
        view.focus();
    });

    // 2.5 大纲跳转：滚动到指定行
    useKernelEvent(CoreEvents.EDITOR_SCROLL_TO_LINE, (line: number) => {
        const view = editorRef.current?.view;
        if (!view) return;
        const lineInfo = view.state.doc.line(Math.min(line, view.state.doc.lines));
        view.dispatch({
            effects: EditorView.scrollIntoView(lineInfo.from, { y: 'center' }),
            selection: { anchor: lineInfo.from }
        });
        view.focus();
    });

    // 2.6 精确跳转：选中指定匹配项
    useKernelEvent(CoreEvents.EDITOR_SELECT_MATCH, (payload: { line: number, matchIndex: number, matchLength: number }) => {
        const view = editorRef.current?.view;
        if (!view) return;

        const lineInfo = view.state.doc.line(Math.min(payload.line, view.state.doc.lines));
        const selectionFrom = Math.min(lineInfo.from + payload.matchIndex, lineInfo.to);
        const selectionTo = Math.min(selectionFrom + payload.matchLength, lineInfo.to);

        view.dispatch({
            selection: { anchor: selectionFrom, head: selectionTo },
            effects: EditorView.scrollIntoView(selectionFrom, { y: 'center' })
        });
        view.focus();
    });

    // 3. 基础指令处理
    // [Refactored] SAVE_FILE, SAVE_FILE_REQUEST, SAVE_ALL 由 PersistenceService 统一处理，此处不再重复监听
    useKernelEvent(CoreEvents.EDITOR_REVEAL_RANGE, (payload: { from: number; to: number }) => {
        const view = editorRef.current?.view;
        if (!view) return;
        if (!payload || !Number.isInteger(payload.from) || !Number.isInteger(payload.to)) return;

        const from = Math.max(0, Math.min(payload.from, view.state.doc.length));
        const to = Math.max(from, Math.min(payload.to, view.state.doc.length));

        view.dispatch({
            selection: { anchor: from, head: to },
            effects: EditorView.scrollIntoView(from, { y: 'center' })
        });
        view.focus();
    });

    useKernelEvent(EditorEvents.EDITOR_FOCUS, () => { editorRef.current?.view?.focus(); });
    useKernelEvent(EditorEvents.CREATE_UNTITLED_TAB, () => {
        openTab(`${EDITOR_CONSTANTS.UNTITLED_PREFIX}${Date.now()}`, EDITOR_CONSTANTS.DEFAULT_FILENAME.split('.')[0]);
    });
    useKernelEvent(EditorEvents.SAVE_AS, () => setSaveAsDialogOpen(true));

    useKernelEvent(EditorEvents.REVEAL_IN_EXPLORER, async (path: string) => {
        kernel.emit(EditorEvents.EXPLORER_SELECT_PATH, path);
        // Call system explorer
        const fileSystem = kernel.getService(ServiceId.FILE_SYSTEM);
        if (fileSystem && fileSystem.showItemInFolder) {
            await fileSystem.showItemInFolder(path);
        }
    });
}
