/**
 * 看板插件类型定义
 * 
 * 定义看板数据模型的所有接口和类型
 */

/** 卡片状态 */
export type CardStatus = 'todo' | 'doing' | 'done';

/** 看板卡片 */
export interface KanbanCard {
    /** 自动生成的唯一 ID (如 board-0-col-0-card-0) */
    id: string;
    /** 卡片正文 */
    text: string;
    /** 卡片状态: todo=[ ], doing=[/], done=[x] */
    status: CardStatus;
    /** 缩进子列表项 */
    children: string[];
    /** 引用块描述文字 */
    description: string;
}

/** 看板列 */
export interface KanbanColumn {
    /** 自动生成的唯一 ID (如 board-0-col-0) */
    id: string;
    /** 列标题 (## 标题内容) */
    title: string;
    /** 是否为已完成列 (标题包含 ✅) */
    isDone: boolean;
    /** 是否为进行中列 (标题包含 🔄) */
    isDoing: boolean;
    /** 列中的卡片 */
    cards: KanbanCard[];
}

/** 看板分组 */
export interface KanbanBoard {
    /** 自动生成的唯一 ID (如 board-0) */
    id: string;
    /** 分组标题 (# 标题内容) */
    title: string;
    /** 分组下的列 */
    columns: KanbanColumn[];
}

/** 看板整体数据 */
export interface KanbanData {
    /** 所有看板分组 */
    boards: KanbanBoard[];
    /** 原始 frontmatter 文本 (含 --- 分隔符) */
    frontmatter: string;
}

/** 看板视图状态 */
export interface KanbanViewState {
    /** 当前文件是否为看板文件 */
    isKanbanFile: boolean;
    /** 看板视图是否激活 */
    isActive: boolean;
    /** 看板数据 */
    data: KanbanData | null;
}

/** 卡片操作类型 */
export type KanbanAction =
    | { type: 'MOVE_CARD'; cardId: string; fromColumnId: string; toColumnId: string; position: number }
    | { type: 'TOGGLE_STATUS'; cardId: string }
    | { type: 'ADD_CARD'; columnId: string; text: string }
    | { type: 'DELETE_CARD'; cardId: string }
    | { type: 'EDIT_CARD'; cardId: string; text: string }
    | { type: 'ADD_COLUMN'; boardId: string; title: string }
    | { type: 'DELETE_COLUMN'; columnId: string };
