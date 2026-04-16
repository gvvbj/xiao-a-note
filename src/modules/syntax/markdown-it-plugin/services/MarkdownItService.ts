import { IMarkdownService } from '@/kernel/interfaces/IMarkdownService';
// @ts-ignore
import MarkdownIt from 'markdown-it';
// @ts-ignore
import mk from 'markdown-it-katex';

type MarkdownItKatexImportShape = {
    default?: unknown;
};

export class MarkdownItService implements IMarkdownService {
    readonly name = 'markdown-it';

    private md: any = null;

    constructor() {
        this.init();
    }

    private init() {
        const mkModule = mk as MarkdownItKatexImportShape;
        const mkPlugin = mkModule.default || mk;
        this.md = new MarkdownIt({
            html: true,
            linkify: true,
            typographer: true,
        });
        if (typeof mkPlugin === 'function') {
            this.md.use(mkPlugin);
        }
    }

    async render(content: string): Promise<string> {
        return this.md.render(content);
    }

    renderInline(content: string): string {
        return this.md.renderInline(content);
    }
}
