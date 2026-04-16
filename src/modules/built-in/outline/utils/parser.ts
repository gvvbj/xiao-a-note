

export interface OutlineItem {
    id: string;
    text: string;
    level: number;
    line: number;
}

/**
 * 解析 Markdown 文本生成大纲
 */
export function parseOutline(content: string): OutlineItem[] {
    const lines = content.split('\n');
    const items: OutlineItem[] = [];
    if (!content) return items;

    for (let i = 0; i < lines.length; i++) {
        const text = lines[i].trimEnd(); // 重要：移除 \r 等不可见字符
        const lineNumber = i + 1;

        // 1. 匹配标题 (支持 0-3 个前导空格)
        const headerMatch = text.match(/^\s{0,3}(#+)\s+(.*)/);
        if (headerMatch) {
            const level = headerMatch[1].length;
            items.push({
                id: `line-${lineNumber}`,
                text: headerMatch[2],
                level: level,
                line: lineNumber
            });
            continue;
        }

        // 2. 匹配列表 (\s* + 标记) - 兼容空格和 Tab
        const listMatch = text.match(/^(\s*)([-*]|\d+\.)\s+(.*)/);
        if (listMatch) {
            const tabs = listMatch[1].length;
            const listText = listMatch[3];

            // 向上寻找最近的 Header 作为基准
            let baseLevel = 1;
            for (let j = items.length - 1; j >= 0; j--) {
                if (!items[j].id.startsWith('list-')) {
                    baseLevel = items[j].level + 1;
                    break;
                }
            }

            items.push({
                id: `list-${lineNumber}`,
                text: listText,
                level: baseLevel + tabs,
                line: lineNumber
            });
        }
    }


    return items;
}