import { IMarkdownPlugin } from "@/kernel/registries/MarkdownPluginRegistry";

type MarkdownItKatexModuleShape = {
    default?: unknown;
};

/**
 * KaTeX 插件：负责数学公式的解析、样式与净化
 */
export class KaTeXPlugin implements IMarkdownPlugin {
    readonly id = 'katex-plugin';
    readonly name = 'KaTeX Renderer';
    readonly category = 'core'; // 设为 core 以在扩展中心隐藏
    readonly internal = true;
    readonly order = 10; // 较早加载

    async apply(md: any) {
        // [Run-time Injection] 确保预览区样式的存在 (替代 main.tsx 里的 import)
        this.injectStyle();

        // 动态加载逻辑从内核迁移至此
        const MkModule = await import('markdown-it-katex');
        const mkModule = MkModule as MarkdownItKatexModuleShape;
        const mk = mkModule.default || MkModule;

        if (typeof mk === 'function') {
            md.use(mk);
        } else {
            const nestedDefault =
                typeof mk === 'object' && mk !== null
                    ? (mk as MarkdownItKatexModuleShape).default
                    : undefined;
            if (typeof nestedDefault === 'function') {
                md.use(nestedDefault);
            }
        }
    }

    private injectStyle() {
        const id = 'katex-style-cdn';
        if (document.getElementById(id)) return;

        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
    }

    /**
     * 将 CDN 链接从 EditorExportService 迁移至此
     */
    getCss() {
        return `
<!-- KaTeX 样式适配 -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" integrity="sha384-n8MVd4RsNIU0tAv4ctG8JJkNnqIDEd5rdDujlBBfQP7ASfEf7puDrtB6coEAbQPH" crossorigin="anonymous">
<style>
    .katex-display { margin: 1em 0; overflow-x: auto; overflow-y: hidden; padding: 0.5em 0; }
    .katex { font-size: 1.1em !important; }
</style>
        `.trim();
    }

    /**
     * 将净化规则从 EditorExportService 迁移至此
     */
    getPurifyConfig() {
        return {
            ADD_TAGS: [
                'math', 'annotation', 'semantics', 'mspace', 'mrow', 'mi', 'mn', 'mo', 'mtext',
                'ms', 'ms', 'mglyph', 'mstyle', 'mfrac', 'msqrt', 'mroot', 'msub', 'msup',
                'msubsup', 'mmultiscripts', 'mover', 'munder', 'munderover', 'mtable', 'mtr',
                'mtd', 'maction', 'menclose', 'merror', 'mphantom', 'mstyle', 'mpadded',
                'svg', 'path', 'g', 'defs', 'line', 'polyline', 'rect', 'circle', 'ellipse', 'polygon', 'use'
            ],
            ADD_ATTR: ['encoding', 'display', 'variant', 'd', 'viewBox', 'fill', 'stroke', 'points', 'transform', 'xmlns', 'xlink:href']
        };
    }
}

// [Auto-Discovery] 必须默认导出类，以便 PluginManager 自动实例化
export default KaTeXPlugin;
