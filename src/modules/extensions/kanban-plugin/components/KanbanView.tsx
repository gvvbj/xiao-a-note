import React from 'react';
import { KanbanController } from '../services/KanbanController';
import { KanbanBoard, KanbanColumn, KanbanCard } from '../constants/types';

// ─── 自定义确认弹窗 ───────────────────────────────────

interface ConfirmDialogProps {
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ message, onConfirm, onCancel }) => {
    // ESC 关闭
    React.useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onCancel]);

    return (
        <div className="kanban-confirm-overlay" onClick={onCancel}>
            <div className="kanban-confirm-dialog" onClick={e => e.stopPropagation()}>
                <p className="kanban-confirm-message">{message}</p>
                <div className="kanban-confirm-actions">
                    <button className="kanban-confirm-btn kanban-confirm-cancel" onClick={onCancel}>取消</button>
                    <button className="kanban-confirm-btn kanban-confirm-ok" onClick={onConfirm}>确定</button>
                </div>
            </div>
        </div>
    );
};

/**
 * 看板视图主组件
 * 
 * 注册到 EDITOR_MODALS 插槽，以全屏覆盖层方式渲染
 * 当看板模式激活时，覆盖编辑器内容区域
 * 支持拖拽（跨列 + 列内排序）、复选框切换、新增/删除/编辑卡片
 * 支持新建分组和编辑列标题
 */
interface KanbanViewProps {
    controller: KanbanController;
}

export const KanbanView: React.FC<KanbanViewProps> = ({ controller }) => {
    const [state, setState] = React.useState(controller.getState());
    const [dragCardId, setDragCardId] = React.useState<string | null>(null);
    const [dragOverColumnId, setDragOverColumnId] = React.useState<string | null>(null);
    const [dropIndex, setDropIndex] = React.useState<number>(-1);

    React.useEffect(() => {
        return controller.subscribe(() => {
            setState({ ...controller.getState() });
        });
    }, [controller]);

    // 非激活时不渲染任何内容
    if (!state.isActive || !state.data) {
        return null;
    }

    return (
        <div className="kanban-overlay">
            {/* 顶部工具栏 — 包含退出按钮 */}
            <div className="kanban-toolbar">
                <div className="kanban-toolbar-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="3" width="6" height="18" rx="1" />
                        <rect x="9" y="3" width="6" height="13" rx="1" />
                        <rect x="16" y="3" width="6" height="8" rx="1" />
                    </svg>
                    <span>看板视图</span>
                </div>
                <div className="kanban-toolbar-actions">
                    <button
                        className="kanban-exit-btn"
                        onClick={() => controller.toggleView()}
                        title="退出看板视图，返回源码编辑"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 3h6v6" />
                            <path d="M10 14L21 3" />
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        </svg>
                        退出看板
                    </button>
                </div>
            </div>

            {/* 看板内容区 */}
            <div className="kanban-root">
                {state.data.boards.map(board => (
                    <BoardSection
                        key={board.id}
                        board={board}
                        controller={controller}
                        dragCardId={dragCardId}
                        dragOverColumnId={dragOverColumnId}
                        dropIndex={dropIndex}
                        onDragStart={setDragCardId}
                        onDragOverColumn={setDragOverColumnId}
                        onDropIndexChange={setDropIndex}
                        onDragEnd={() => { setDragCardId(null); setDragOverColumnId(null); setDropIndex(-1); }}
                    />
                ))}
                {state.data.boards.length === 0 && (
                    <div className="kanban-empty">
                        暂无看板数据，请点击下方按钮新建分组
                    </div>
                )}

                {/* 新建分组 */}
                <AddBoardButton controller={controller} />
            </div>
        </div>
    );
};

// ─── 新建分组按钮 ─────────────────────────────────────

interface AddBoardButtonProps {
    controller: KanbanController;
}

const AddBoardButton: React.FC<AddBoardButtonProps> = ({ controller }) => {
    const [isAdding, setIsAdding] = React.useState(false);
    const [title, setTitle] = React.useState('');
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (isAdding && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isAdding]);

    const handleSubmit = () => {
        if (title.trim()) {
            controller.addBoard(title);
            setTitle('');
            setIsAdding(false);
        } else {
            setIsAdding(false);
            setTitle('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSubmit();
        } else if (e.key === 'Escape') {
            setIsAdding(false);
            setTitle('');
        }
    };

    if (isAdding) {
        return (
            <div className="kanban-add-board-input-wrapper">
                <input
                    ref={inputRef}
                    className="kanban-input kanban-add-board-input"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleSubmit}
                    placeholder="输入分组标题，回车确认（默认生成 待办/进行中/已完成 三列）..."
                />
            </div>
        );
    }

    return (
        <button className="kanban-add-board" onClick={() => setIsAdding(true)}>
            <span>+</span> 新建分组
        </button>
    );
};

