/**
 * IEditorHandle - 编辑器命令式接口
 * 用于在父组件或插件中通过 Ref 调用编辑器的核心方法
 */
export interface IEditorHandle {
    /** 获取当前编辑器完整内容 */
    getContent: () => string;
    /** 设置编辑器内容 */
    setContent: (content: string) => void;
    /** 重置编辑器内部状态（如清空历史记录） */
    resetState: () => void;
    /** 聚焦编辑器 */
    focus: () => void;
}

/** 统一的编辑器更新回调类型 */
export type EditorUpdateHandler = (content: string, changes?: any) => void;
