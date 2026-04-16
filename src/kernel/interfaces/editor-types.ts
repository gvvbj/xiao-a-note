import type React from 'react';
import type {
    EditorEngineDecoration,
    EditorEngineRange,
    EditorEngineState,
    EditorEngineSyntaxNode,
    EditorEngineView
} from './IEditorEngine';

export type ShortcutGroup = 'file' | 'edit' | 'view' | 'explorer' | 'table' | 'other';

export interface IShortcutItem {
    id: string;
    keys: string;
    description: string;
    group: ShortcutGroup;
    order?: number;
}

export interface IDecorationContext {
    state: EditorEngineState;
    view: EditorEngineView;
    isRangeActive: (from: number, to: number) => boolean;
    isLineActive: (from: number) => boolean;
    basePath: string | null;
}

export interface IDecorationResult {
    decorations: EditorEngineRange<EditorEngineDecoration>[];
    shouldSkipChildren?: boolean;
}

export interface IDecorationProvider {
    nodeTypes: string[];
    render: (
        node: EditorEngineSyntaxNode,
        context: IDecorationContext
    ) => IDecorationResult | EditorEngineRange<EditorEngineDecoration>[];
}

export interface IIsolatedProvider {
    nodeTypes: string[];
    ownerPluginID?: string;
    getPayload: (node: EditorEngineSyntaxNode, context: IDecorationContext) => any | null | Promise<any | null>;
}

export interface IEditorToolbarItem {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    type: 'button' | 'custom';
    render?: (props: {
        editorRef: React.MutableRefObject<any>;
        activeStates: Record<string, boolean>;
    }) => React.ReactNode;
    onClick?: (editorRef: React.MutableRefObject<any>) => void;
    shortcut?: string;
    order?: number;
    group?: 'basic' | 'insert' | 'history' | 'other';
}