// ─── 分组区域 ───────────────────────────────────────

interface BoardSectionProps {
    board: KanbanBoard;
    controller: KanbanController;
    dragCardId: string | null;
    dragOverColumnId: string | null;
    dropIndex: number;
    onDragStart: (cardId: string) => void;
    onDragOverColumn: (columnId: string | null) => void;
    onDropIndexChange: (index: number) => void;
    onDragEnd: () => void;
}

const BoardSection: React.FC<BoardSectionProps> = ({
    board, controller, dragCardId, dragOverColumnId, dropIndex,
    onDragStart, onDragOverColumn, onDropIndexChange, onDragEnd
}) => {
    const isHorizontal = board.columns.length <= 3;
    const [isRenaming, setIsRenaming] = React.useState(false);
    const [renameText, setRenameText] = React.useState(board.title);
    const renameRef = React.useRef<HTMLInputElement>(null);
    const [confirmTarget, setConfirmTarget] = React.useState<'board' | 'column' | null>(null);
    const [deleteColumnId, setDeleteColumnId] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (isRenaming && renameRef.current) {
            renameRef.current.focus();
            renameRef.current.select();
        }
    }, [isRenaming]);

    const handleRenameSubmit = () => {
        if (renameText.trim() && renameText !== board.title) {
            controller.renameBoard(board.id, renameText.trim());
        }
        setIsRenaming(false);
    };

    const handleRenameKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleRenameSubmit();
        } else if (e.key === 'Escape') {
            setRenameText(board.title);
            setIsRenaming(false);
        }
    };

    const handleDeleteBoard = () => setConfirmTarget('board');
    const handleDeleteColumn = (colId: string) => { setDeleteColumnId(colId); setConfirmTarget('column'); };

    return (
        <div>
            <div className="kanban-board-header">
                {isRenaming ? (
                    <input
                        ref={renameRef}
                        className="kanban-input kanban-board-title-input"
                        value={renameText}
                        onChange={e => setRenameText(e.target.value)}
                        onKeyDown={handleRenameKeyDown}
                        onBlur={handleRenameSubmit}
                    />
                ) : (
                    <h2
                        className="kanban-board-title"
                        onDoubleClick={() => { setRenameText(board.title); setIsRenaming(true); }}
                        title="双击重命名分组"
                    >
                        {board.title}
                    </h2>
                )}
                <div className="kanban-board-actions">
                    <button
                        className="kanban-board-action-btn"
                        onClick={() => { setRenameText(board.title); setIsRenaming(true); }}
                        title="重命名分组"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                        </svg>
                    </button>
                    <button
                        className="kanban-board-action-btn kanban-board-delete-btn"
                        onClick={handleDeleteBoard}
                        title="删除分组"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                    </button>
                </div>
            </div>
            <div className={isHorizontal ? 'kanban-columns-horizontal' : 'kanban-columns-vertical'}>
                {board.columns.map(column => (
                    <ColumnPanel
                        key={column.id}
                        column={column}
                        controller={controller}
                        dragCardId={dragCardId}
                        isDragOver={dragOverColumnId === column.id}
                        dropIndex={dragOverColumnId === column.id ? dropIndex : -1}
                        onDragStart={onDragStart}
                        onDragOverColumn={onDragOverColumn}
                        onDropIndexChange={onDropIndexChange}
                        onDragEnd={onDragEnd}
                        onDeleteColumn={handleDeleteColumn}
                    />
                ))}
                <AddColumnButton boardId={board.id} controller={controller} />
            </div>

            {/* 自定义确认弹窗 */}
            {confirmTarget === 'board' && (
                <ConfirmDialog
                    message={`确定删除分组「${board.title}」及其所有内容吗？`}
                    onConfirm={() => { controller.deleteBoard(board.id); setConfirmTarget(null); }}
                    onCancel={() => setConfirmTarget(null)}
                />
            )}
            {confirmTarget === 'column' && deleteColumnId && (
                <ConfirmDialog
                    message={`确定删除此列及其所有卡片吗？`}
                    onConfirm={() => { controller.deleteColumn(deleteColumnId); setConfirmTarget(null); setDeleteColumnId(null); }}
                    onCancel={() => { setConfirmTarget(null); setDeleteColumnId(null); }}
                />
            )}
        </div>
    );
};

// ─── 新建列按钮 ─────────────────────────────────────

