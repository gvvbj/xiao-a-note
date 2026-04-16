/**
 * 表格交互管理器
 * 封装行列选择、拖拽矩形选区等复杂逻辑
 */
export class TableInteractionManager {
    static getSelectedColumnIndices(container: HTMLElement): number[] {
        const indices: number[] = [];
        container.querySelectorAll('th.selected-cell').forEach(th => {
            const index = (th as HTMLTableCellElement).cellIndex;
            if (typeof index === 'number') indices.push(index);
        });
        return indices;
    }

    static clearSelection(container: HTMLElement) {
        container.querySelectorAll('.selected-cell, .selected-row').forEach(el => {
            el.classList.remove('selected-cell', 'selected-row');
        });
    }

    static selectColumnRange(container: HTMLElement, start: number, end: number) {
        this.clearSelection(container);
        const min = Math.min(start, end);
        const max = Math.max(start, end);

        // thead 和 tbody 结构现在已对齐（首列均为 handle）
        container.querySelectorAll('tr').forEach(tr => {
            Array.from((tr as HTMLTableRowElement).cells).forEach((cell, idx) => {
                const contentIdx = idx - 1; // 减 1 跳过行柄
                if (contentIdx >= min && contentIdx <= max) cell.classList.add('selected-cell');
            });
        });
    }

    static selectRowRange(container: HTMLElement, start: number, end: number) {
        this.clearSelection(container);
        const min = Math.min(start, end);
        const max = Math.max(start, end);
        const rows = Array.from(container.querySelectorAll('tbody tr'));
        rows.forEach((row, idx) => {
            if (idx >= min && idx <= max) {
                row.classList.add('selected-row');
                Array.from((row as HTMLTableRowElement).cells).forEach(c => c.classList.add('selected-cell'));
            }
        });
    }

    static selectRect(container: HTMLElement, startRow: number, startCol: number, endRow: number, endCol: number) {
        this.clearSelection(container);
        const rMin = Math.min(startRow, endRow);
        const rMax = Math.max(startRow, endRow);
        const cMin = Math.min(startCol, endCol);
        const cMax = Math.max(startCol, endCol);

        // 统一处理所有行（thead 为 -1, tbody 为 0..N）
        const allRows = Array.from(container.querySelectorAll('tr'));
        allRows.forEach(tr => {
            const isHeader = tr.parentElement?.tagName === 'THEAD';
            const rIdx = isHeader ? -1 : (tr as HTMLTableRowElement).rowIndex - 1;

            if (rIdx >= rMin && rIdx <= rMax) {
                Array.from((tr as HTMLTableRowElement).cells).forEach((cell, cIdx) => {
                    const contentCIdx = cIdx - 1; // 跳过行柄
                    if (contentCIdx >= cMin && contentCIdx <= cMax) {
                        cell.classList.add('selected-cell');
                    }
                });
            }
        });
    }

    /**
     * 获取当前聚焦的单元格坐标
     */
    static getFocusedCellCoords(container: HTMLElement): { r: number, c: number } | null {
        const selected = container.querySelector('.selected-cell') as HTMLTableCellElement;
        if (!selected) return null;
        const tr = selected.closest('tr') as HTMLTableRowElement;
        if (!tr) return null;
        const isHeader = tr.parentElement?.tagName === 'THEAD';
        const r = isHeader ? -1 : tr.rowIndex - 1;
        const c = selected.cellIndex - 1;
        return { r, c };
    }

    /**
     * 控制选择框在表格内移动
     */
    static moveSelection(container: HTMLElement, direction: 'Up' | 'Down' | 'Left' | 'Right', rowCount: number, colCount: number) {
        const current = this.getFocusedCellCoords(container) || { r: 0, c: 0 };
        let { r, c } = current;

        if (direction === 'Up') r--;
        else if (direction === 'Down') r++;
        else if (direction === 'Left') c--;
        else if (direction === 'Right') c++;

        // 限制范围
        r = Math.max(-1, Math.min(r, rowCount - 1));
        c = Math.max(0, Math.min(c, colCount - 1));

        this.selectRect(container, r, c, r, c);
    }
}
