import { WidgetType, EditorView } from '@codemirror/view';
import { loggerService } from '@/kernel/services/LoggerService';

const logger = loggerService.createLogger('CodeBlockWidgets');

/**
 * 代码块头部 Widget
 * 负责渲染代码块的顶栏（语言选择 + 复制按钮）
 */
export class CodeBlockHeaderWidget extends WidgetType {
    constructor(
        readonly language: string,
        readonly codeContent: string,
        readonly lineFrom: number
    ) {
        super();
    }

    eq(other: CodeBlockHeaderWidget) {
        return other.language === this.language &&
            other.lineFrom === this.lineFrom &&
            other.codeContent === this.codeContent;
    }

    ignoreEvent(event: Event) {
        if (event.type === 'click' || event.type === 'mousedown') return false;
        return true;
    }

    toDOM(view: EditorView) {
        const wrapper = document.createElement("div");
        wrapper.className = "cm-codeblock-header";

        const controls = document.createElement("div");
        controls.className = "cm-codeblock-controls";
        ['#ff5f56', '#ffbd2e', '#27c93f'].forEach(color => {
            const dot = document.createElement("div");
            dot.className = "cm-codeblock-dot";
            dot.style.backgroundColor = color;
            controls.appendChild(dot);
        });
        wrapper.appendChild(controls);

        const langGroup = document.createElement("div");
        langGroup.className = "cm-codeblock-lang-group";

        const codeIcon = document.createElement("span");
        codeIcon.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`;
        codeIcon.className = "cm-codeblock-icon";

        const langInput = document.createElement("input");
        langInput.type = "text";
        langInput.className = "cm-codeblock-lang-input";
        langInput.value = this.language || "";
        langInput.placeholder = "Plain Text";
        langInput.spellcheck = false;

        const updateLanguage = () => {
            const newLang = langInput.value.trim();
            if (newLang === this.language) return;
            const line = view.state.doc.line(view.state.doc.lineAt(this.lineFrom).number);
            const currentText = line.text;
            const newText = "```" + newLang;
            if (currentText !== newText) {
                view.dispatch({ changes: { from: line.from, to: line.to, insert: newText } });
            }
        };

        langInput.onblur = updateLanguage;
        langInput.onkeydown = (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                updateLanguage();
                view.focus();
            }
            e.stopPropagation();
        };
        langInput.onmousedown = (e) => e.stopPropagation();
        langInput.onclick = (e) => e.stopPropagation();

        langGroup.appendChild(codeIcon);
        langGroup.appendChild(langInput);

        const copyBtn = document.createElement("button");
        copyBtn.className = "cm-codeblock-copy-btn";
        const ICO_COPY = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><span>Copy</span>`;
        const ICO_OK = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-green-500"><polyline points="20 6 9 17 4 12"></polyline></svg><span>Copied!</span>`;

        copyBtn.innerHTML = ICO_COPY;
        copyBtn.onclick = (e) => {
            e.stopPropagation();
            e.preventDefault();
            if (!this.codeContent) return;
            navigator.clipboard.writeText(this.codeContent).then(() => {
                copyBtn.innerHTML = ICO_OK;
                const timer = copyBtn.getAttribute('data-timer');
                if (timer) clearTimeout(parseInt(timer));
                const newTimer = window.setTimeout(() => {
                    copyBtn.innerHTML = ICO_COPY;
                    copyBtn.removeAttribute('data-timer');
                }, 2000);
                copyBtn.setAttribute('data-timer', newTimer.toString());
            }).catch(err => {
                logger.error('Failed to copy', err);
            });
        };
        copyBtn.onmousedown = (e) => e.stopPropagation();

        wrapper.appendChild(langGroup);
        wrapper.appendChild(copyBtn);

        wrapper.onmousedown = (e) => {
            if (e.target === wrapper || e.target === controls || (e.target as Element).className === 'cm-codeblock-dot') {
                e.preventDefault();
                const line = view.state.doc.lineAt(this.lineFrom);
                if (line.number < view.state.doc.lines) {
                    const nextLine = view.state.doc.line(line.number + 1);
                    view.dispatch({ selection: { anchor: nextLine.from }, scrollIntoView: true });
                }
                view.focus();
            }
        };

        return wrapper;
    }
}
