import { THEME_CONSTANTS } from '@/shared/constants/ThemeConstants';
import { loggerService } from '@/kernel/services/LoggerService';

/**
 * 表格剪贴板服务
 * 针对 Markdown 渲染场景优化，确保复制内容能被识别为表格
 */
export class TableClipboardService {
    private static logger = loggerService.createLogger('TableClipboardService');

    /**
     * 处理原生 copy 事件
     */
    static handleCopy(e: ClipboardEvent, container: HTMLElement) {
        this.logger.info('handleCopy (native) triggered.');
        const data = this.generateCopyData(container, false);
        if (!data) return;

        e.preventDefault();
        e.stopPropagation();

        if (e.clipboardData) {
            e.clipboardData.setData('text/html', data.html);
            e.clipboardData.setData('text/plain', data.markdown);
            this.logger.info('(Native) Copied Markdown.', { len: data.markdown.length });
        }
    }

    /**
     * 异步写入剪贴板 (供拦截器和按钮使用)
     */
    static async writeToClipboard(data: { html: string, text: string }) {
        try {
            this.logger.info('writeToClipboard (Async) called.');
            const htmlBlob = new Blob([data.html], { type: 'text/html' });
            const textBlob = new Blob([data.text], { type: 'text/plain' });

            await navigator.clipboard.write([
                new ClipboardItem({
                    'text/html': htmlBlob,
                    'text/plain': textBlob
                })
            ]);
            this.logger.info('writeToClipboard Success.', { textLen: data.text.length });
            return true;
        } catch (err) {
            this.logger.error('writeToClipboard FAILED:', err);
            return false;
        }
    }

    /**
     * 生成剪贴板数据
     * : 确保 Markdown 输出包含必要的结构 (Header + Separator)
     */
    static generateCopyData(container: HTMLElement, fullStyle: boolean, forceAll = false) {
        let selectedCells: NodeListOf<Element>;
        if (forceAll) {
            selectedCells = container.querySelectorAll('th, td');
        } else {
            selectedCells = container.querySelectorAll('.selected-cell');
            if (selectedCells.length === 0) {
                selectedCells = container.querySelectorAll('th, td');
            }
        }

        if (selectedCells.length === 0) return null;

        let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
        const cellData: Map<string, { el: HTMLElement, r: number, c: number }> = new Map();

        selectedCells.forEach(cell => {
            const el = cell as HTMLTableCellElement;
            if (el.classList.contains('cm-table-row-handle')) return;

            const row = el.closest('tr') as HTMLTableRowElement | null;
            if (!row) return;

            const r = row.rowIndex;
            const c = el.cellIndex;
            minR = Math.min(minR, r); maxR = Math.max(maxR, r);
            minC = Math.min(minC, c); maxC = Math.max(maxC, c);
            cellData.set(`${r},${c}`, { el, r, c });
        });

        if (maxR < minR) return null;

        const getStyle = (el: HTMLElement) => {
            if (!fullStyle) return `border: 1px solid ${THEME_CONSTANTS.CLIPBOARD.COLOR_BORDER}; padding: 8px;`;
            const s = window.getComputedStyle(el);
            return `padding: ${s.padding}; border: 1px solid ${THEME_CONSTANTS.CLIPBOARD.COLOR_BORDER}; background: ${s.backgroundColor}; color: ${s.color}; font-weight: ${s.fontWeight}; text-align: ${s.textAlign};`;
        };

        // 1. 生成 HTML 表格
        let htmlContent = `<table style="border-collapse: collapse; border: 1px solid ${THEME_CONSTANTS.CLIPBOARD.COLOR_BORDER};">`;
        for (let r = minR; r <= maxR; r++) {
            htmlContent += `<tr>`;
            for (let c = minC; c <= maxC; c++) {
                const data = cellData.get(`${r},${c}`);
                if (data) {
                    const tag = data.el.tagName.toLowerCase();
                    htmlContent += `<${tag} style="${getStyle(data.el)}">${data.el.innerText}</${tag}>`;
                } else {
                    htmlContent += `<td style="border: 1px solid ${THEME_CONSTANTS.CLIPBOARD.COLOR_BORDER}; padding: 8px;"></td>`;
                }
            }
            htmlContent += `</tr>`;
        }
        htmlContent += `</table>`;

        // 2. 生成 Markdown 补全结构以便渲染
        const markdownRows: string[] = [];
        const headerCells = Array.from({ length: maxC - minC + 1 }, (_, cIdx) => {
            const data = cellData.get(`${minR},${cIdx + minC}`);
            return (data?.el.innerText || '').replace(/\|/g, '\\|');
        });
        markdownRows.push(`| ${headerCells.join(' | ')} |`);

        // 插入分隔符行
        const sepRow = `| ${Array(maxC - minC + 1).fill('---').join(' | ')} |`;
        markdownRows.push(sepRow);

        // 如果有多于一行，则生成剩余行
        for (let r = minR + 1; r <= maxR; r++) {
            const rowCells = Array.from({ length: maxC - minC + 1 }, (_, cIdx) => {
                const data = cellData.get(`${r},${cIdx + minC}`);
                return (data?.el.innerText || '').replace(/\|/g, '\\|');
            });
            markdownRows.push(`| ${rowCells.join(' | ')} |`);
        }
        const markdown = markdownRows.join('\n') + '\n';

        // 3. 生成 TSV (用于粘贴到 Excel)
        const plainText = Array.from({ length: maxR - minR + 1 }, (_, rIdx) => {
            return Array.from({ length: maxC - minC + 1 }, (_, cIdx) => {
                return cellData.get(`${rIdx + minR},${cIdx + minC}`)?.el.innerText || '';
            }).join('\t');
        }).join('\n');

        return { html: htmlContent, markdown, tsv: plainText };
    }
}
