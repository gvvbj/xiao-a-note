import { WidgetType, EditorView } from "@codemirror/view";
import { TableData, parseMarkdownTable, generateMarkdown, findTableEndPosition } from "../../../../../utils/tableUtils";
import { TableInteractionManager } from "./TableInteractionManager";
import { TableClipboardService } from "./TableClipboardService";
import { loggerService } from "@/kernel/services/LoggerService";

/**
 * Table Widget - 表格实时渲染扩展
 */
export class TableWidget extends WidgetType {
    private tableData: TableData;
    private tableText: string;
    private isDragging = false;
    private dragType: 'rect' | null = null;
    private dragStartRow: number = -1;
    private dragStartCol: number = -1;
    private upHandler: ((e: MouseEvent) => void) | null = null;
    private logger = loggerService.createLogger('TableWidget');

    constructor(data: TableData, text: string) {
        super();
        this.tableData = data;
        this.tableText = text;
    }

    eq(other: TableWidget) {
        return other.tableText === this.tableText &&
            other.tableData.from === this.tableData.from &&
            other.tableData.to === this.tableData.to;
    }

    ignoreEvent(event: Event) {
        if ((event.target as HTMLElement).closest('.cm-table-toolbar')) return true;

        const handledTypes = ['mousedown', 'mouseup', 'click', 'dblclick', 'selectstart'];
        if (handledTypes.includes(event.type)) return true;

        const target = event.target as HTMLElement;
        if (this.isEditingText(target)) {
            return true;
        }

        return false;
    }

    private isEditingText(target: HTMLElement): boolean {
        return target.getAttribute('contenteditable') === 'true';
    }

    toDOM(view: EditorView) {
        const container = document.createElement("div");
        container.className = "cm-table-widget";
        container.setAttribute('tabindex', '0');

        // [DEBUG] 焦点流向追踪
        container.addEventListener('focusout', (e: FocusEvent) => {
            const nextFocus = e.relatedTarget as HTMLElement;
            this.logger.info('focusout:', { nextFocus: nextFocus?.tagName });
            if (!container.contains(nextFocus)) {
                this.logger.info('Clearing selection: focus left widget.');
                TableInteractionManager.clearSelection(inner);
            }
        });

        // [FEATURE] 解决焦点捕捉与选区持久化
        container.onmousedown = (e: MouseEvent) => {
            const target = e.target as HTMLElement;

            // 只要不是在编辑文字，就强制将焦点给 container，确保 Ctrl+C 能被捕捉
            if (!this.isEditingText(target)) {
                this.logger.info('Focusing container to catch keyboard.');
                container.focus();
            }

            if (target === container || target === inner) {
                const rect = container.getBoundingClientRect();
                const padding = 12;
                const relativeY = e.clientY - rect.top;

                if (relativeY <= padding) {
                    e.preventDefault(); e.stopPropagation();
                    view.dispatch({ selection: { anchor: this.tableData.from } });
                    view.focus();
                } else if (relativeY >= rect.height - padding) {
                    e.preventDefault(); e.stopPropagation();
                    const end = findTableEndPosition(view.state, this.tableData.from);
                    view.dispatch({ selection: { anchor: end } });
                    view.focus();
                } else {
                    TableInteractionManager.clearSelection(inner);
                }
            }
        };

        const inner = document.createElement("div");
        inner.className = "cm-table-widget-inner";

        // === 1. Toolbar ===
        const toolbar = document.createElement("div");
        toolbar.className = "cm-table-toolbar";

        const createBtn = (label: string, handler: () => void, isDanger = false) => {
            const btn = document.createElement("div");
            btn.className = `cm-table-btn${isDanger ? ' cm-table-btn-danger' : ''}`;
            btn.textContent = label;
            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                handler();
            };
            return btn;
        };

