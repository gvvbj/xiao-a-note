import { WidgetType, EditorView } from '@codemirror/view';

/**
 * 水平分隔线 Widget
 */
export class HRWidget extends WidgetType {
    toDOM() {
        const hr = document.createElement("hr");
        hr.className = "cm-hr-widget";
        return hr;
    }
}

/**
 * 无序列表项目符号 Widget
 */
export class BulletWidget extends WidgetType {
    toDOM() {
        const span = document.createElement("span");
        span.textContent = "•";
        span.className = "cm-list-bullet";
        return span;
    }
}

/**
 * 任务复选框 Widget
 */
export class CheckboxWidget extends WidgetType {
    constructor(readonly checked: boolean, readonly pos: number) {
        super();
    }

    eq(other: CheckboxWidget) {
        return other.checked === this.checked;
    }

    toDOM(view: EditorView) {
        const input = document.createElement("input");
        input.type = "checkbox";
        input.className = "cm-task-checkbox";
        input.checked = this.checked;
        input.onmousedown = (e) => {
            e.preventDefault();
            const start = this.pos;
            const end = start + 3;
            const newText = this.checked ? "[ ]" : "[x]";
            view.dispatch({ changes: { from: start, to: end, insert: newText } });
        };
        return input;
    }
}
