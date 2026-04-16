/**
 * IEditorService - 编辑器状态管理服务接口
 * 
 * 核心接口定义
 * 
 * 职责:
 * 1. 管理编辑器核心状态 (currentFileId, isUnsaved, viewMode)
 * 2. 提供状态变更方法
 * 3. 发射状态变更事件
 */

import { CoreEvents } from '../core/Events';

/**
 * 编辑器状态类型
 */
export interface IEditorState {
    currentFileId: string | null;
    isUnsaved: boolean;
    headingNumbering: boolean;
    saveAsDialogOpen: boolean;
    viewMode: 'source' | 'preview';
    /**
     * 兼容态只读内容探针。
     * 注意：该字段不代表完整编辑器语义接口，后续 AI 正式写能力应迁移到 IEditorActionService。
     */
    currentContent?: string;
}

/**
 * 兼容态选区快照。
 * 仅用于收口当前扩展插件对白名单方法的依赖，不作为后续 AI 正式编辑接口。
 */
export interface IEditorSelectionSnapshot {
    from: number;
    to: number;
    text: string;
}

/**
 * 编辑器只读探针。
 * 由 UI 层注册到 EditorService，用于向受限插件暴露受控只读能力。
 */
export interface IEditorCompatibilityProbe {
    getCurrentContent?: () => string;
    getEditorView?: () => unknown | null;
    getSelection?: () => IEditorSelectionSnapshot | null;
}

/**
 * 编辑器服务接口
 */
export interface IEditorService {
    /**
     * 获取当前编辑器状态 (只读副本)
     */
    getState(): IEditorState;

    /**
     * 设置当前文件 ID
     * @param id 文件路径或 null
     */
    setCurrentFile(id: string | null): void;

    /**
     * 设置未保存状态
     * @param unsaved 是否有未保存的修改
     */
    setUnsaved(unsaved: boolean): void;

    /**
     * 设置标题编号开关
     * @param enable 是否启用
     */
    setHeadingNumbering(enable: boolean): void;

    /**
     * 设置视图模式
     * @param mode 'source' 或 'preview'
     */
    setViewMode(mode: 'source' | 'preview'): void;

    /**
     * 设置另存为对话框状态
     * @param open 是否打开
     */
    setSaveAsDialogOpen(open: boolean): void;

    /**
     * 获取当前文档内容（兼容态只读探针）
     */
    getCurrentContent(): string;

    /**
     * 获取底层编辑器视图（兼容态只读探针）
     * 注意：仅用于现有扩展兼容，不作为 AI 正式接口。
     */
    getEditorView(): unknown | null;

    /**
     * 获取当前选区（兼容态只读探针）
     */
    getSelection(): IEditorSelectionSnapshot | null;

    /**
     * 注册兼容态只读探针。
     * 该能力仅用于收口现有扩展对白名单方法的依赖。
     */
    registerCompatibilityProbe(probe: IEditorCompatibilityProbe): () => void;

    /**
     * 订阅状态变更事件
     * @param event 事件名
     * @param callback 回调函数
     */
    on(event: typeof CoreEvents.EDITOR_CHANGED, callback: (state: IEditorState) => void): this;

    /**
     * 取消订阅
     */
    off(event: typeof CoreEvents.EDITOR_CHANGED, callback: (state: IEditorState) => void): this;
}
