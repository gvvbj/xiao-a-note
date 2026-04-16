import React, { createContext, useContext } from 'react';
import { IEditorRef } from '../framework/types';

/**
 * NoteEditorContext - 编辑器共享上下文
 * 
 * 职责:
 * 为插件注册的 UI 组件提供编辑器核心状态和引用的访问。
 * 避免了通过 UISlot 繁琐地传递 Props。
 */
export interface INoteEditorContext {
    editorRef: React.MutableRefObject<IEditorRef | null>;
    previewEditorRef: React.MutableRefObject<IEditorRef | null>;
    currentPath: string | null;
    initialContent: string | (() => string);
    isUnsaved: boolean;
    handleEditorUpdate: (val: string | (() => string), changes?: unknown) => void;
    loadedPath: string | null;
    switchError: { path: string | null; error: string } | null;
    cursorLineRef: React.MutableRefObject<number>;
    liveContentRef: React.MutableRefObject<string | (() => string)>;
    isRestoringRef: React.MutableRefObject<boolean>;
}

const NoteEditorContext = createContext<INoteEditorContext | null>(null);

export const NoteEditorProvider = NoteEditorContext.Provider;

export function useNoteEditorContext() {
    const ctx = useContext(NoteEditorContext);
    if (!ctx) throw new Error('useNoteEditorContext must be used within NoteEditorProvider');
    return ctx;
}