        toolbar.appendChild(createBtn("增加行", () => this.addRow(view, inner, true)));
        toolbar.appendChild(createBtn("增加列", () => this.addCol(view, inner)));
        toolbar.appendChild(createBtn("删除行", () => this.deleteSelectedRow(view, inner), true));
        toolbar.appendChild(createBtn("删除列", () => this.deleteSelectedCol(view, inner), true));
        toolbar.appendChild(createBtn("复制表格", async () => {
            this.logger.info('Copy button clicked (Source).');
            const data = TableClipboardService.generateCopyData(inner, true);
            if (data) {
                this.logger.info('Source data generated.', { markdownLen: data.markdown.length });
                const sourceText = data.markdown.endsWith('\n') ? data.markdown : data.markdown + '\n';
                await TableClipboardService.writeToClipboard({
                    html: data.html,
                    text: sourceText // [REQ] 按钮复制源码 (Markdown)
                });
                const isSelection = inner.querySelectorAll('.selected-cell').length > 0;
                this.showCopySuccess(toolbar, isSelection ? "已复制源码" : "已复制全表");
            } else {
                this.logger.warn('Copy failed: No data generated.');
            }
        }));
        toolbar.appendChild(createBtn("删除表格", () => this.deleteTable(view), true));

        inner.appendChild(toolbar);

        // === 2. Event Listeners ===
        const handleKeyDown = (e: KeyboardEvent) => {
            // 拦截 Ctrl+C
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
                const selectedCells = inner.querySelectorAll('.selected-cell');
                this.logger.info('Ctrl+C intercepted (Content).', { selectedCells: selectedCells.length });
                if (selectedCells.length > 0) {
                    e.preventDefault();
                    e.stopPropagation();
                    const data = TableClipboardService.generateCopyData(inner, true);
                    if (data) {
                        TableClipboardService.writeToClipboard({
                            html: data.html,
                            text: data.tsv // [REQ] Ctrl+C 仅复制内容 (TSV)
                        }).then(success => {
                            if (success) {
                                this.logger.info('Ctrl+C Content Copy Success.');
                                this.showCopySuccess(toolbar, "已复制内容");
                            }
                        });
                    }
                    return;
                }
            }

            const target = e.target as HTMLElement;
            const isEditing = this.isEditingText(target);
            const table = inner.querySelector('table');

            // === 状态 A：正在编辑文本 ===
            if (isEditing) {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    // [UX] 内容编辑中，上下键跳转到邻近单元格
                    const tr = target.closest('tr');
                    const tbody = target.closest('tbody');
                    if (tr && (e.key === 'ArrowDown' ? (tbody && tbody.lastElementChild === tr) : (tr.parentElement?.tagName === 'THEAD'))) {
                        e.preventDefault();
                        const pos = e.key === 'ArrowDown'
                            ? findTableEndPosition(view.state, this.tableData.from)
                            : this.tableData.from;
                        view.dispatch({ selection: { anchor: pos } });
                        view.focus();
                    } else {
                        // 逻辑：找到上方/下方的单元格并进入编辑模式
                        const cells = Array.from(tr?.cells || []).filter(c => !c.classList.contains('cm-table-row-handle')) as HTMLTableCellElement[];
                        const colIdx = cells.indexOf(target as HTMLTableCellElement);

                        let nextTr: HTMLTableRowElement | null = null;
                        if (e.key === 'ArrowDown') {
                            if (tr?.parentElement?.tagName === 'THEAD') {
                                nextTr = table?.querySelector('tbody tr') as HTMLTableRowElement;
                            } else {
                                nextTr = tr?.nextElementSibling as HTMLTableRowElement;
                            }
                        } else {
                            if (tr?.parentElement?.tagName === 'TBODY' && !tr.previousElementSibling) {
                                nextTr = table?.querySelector('thead tr') as HTMLTableRowElement;
                            } else {
                                nextTr = tr?.previousElementSibling as HTMLTableRowElement;
                            }
                        }

                        if (nextTr) {
                            const nextCell = nextTr.cells[colIdx + 1];
                            if (nextCell) {
                                e.preventDefault();
                                nextCell.contentEditable = "true";
                                nextCell.focus();
                            }
                        }
                    }
                    return;
                }

