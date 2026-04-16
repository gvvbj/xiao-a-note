import { EditorState } from "@codemirror/state";
import { loggerService } from "@/kernel/services/LoggerService";

export interface TableData {
    headers: string[];
    rows: string[][];
    from: number;
    to: number;
}

/**
 * 解析 Markdown 表格字符串
 */
export function parseMarkdownTable(text: string, offset: number = 0): TableData | null {
    const lines = text.trim().split('\n').map(l => l.trim());
    if (lines.length < 2) return null;

    // 第一行是表头
    const headers = lines[0].split('|').filter(s => s.trim() !== '').map(s => s.trim());

    // 第二行必须是分隔符 (---|---|---)
    const sepLine = lines[1];
    const sepParts = sepLine.split('|').filter(s => s.trim() !== '');
    const isSeparator = sepParts.length > 0 && sepParts.every(s => /^:?-+:?$/.test(s.trim()));
    if (!isSeparator) return null;

    // 剩余行是数据
    const rows = lines.slice(2).map(line => {
        const parts = line.split('|');
        // 去掉首尾空部分（如果存在）
        if (line.startsWith('|')) parts.shift();
        if (line.endsWith('|')) parts.pop();
        return parts.map(s => s.trim());
    });

    return {
        headers,
        rows,
        from: offset,
        to: offset + text.length
    };
}

/**
 * 将数据转换回 Markdown 表格
 */
export function generateMarkdown(headers: string[], rows: string[][]): string {
    const h = `| ${headers.join(' | ')} |`;
    const s = `| ${headers.map(() => '---').join(' | ')} |`;
    const r = rows.map(row => `| ${row.join(' | ')} |`).join('\n');
    return `${h}\n${s}\n${r}`;
}

/**
 * [CRITICAL] 精准寻找表格结束位置
 * 必须能够识别连续排放的相邻表格边界
 */
export function findTableEndPosition(state: EditorState, from: number): number {
    try {
        const doc = state.doc;
        const startLine = doc.lineAt(from).number;
        let lastTableLine = startLine;
        const logger = loggerService.createLogger('TableUtils');



        for (let i = startLine; i <= doc.lines; i++) {
            const lineText = doc.line(i).text.trim();

            // 如果不是以 | 开头且不是分隔符行，停止
            if (!lineText.startsWith('|')) {

                break;
            }

            // 检测相邻表格 (双行探测法)
            // 如果当前行 (i) 后面跟着一行 (i+1) 看起来像表头，且 (i+2) 是分隔符，则判定 i 是当前表格的物理终点
            if (i > startLine && i < doc.lines - 1) {
                const nextLineText = doc.line(i + 1).text.trim();
                const afterNextLineText = doc.line(i + 2).text.trim();

                // 检查 i+2 是否为有效的分隔符行 (---|---|---)
                const sepParts = afterNextLineText.split('|').filter(s => s.trim());
                const isSep = sepParts.length > 0 && sepParts.every(s => /^:?-+:?$/.test(s.trim()));

                // 如果 i+1 包含管道符且 i+2 是分隔符，那么 i+1 是下一个表格的开始
                if (isSep && nextLineText.includes('|') && !/^\|?[:\s-]+\|?$/.test(nextLineText)) {
                    logger.info(`BOUNDARY DETECTED at line ${i}. Line ${i + 1} starts a new table.`);
                    lastTableLine = i;
                    break;
                }
            }

            lastTableLine = i;
        }
        const resultPos = doc.line(lastTableLine).to;

        return resultPos;
    } catch (e) {
        loggerService.createLogger('TableUtils').error(`Error in findTableEndPosition:`, e);
        return from;
    }
}
