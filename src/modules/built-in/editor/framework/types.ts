import { EditorView } from "@codemirror/view";
import { IPluginContext as CentralPluginContext } from "@/kernel/system/plugin/types";
import type { IEditorToolbarItem as KernelEditorToolbarItem } from "@/kernel/interfaces/editor-types";
import type { IEditorDocumentSelection, IEditorTextEdit } from "@/kernel/interfaces/IEditorActionService";

export interface IEditorSelectionTarget {
  anchor: number;
  head?: number;
}

// 移除硬编码命令枚举，改为字符串以支持插件扩展
export interface IEditorRef {
  getContent: () => string;
  setContent: (content: string) => void;
  getScrollState: () => { cursorPosition: number; scrollTop: number; topLineNumber: number; topOffset: number };
  resetState: (content: string, cursorPosition?: number, scrollTop?: number, topLineNumber?: number, topOffset?: number) => void;
  executeCommand: (cmd: string, params?: unknown) => void;
  getActiveStates: () => Record<string, boolean>;
  getSelection: () => IEditorDocumentSelection | null;
  applyTextEdits: (edits: IEditorTextEdit[], selection?: IEditorSelectionTarget) => void;
  focus: () => void;
  view?: EditorView;
}

export interface IEditorToolbarItem extends Omit<KernelEditorToolbarItem, "render" | "onClick"> {
  render?: (props: { editorRef: React.MutableRefObject<IEditorRef | null>, activeStates: Record<string, boolean> }) => React.ReactNode;
  onClick?: (editorRef: React.MutableRefObject<IEditorRef | null>) => void;
}

/**
 * 使用来自插件系统的统一上下文类型
 */
export type IPluginContext = CentralPluginContext;