                if (e.key === 'Tab') {
                    e.preventDefault(); e.stopPropagation();
                    const cells = Array.from(inner.querySelectorAll('th, td')).filter(c => !c.classList.contains('cm-table-row-handle')) as HTMLElement[];
                    const currentIndex = cells.indexOf(target);
                    if (e.shiftKey) {
                        if (currentIndex > 0) { cells[currentIndex - 1].contentEditable = "true"; cells[currentIndex - 1].focus(); }
                    } else {
                        if (currentIndex < cells.length - 1) { cells[currentIndex + 1].contentEditable = "true"; cells[currentIndex + 1].focus(); }
                        else { this.addRow(view, inner, true); }
                    }
                    return;
                }

                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const tr = target.closest('tr');
                    const cells = Array.from(tr?.cells || []).filter(c => !c.classList.contains('cm-table-row-handle')) as HTMLTableCellElement[];
                    const colIdx = cells.indexOf(target as HTMLTableCellElement);
                    const nextRow = tr?.nextElementSibling;
                    if (nextRow) {
                        const nextCell = (nextRow as HTMLTableRowElement).cells[colIdx + 1] as HTMLElement;
                        nextCell.contentEditable = "true"; nextCell.focus();
                    } else {
                        this.addRow(view, inner, true, colIdx);
                    }
                    return;
                }
                e.stopPropagation();
            }
            // === 状态 B：仅单元格选中 (Selection Mode) ===
            else {
                const rowCount = this.tableData.rows.length;
                const colCount = this.tableData.headers.length;

                if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                    e.preventDefault(); e.stopPropagation();
                    const dir = e.key.replace('Arrow', '') as 'Up' | 'Down' | 'Left' | 'Right';
                    TableInteractionManager.moveSelection(inner, dir, rowCount, colCount);
                    return;
                }

                if (e.key === 'Tab') {
                    e.preventDefault(); e.stopPropagation();
                    TableInteractionManager.moveSelection(inner, e.shiftKey ? 'Left' : 'Right', rowCount, colCount);
                    return;
                }

                if (e.key === 'Enter') {
                    e.preventDefault(); e.stopPropagation();
                    const selected = inner.querySelector('.selected-cell') as HTMLElement;
                    if (selected && !selected.classList.contains('cm-table-row-handle')) {
                        selected.contentEditable = "true";
                        selected.focus();
                        // 选中文本以便快速替换
                        const range = document.createRange();
                        range.selectNodeContents(selected);
                        const sel = window.getSelection();
                        sel?.removeAllRanges();
                        sel?.addRange(range);
                    }
                    return;
                }

                if (e.key === 'Backspace' || e.key === 'Delete') {
                    e.preventDefault(); e.stopPropagation();
                    const selectedCells = inner.querySelectorAll('.selected-cell');
                    if (selectedCells.length > 0) {
                        selectedCells.forEach(cell => {
                            if (!cell.classList.contains('cm-table-row-handle')) cell.textContent = '';
                        });
                        this.saveChanges(view, inner);
                    }
                    return;
                }
            }
        };

        container.addEventListener('keydown', handleKeyDown);
        inner.addEventListener('copy', (e) => {
            TableClipboardService.handleCopy(e as ClipboardEvent, inner);
        });

        // === 3. Table Render ===
        const table = document.createElement("table");
        table.className = "cm-rendered-table";

        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");
        const headerHandle = document.createElement("th");
        headerHandle.className = "cm-table-row-handle";
        headerRow.appendChild(headerHandle);

        this.tableData.headers.forEach((h: string, i: number) => {
            const th = document.createElement("th");
            th.innerText = h;
            this.attachCellListeners(th, view, inner);
            th.onmousedown = (e) => {
                if (this.isEditingText(th)) return;
                e.preventDefault(); e.stopPropagation();
                if (e.detail === 2) { th.contentEditable = "true"; th.focus(); return; }
                this.isDragging = true; this.dragType = 'rect';
                this.dragStartRow = -1; this.dragStartCol = i;
                container.focus();
                TableInteractionManager.selectRect(inner, -1, i, this.tableData.rows.length - 1, i);
            };
            th.onmouseenter = () => {
                if (this.isDragging && this.dragType === 'rect') {
                    TableInteractionManager.selectRect(inner, this.dragStartRow, this.dragStartCol, -1, i);
                }
            };
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement("tbody");
        this.tableData.rows.forEach((rowData, rIdx) => {
            const tr = document.createElement("tr");
            const handle = document.createElement("td");
            handle.className = "cm-table-row-handle";
            handle.onmousedown = (e) => {
                e.preventDefault(); e.stopPropagation();
                this.isDragging = true; this.dragType = 'rect';
                this.dragStartRow = rIdx; this.dragStartCol = -1;
                container.focus();
                TableInteractionManager.selectRowRange(inner, rIdx, rIdx);
            };
            handle.onmouseenter = () => {
                if (this.isDragging && this.dragType === 'rect') {
                    TableInteractionManager.selectRowRange(inner, this.dragStartRow, rIdx);
                }
            };
            tr.appendChild(handle);

            rowData.forEach((cellText, cIdx) => {
                const td = document.createElement("td");
                td.innerText = cellText;
                this.attachCellListeners(td, view, inner);
                td.onmousedown = (e) => {
                    if (this.isEditingText(td)) return;
                    e.preventDefault(); e.stopPropagation();
                    if (e.detail === 2) { td.contentEditable = "true"; td.focus(); return; }
                    this.isDragging = true; this.dragType = 'rect';
                    this.dragStartRow = rIdx; this.dragStartCol = cIdx;
                    container.focus();
                    TableInteractionManager.selectRect(inner, rIdx, cIdx, rIdx, cIdx);
                };
                td.onmouseenter = () => {
                    if (this.isDragging && this.dragType === 'rect') {
                        TableInteractionManager.selectRect(inner, this.dragStartRow, this.dragStartCol, rIdx, cIdx);
                    }
                };
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        inner.appendChild(table);
        container.appendChild(inner);

        this.upHandler = (e: MouseEvent) => {
            if (this.isDragging) {
                e.stopPropagation();
                this.isDragging = false;
                this.dragType = null;
            }
        };
        document.addEventListener('mouseup', this.upHandler, true);

        return container;
    }

    private showCopySuccess(toolbar: HTMLElement, text: string) {
        const btn = Array.from(toolbar.querySelectorAll('.cm-table-btn')).find(b => b.textContent?.includes("复制表格") || b.textContent?.includes("已复制")) as HTMLElement;
        if (btn) {
            const old = btn.textContent;
            btn.textContent = text;
            setTimeout(() => { if (btn) btn.textContent = old; }, 1500);
        }
    }

    destroy() {
        if (this.upHandler) {
            document.removeEventListener('mouseup', this.upHandler, true);
        }
    }

    private attachCellListeners(cell: HTMLElement, view: EditorView, inner: HTMLElement) {
        cell.onblur = () => {
            cell.contentEditable = "false";
            this.saveChanges(view, inner);
        };
    }

    private addRow(view: EditorView, inner: HTMLElement, autoFocus = false, focusCol = 0) {
        const data = this.getTableDataFromDOM(inner);
        if (data) {
            data.rows.push(Array(data.headers.length).fill('内容'));
            this.updateDocument(view, data);
            if (autoFocus) {
                setTimeout(() => {
                    const widgets = document.querySelectorAll('.cm-table-widget');
                    const targetWidget = Array.from(widgets).find(w => w.contains(document.activeElement));
                    const rows = (targetWidget || inner).querySelectorAll('tbody tr');
                    const lastRow = rows[rows.length - 1] as HTMLTableRowElement;
                    if (lastRow) {
                        const cell = lastRow.cells[focusCol + 1] as HTMLElement;
                        if (cell) { cell.contentEditable = "true"; cell.focus(); }
                    }
                }, 50);
            }
        }
    }

    private addCol(view: EditorView, inner: HTMLElement) {
        const data = this.getTableDataFromDOM(inner);
        if (data) {
            data.headers.push('新列');
            data.rows = data.rows.map(r => [...r, '内容']);
            this.updateDocument(view, data);
        }
    }

    private deleteSelectedRow(view: EditorView, inner: HTMLElement) {
        const data = this.getTableDataFromDOM(inner);
        if (!data || data.rows.length <= 1) return;
        const selectedRows = inner.querySelectorAll('.selected-row');
        const selectedIndices = new Set<number>();
        if (selectedRows.length > 0) {
            selectedRows.forEach(row => {
                const tr = row as HTMLTableRowElement;
                if (tr.parentElement?.tagName === 'TBODY') selectedIndices.add(tr.rowIndex - 1);
            });
        } else {
            const selectedCell = inner.querySelector('.selected-cell');
            if (selectedCell) {
                const tr = selectedCell.closest('tr') as HTMLTableRowElement;
                if (tr && tr.parentElement?.tagName === 'TBODY') selectedIndices.add(tr.rowIndex - 1);
            }
        }

        if (selectedIndices.size > 0) {
            data.rows = data.rows.filter((_, i) => !selectedIndices.has(i));
        } else {
            data.rows.pop();
        }
        this.updateDocument(view, data);
    }

    private deleteSelectedCol(view: EditorView, inner: HTMLElement) {
        const data = this.getTableDataFromDOM(inner);
        if (!data || data.headers.length <= 1) return;
        const selectedCells = inner.querySelectorAll('.selected-cell');
        const selectedIndices = new Set<number>();
        selectedCells.forEach(cell => {
            const td = cell as HTMLTableCellElement;
            selectedIndices.add(td.cellIndex - 1);
        });

        if (selectedIndices.size > 0) {
            data.headers = data.headers.filter((_, i) => !selectedIndices.has(i));
            data.rows = data.rows.map(r => r.filter((_, i) => !selectedIndices.has(i)));
        } else {
            data.headers.pop();
            data.rows = data.rows.map(r => { r.pop(); return r; });
        }
        this.updateDocument(view, data);
    }

    private deleteTable(view: EditorView) {
        this.logger.info('deleteTable called.', { from: this.tableData.from });
        const end = findTableEndPosition(view.state, this.tableData.from);
        this.logger.info('findTableEndPosition result:', { end });
        view.dispatch({ changes: { from: this.tableData.from, to: end, insert: '' } });
    }

    private saveChanges(view: EditorView, inner: HTMLElement) {
        const data = this.getTableDataFromDOM(inner);
        if (data) this.updateDocument(view, data);
    }

    private updateDocument(view: EditorView, data: TableData) {
        let markdown = generateMarkdown(data.headers, data.rows);
        const end = findTableEndPosition(view.state, this.tableData.from);

        // 物理隔离：确保表格下方始终有一个空行
        const docLen = view.state.doc.length;
        if (end < docLen) {
            const charAfter = view.state.doc.sliceString(end, end + 1);
            if (charAfter === '\n') {
                const secondCharAfter = view.state.doc.sliceString(end + 1, end + 2);
                if (secondCharAfter !== '\n' && secondCharAfter !== '') {
                    markdown += '\n\n'; // 补足空行
                } else {
                    markdown += '\n'; // 已有空行或处于文件末尾换行前
                }
            } else {
                markdown += '\n\n';
            }
        } else {
            markdown += '\n';
        }

        view.dispatch({ changes: { from: this.tableData.from, to: end, insert: markdown } });
    }

    private getTableDataFromDOM(inner: HTMLElement): TableData | null {
        const table = inner.querySelector('table');
        if (!table) return null;
        const headers = Array.from(table.querySelectorAll('thead th'))
            .filter((_, i) => i > 0)
            .map(th => (th as HTMLElement).innerText);
        const rows = Array.from(table.querySelectorAll('tbody tr')).map(tr =>
            Array.from(tr.querySelectorAll('td')).filter((_, i) => i > 0).map(td => (td as HTMLElement).innerText)
        );
        return { headers, rows, from: this.tableData.from, to: this.tableData.to };
    }
}

export { parseMarkdownTable };
