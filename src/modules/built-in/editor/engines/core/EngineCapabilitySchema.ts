/**
 * EngineCapabilitySchema - 引擎能力模型（D7）
 *
 * 目标：
 * - 统一定义“工具栏项/命令”级别能力。
 * - 为 D8 的能力驱动渲染提供只读契约。
 */

export const EditorToolbarCapability = {
    STRONG_EMPHASIS: 'StrongEmphasis',
    EMPHASIS: 'Emphasis',
    STRIKE_THROUGH: 'StrikeThrough',
    INLINE_CODE: 'InlineCode',
    HEADING_1: 'ATXHeading1',
    HEADING_2: 'ATXHeading2',
    BULLET_LIST: 'BulletList',
    ORDERED_LIST: 'OrderedList',
    TASK_LIST: 'Task',
    BLOCKQUOTE: 'Blockquote',
    UNDO: 'UNDO',
    REDO: 'REDO',
    TABLE: 'Table',
    LINK: 'Link',
    INSERT_MATH: 'insert-math',
    INSERT_EMOJI: 'insert-emoji',
    IMAGE: 'Image',
} as const;

export type EditorToolbarCapabilityId = typeof EditorToolbarCapability[keyof typeof EditorToolbarCapability];

export const EditorCommandCapability = {
    BOLD: 'BOLD',
    ITALIC: 'ITALIC',
    STRIKE: 'STRIKE',
    CODE: 'CODE',
    H1: 'H1',
    H2: 'H2',
    H3: 'H3',
    UL: 'UL',
    OL: 'OL',
    TASK: 'TASK',
    QUOTE: 'QUOTE',
    UNDO: 'UNDO',
    REDO: 'REDO',
    TABLE: 'TABLE',
    LINK: 'LINK',
    INSERT_IMAGE: 'INSERT_IMAGE',
    SEARCH_TOGGLE: 'editor.search.toggle',
    SEARCH_HIDE: 'editor.search.hide',
} as const;

export type EditorCommandCapabilityId = typeof EditorCommandCapability[keyof typeof EditorCommandCapability];

export interface IEditorEngineCapabilitySchema {
    engineId: string;
    toolbar: {
        supported: readonly EditorToolbarCapabilityId[];
    };
    commands: {
        supported: readonly EditorCommandCapabilityId[];
    };
}

export function isToolbarCapabilitySupported(
    schema: IEditorEngineCapabilitySchema,
    toolbarId: string
): boolean {
    return schema.toolbar.supported.includes(toolbarId as EditorToolbarCapabilityId);
}

export function isCommandCapabilitySupported(
    schema: IEditorEngineCapabilitySchema,
    commandId: string
): boolean {
    return schema.commands.supported.includes(commandId as EditorCommandCapabilityId);
}

export const CODEMIRROR_ENGINE_CAPABILITY_SCHEMA: IEditorEngineCapabilitySchema = {
    engineId: 'codemirror',
    toolbar: {
        supported: [
            EditorToolbarCapability.STRONG_EMPHASIS,
            EditorToolbarCapability.EMPHASIS,
            EditorToolbarCapability.STRIKE_THROUGH,
            EditorToolbarCapability.INLINE_CODE,
            EditorToolbarCapability.HEADING_1,
            EditorToolbarCapability.HEADING_2,
            EditorToolbarCapability.BULLET_LIST,
            EditorToolbarCapability.ORDERED_LIST,
            EditorToolbarCapability.TASK_LIST,
            EditorToolbarCapability.BLOCKQUOTE,
            EditorToolbarCapability.UNDO,
            EditorToolbarCapability.REDO,
            EditorToolbarCapability.TABLE,
            EditorToolbarCapability.LINK,
            EditorToolbarCapability.INSERT_MATH,
            EditorToolbarCapability.INSERT_EMOJI,
            EditorToolbarCapability.IMAGE,
        ],
    },
    commands: {
        supported: [
            EditorCommandCapability.BOLD,
            EditorCommandCapability.ITALIC,
            EditorCommandCapability.STRIKE,
            EditorCommandCapability.CODE,
            EditorCommandCapability.H1,
            EditorCommandCapability.H2,
            EditorCommandCapability.H3,
            EditorCommandCapability.UL,
            EditorCommandCapability.OL,
            EditorCommandCapability.TASK,
            EditorCommandCapability.QUOTE,
            EditorCommandCapability.UNDO,
            EditorCommandCapability.REDO,
            EditorCommandCapability.TABLE,
            EditorCommandCapability.LINK,
            EditorCommandCapability.INSERT_IMAGE,
            EditorCommandCapability.SEARCH_TOGGLE,
            EditorCommandCapability.SEARCH_HIDE,
        ],
    },
};
