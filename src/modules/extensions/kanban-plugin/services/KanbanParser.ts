import { KanbanData, KanbanBoard, KanbanColumn, KanbanCard, CardStatus } from '../constants/types';

/**
 * 看板 Markdown 解析器
 * 
 * 职责：
 * 1. 解析 YAML frontmatter 检测看板文件
 * 2. 解析 Markdown 结构为 KanbanData
 * 3. 序列化 KanbanData 回 Markdown
 */
export class KanbanParser {

    /** 状态字符到 CardStatus 的映射 */
    private static readonly STATUS_MAP: Record<string, CardStatus> = {
        ' ': 'todo',
        '/': 'doing',
        'x': 'done',
    };

    /** CardStatus 到状态字符的映射 */
    private static readonly STATUS_CHAR_MAP: Record<CardStatus, string> = {
        todo: ' ',
        doing: '/',
        done: 'x',
    };

    /**
     * 解析 YAML frontmatter
     * 返回 type 字段值、原始 frontmatter 文本、正文内容
     */
    static parseFrontmatter(content: string): { type?: string; raw: string; body: string } {
        const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
        if (!match) {
            return { raw: '', body: content };
        }

        const raw = match[0];
        const body = content.slice(raw.length);
        const yaml = match[1];

        // 简单提取 type 字段（不引入完整 YAML 解析器）
        const typeMatch = yaml.match(/^type:\s*(.+)$/m);
        const type = typeMatch ? typeMatch[1].trim() : undefined;

        return { type, raw, body };
    }

    /**
     * 判断内容是否为看板文件
     * 对非字符串输入做安全处理（编辑器事件可能传入 undefined/null）
     */
    static isKanbanFile(content: string): boolean {
        if (typeof content !== 'string') return false;
        const { type } = this.parseFrontmatter(content);
        return type === 'kanban';
    }

    /**
     * 解析 Markdown 内容为看板数据结构
     * 
     * 规则：
     * - # 一级标题 → 看板分组 (Board)
     * - ## 二级标题 → 列 (Column)，标题含 ✅ 标识为已完成列
     * - - [ ] / - [x] / - [/] → 卡片 (Card)
     * - 缩进的 - 子列表 → 卡片子项 (children)
     * - 缩进的 > 引用块 → 卡片描述 (description)
     */
    static parseKanban(content: string): KanbanData {
        const { raw, body } = this.parseFrontmatter(content);
        const lines = body.split(/\r?\n/);

        const boards: KanbanBoard[] = [];
        let currentBoard: KanbanBoard | null = null;
        let currentColumn: KanbanColumn | null = null;
        let currentCard: KanbanCard | null = null;

        let boardIndex = 0;
        let columnIndex = 0;
        let cardIndex = 0;

        for (const line of lines) {
            // # 一级标题 → 新建分组
            if (/^# /.test(line)) {
                const title = line.replace(/^# /, '').trim();
                columnIndex = 0;
                cardIndex = 0;
                currentBoard = {
                    id: `board-${boardIndex++}`,
                    title,
                    columns: [],
                };
                boards.push(currentBoard);
                currentColumn = null;
                currentCard = null;
                continue;
            }

            // ## 二级标题 → 新建列（需在分组内）
            if (/^## /.test(line) && currentBoard) {
                const title = line.replace(/^## /, '').trim();
                cardIndex = 0;
                currentColumn = {
                    id: `${currentBoard.id}-col-${columnIndex++}`,
                    title,
                    isDone: title.includes('✅'),
                    isDoing: title.includes('🔄'),
                    cards: [],
                };
                currentBoard.columns.push(currentColumn);
                currentCard = null;
                continue;
            }

            // - [ ] / - [x] / - [/] → 新建卡片（需在列内）
            const cardMatch = line.match(/^- \[([ x/])\] (.+)/);
            if (cardMatch && currentColumn) {
                currentCard = {
                    id: `${currentColumn.id}-card-${cardIndex++}`,
                    text: cardMatch[2].trim(),
                    status: this.STATUS_MAP[cardMatch[1]] || 'todo',
                    children: [],
                    description: '',
                };
                currentColumn.cards.push(currentCard);
                continue;
            }

            // 缩进子列表项（需在卡片内）
            if (currentCard && /^ {2}- /.test(line)) {
                currentCard.children.push(line.replace(/^ {2}- /, '').trim());
                continue;
            }

            // 缩进引用块（需在卡片内）
            if (currentCard && /^ {2}> /.test(line)) {
                const desc = line.replace(/^ {2}> /, '').trim();
                currentCard.description = currentCard.description
                    ? currentCard.description + '\n' + desc
                    : desc;
                continue;
            }
        }

        return { boards, frontmatter: raw };
    }

    /**
     * 将看板数据序列化为 Markdown 文本
     */
    static serializeKanban(data: KanbanData): string {
        const parts: string[] = [];

        // 保留原始 frontmatter
        if (data.frontmatter) {
            parts.push(data.frontmatter);
        }

        for (const board of data.boards) {
            parts.push(`# ${board.title}`);
            parts.push('');

            for (const column of board.columns) {
                parts.push(`## ${column.title}`);

                for (const card of column.cards) {
                    const statusChar = this.STATUS_CHAR_MAP[card.status];
                    parts.push(`- [${statusChar}] ${card.text}`);

                    // 引用块描述
                    if (card.description) {
                        for (const descLine of card.description.split('\n')) {
                            parts.push(`  > ${descLine}`);
                        }
                    }

                    // 子列表项
                    for (const child of card.children) {
                        parts.push(`  - ${child}`);
                    }
                }

                parts.push('');
            }
        }

        return parts.join('\n');
    }
}
