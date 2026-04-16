import { IMarkdownService } from '@/kernel/interfaces/IMarkdownService';
import { createEngineFacet } from '@/modules/built-in/editor/engines/codemirror/FacetBridge';

/**
 * Editor Facets Contract - 编辑器 Facet 协作契约
 *
 * 目的：
 * - 为 syntax/extensions 模块提供稳定的 Facet 引用入口
 * - 避免契约层 re-export 实现层常量，减少层间反向指向
 *
 * 说明：
 * - 该 Facet 由契约层定义，editor 实现层通过 re-export 兼容历史导入路径
 * - 保证 Facet 实例身份唯一，避免跨模块拿到不同 Facet 导致状态不一致
 */
export const markdownServiceFacet = createEngineFacet<IMarkdownService | null, IMarkdownService | null>({
    combine: values => values[values.length - 1] || null
});
