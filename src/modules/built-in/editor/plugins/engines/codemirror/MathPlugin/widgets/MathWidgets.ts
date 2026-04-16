import { WidgetType, EditorView } from '@codemirror/view';
import { markdownServiceFacet } from '../../../../../constants/Facets';
import katex from 'katex';
import { sanitizeHTML } from '@/shared/utils/sanitize';

/**
 * 数学公式 Widget
 * 负责渲染 KaTeX 数学公式
 * 
 * XSS 防护: 使用 DOMPurify 消毒渲染输出
 */
export class MathWidget extends WidgetType {
    constructor(
        readonly formula: string,
        readonly isBlock: boolean,
        readonly renderSource: string
    ) {
        super();
    }

    eq(other: MathWidget) {
        return other.formula === this.formula &&
            other.isBlock === this.isBlock &&
            other.renderSource === this.renderSource;
    }

    toDOM(view: EditorView) {
        const el = document.createElement("div");
        const service = view.state.facet(markdownServiceFacet);

        if (this.isBlock) {
            el.className = "cm-math-widget-block rounded py-2 text-center cursor-pointer transition-all select-none my-1";
            el.style.backgroundColor = "hsl(var(--muted))";
            el.onclick = () => view.focus();
        } else {
            el.className = "cm-math-widget inline-block px-1 cursor-pointer rounded";
            el.style.backgroundColor = "hsl(var(--muted) / 0.5)";
            el.style.display = "inline-block";
        }

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const typedService = service as { renderInline?: (md: string) => string; name?: string } | null;
            if (typedService && typedService.renderInline) {
                const mdContent = this.isBlock ? `$$${this.formula}$$` : `$${this.formula}$`;
                // XSS 防护: 消毒 markdown 渲染输出
                el.innerHTML = sanitizeHTML(typedService.renderInline(mdContent));
                el.setAttribute('data-rendered-by', typedService.name || 'unknown');
            } else {
                katex.render(this.formula, el, {
                    displayMode: this.isBlock,
                    throwOnError: false,
                    output: 'html'
                });
            }
            if (view) {
                queueMicrotask(() => {
                    view.requestMeasure();
                });
            }
        } catch {
            el.textContent = this.formula;
            el.style.color = "hsl(var(--destructive))";
            el.style.fontFamily = "monospace";
        }
        return el;
    }

    ignoreEvent() {
        return false;
    }
}
