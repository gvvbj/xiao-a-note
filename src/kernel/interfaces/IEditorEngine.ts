/**
 * IEditorEngine - 编辑器引擎抽象契约
 *
 * 说明：
 * - 此文件定义内核可依赖的“引擎无关”类型。
 * - 具体引擎（CodeMirror / ProseMirror）由内部插件实现并注册。
 */

export type EditorEngineView = any;
export type EditorEngineState = any;
export type EditorEngineExtension = any;
export type EditorEngineDecoration = any;
export type EditorEngineRange<T = any> = any;
export type EditorEngineSyntaxNode = any;

export interface IEditorEngineSelection {
    from: number;
    to: number;
}

export interface IEditorEngineSnapshot {
    content: string;
    selection?: IEditorEngineSelection;
    scrollTop?: number;
}

export interface IEditorEngine {
    id: string;
    name: string;
    version: string;

    // 运行时模块导出（供 SystemModuleRegistry 做注入桥接）
    getRuntimeModules?: () => Record<string, unknown>;
}

