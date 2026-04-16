import { Facet } from '@codemirror/state';
import { MarkdownDecorationRegistry } from '../registries/MarkdownDecorationRegistry';
import { markdownServiceFacet } from '@/modules/interfaces/EditorFacets';

/**
 * 暴露给 CodeMirror 扩展的视图模式 Facet
 */
export const viewModeFacet = Facet.define<'source' | 'preview', 'source' | 'preview'>({
    combine: values => values[values.length - 1] || 'source'
});

/**
 * 暴露给 CodeMirror 扩展的基础路径 Facet (用于图片/附件预览)
 */
export const basePathFacet = Facet.define<string | null, string | null>({
    combine: values => values[values.length - 1] || null
});

// `markdownServiceFacet` 已下沉到契约层 `modules/interfaces/EditorFacets.ts`
// 这里通过 re-export 保持历史导入路径兼容性（避免一次性迁移全部 editor 内部插件）
export { markdownServiceFacet };

/**
 * 暴露给 CodeMirror 扩展的 Markdown 装饰注册表 Facet
 */
export const decorationRegistryFacet = Facet.define<MarkdownDecorationRegistry | null, MarkdownDecorationRegistry | null>({
    combine: values => values[values.length - 1] || null
});