interface AddColumnButtonProps {
    boardId: string;
    controller: KanbanController;
}

const AddColumnButton: React.FC<AddColumnButtonProps> = ({ boardId, controller }) => {
    const [isAdding, setIsAdding] = React.useState(false);
    const [title, setTitle] = React.useState('');
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (isAdding && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isAdding]);

    const handleSubmit = () => {
        if (title.trim()) {
            controller.addColumn(boardId, title);
            setTitle('');
            setIsAdding(false);
        } else {
            setIsAdding(false);
            setTitle('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSubmit();
        else if (e.key === 'Escape') { setIsAdding(false); setTitle(''); }
    };

    if (isAdding) {
        return (
            <div className="kanban-column kanban-add-column-input">
                <input
                    ref={inputRef}
                    className="kanban-input"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleSubmit}
                    placeholder="输入列标题..."
                />
            </div>
        );
    }

    return (
        <button className="kanban-add-column" onClick={() => setIsAdding(true)}>
            <span>+</span> 新建列
        </button>
    );
};

// ─── 列面板 ─────────────────────────────────────────

interface ColumnPanelProps {
    column: KanbanColumn;
    controller: KanbanController;
    dragCardId: string | null;
    isDragOver: boolean;
    dropIndex: number;
    onDragStart: (cardId: string) => void;
    onDragOverColumn: (columnId: string | null) => void;
    onDropIndexChange: (index: number) => void;
    onDragEnd: () => void;
    onDeleteColumn: (columnId: string) => void;
}

const ColumnPanel: React.FC<ColumnPanelProps> = ({
    column, controller, dragCardId, isDragOver, dropIndex,
    onDragStart, onDragOverColumn, onDropIndexChange, onDragEnd, onDeleteColumn
}) => {
    const [isAdding, setIsAdding] = React.useState(false);
    const [newCardText, setNewCardText] = React.useState('');
    const [isEditingTitle, setIsEditingTitle] = React.useState(false);
    const [editTitle, setEditTitle] = React.useState(column.title);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const titleInputRef = React.useRef<HTMLInputElement>(null);
    const columnRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (isAdding && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isAdding]);

    React.useEffect(() => {
        if (isEditingTitle && titleInputRef.current) {
            titleInputRef.current.focus();
            titleInputRef.current.select();
        }
    }, [isEditingTitle]);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        onDragOverColumn(column.id);

        // 如果拖动到列的空白区域（不在任何卡片上），设置 dropIndex 为末尾
        const target = e.target as HTMLElement;
        const isOnCard = target.closest('.kanban-card');
        if (!isOnCard) {
            onDropIndexChange(column.cards.length);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        // 只在真正离开列时重置
        const relatedTarget = e.relatedTarget as HTMLElement;
        if (columnRef.current && !columnRef.current.contains(relatedTarget)) {
            onDragOverColumn(null);
            onDropIndexChange(-1);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (dragCardId) {
            const pos = dropIndex >= 0 ? dropIndex : column.cards.length;
            controller.moveCard(dragCardId, column.id, pos);
        }
        onDragEnd();
    };

    const handleAddCard = () => {
        if (newCardText.trim()) {
            controller.addCard(column.id, newCardText);
            setNewCardText('');
            setIsAdding(false);
        }
    };

    const handleAddKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleAddCard();
        } else if (e.key === 'Escape') {
            setIsAdding(false);
            setNewCardText('');
        }
    };

    const handleTitleSubmit = () => {
        if (editTitle.trim() && editTitle !== column.title) {
            controller.editColumnTitle(column.id, editTitle.trim());
        }
        setIsEditingTitle(false);
    };

    const handleTitleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleTitleSubmit();
        } else if (e.key === 'Escape') {
            setEditTitle(column.title);
            setIsEditingTitle(false);
        }
    };

    return (
        <div
            ref={columnRef}
            className={`kanban-column ${isDragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="kanban-column-header">
                {isEditingTitle ? (
                    <input
                        ref={titleInputRef}
                        className="kanban-input kanban-column-title-input"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        onKeyDown={handleTitleKeyDown}
                        onBlur={handleTitleSubmit}
                    />
                ) : (
                    <span
                        className="kanban-column-title"
                        onDoubleClick={() => { setEditTitle(column.title); setIsEditingTitle(true); }}
                        title="双击编辑列名"
                    >
                        {column.title}
                    </span>
                )}
                <span className="kanban-column-count">{column.cards.length}</span>
                <div className="kanban-column-actions">
                    <button
                        className="kanban-column-action-btn"
                        onClick={() => { setEditTitle(column.title); setIsEditingTitle(true); }}
                        title="重命名列"
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                        </svg>
                    </button>
                    <button
                        className="kanban-column-action-btn kanban-column-delete-btn"
                        onClick={() => onDeleteColumn(column.id)}
                        title="删除列"
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
            </div>

            {column.cards.map((card, index) => (
                <React.Fragment key={card.id}>
                    {/* 拖拽插入指示器 - 在卡片上方 */}
                    {isDragOver && dropIndex === index && (
                        <div className="kanban-drop-indicator" />
                    )}
                    <CardItem
                        card={card}
                        index={index}
                        controller={controller}
                        isDragging={dragCardId === card.id}
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd}
                        onDragOverCard={(idx) => {
                            onDragOverColumn(column.id);
                            onDropIndexChange(idx);
                        }}
                    />
                </React.Fragment>
            ))}

            {/* 拖拽插入指示器 - 在列尾 */}
            {isDragOver && dropIndex === column.cards.length && column.cards.length > 0 && (
                <div className="kanban-drop-indicator" />
            )}

            {isAdding ? (
                <input
                    ref={inputRef}
                    className="kanban-input"
                    value={newCardText}
                    onChange={e => setNewCardText(e.target.value)}
                    onKeyDown={handleAddKeyDown}
                    onBlur={() => {
                        if (newCardText.trim()) {
                            handleAddCard();
                        } else {
                            setIsAdding(false);
                            setNewCardText('');
                        }
                    }}
                    placeholder="输入任务内容..."
                />
            ) : (
                <button className="kanban-add-card" onClick={() => setIsAdding(true)}>
                    <span>+</span> 添加卡片
                </button>
            )}
        </div>
    );
};

// ─── 卡片项 ─────────────────────────────────────────

interface CardItemProps {
    card: KanbanCard;
    index: number;
    controller: KanbanController;
    isDragging: boolean;
    onDragStart: (cardId: string) => void;
    onDragEnd: () => void;
    onDragOverCard: (index: number) => void;
}

const CardItem: React.FC<CardItemProps> = ({
    card, index, controller, isDragging, onDragStart, onDragEnd, onDragOverCard
}) => {
    const [isEditing, setIsEditing] = React.useState(false);
    const [editText, setEditText] = React.useState(card.text);
    const cardRef = React.useRef<HTMLDivElement>(null);

    const handleEditSubmit = () => {
        if (editText.trim() && editText !== card.text) {
            controller.editCard(card.id, editText.trim());
        }
        setIsEditing(false);
    };

    const handleEditKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleEditSubmit();
        } else if (e.key === 'Escape') {
            setEditText(card.text);
            setIsEditing(false);
        }
    };

    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(card.id);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!cardRef.current) return;

        const rect = cardRef.current.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;

        // 鼠标在卡片上半部 → 插入到此卡片前；下半部 → 插入到此卡片后
        if (e.clientY < midY) {
            onDragOverCard(index);
        } else {
            onDragOverCard(index + 1);
        }
    };

    const checkboxClass = card.status === 'done' ? 'checked' : card.status === 'doing' ? 'doing' : '';

    return (
        <div
            ref={cardRef}
            className={`kanban-card ${isDragging ? 'dragging' : ''} ${card.status === 'done' ? 'done' : ''}`}
            draggable={!isEditing}
            onDragStart={handleDragStart}
            onDragEnd={onDragEnd}
            onDragOver={handleDragOver}
        >
            <div className="kanban-card-content">
                {/* 复选框 */}
                <button
                    className={`kanban-card-checkbox ${checkboxClass}`}
                    onClick={() => controller.toggleCardStatus(card.id)}
                >
                    {card.status === 'done' && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    )}
                </button>

                {/* 卡片文本 */}
                {isEditing ? (
                    <input
                        className="kanban-input"
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        onKeyDown={handleEditKeyDown}
                        onBlur={handleEditSubmit}
                        autoFocus
                    />
                ) : (
                    <span
                        className="kanban-card-text"
                        onDoubleClick={() => { setEditText(card.text); setIsEditing(true); }}
                    >
                        {card.text}
                    </span>
                )}

                {/* 删除按钮 */}
                <button
                    className="kanban-card-delete"
                    onClick={() => controller.deleteCard(card.id)}
                    title="删除卡片"
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>

            {/* 描述 */}
            {card.description && (
                <div className="kanban-card-description">{card.description}</div>
            )}

            {/* 子项 */}
            {card.children.length > 0 && (
                <div className="kanban-card-children">
                    {card.children.map((child, i) => (
                        <div key={i} className="kanban-card-child">{child}</div>
                    ))}
                </div>
            )}
        </div>
    );
};
