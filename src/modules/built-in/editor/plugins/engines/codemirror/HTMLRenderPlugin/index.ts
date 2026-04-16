/**
 * HTMLRenderPlugin — HTML 内联标签实时渲染插件
 * 
 * 在 Markdown 编辑器中渲染安全的 HTML 内联标签，
 * 支持 <mark>, <kbd>, <sub>, <sup> 等语义化标签，
 * 以及 <span style="..."> 的白名单 CSS 属性渲染。
 * 
 * 职责：
 * 1. 注册编辑器装饰：非活跃区域隐藏标签、显示样式效果
 * 2. 注册 DOMPurify 白名单配置（导出安全）
 * 3. 注册样式
 * 
 * 遵循原则:
 * - Plugin-First: 解析逻辑在 services/HTMLTagParser
 * - 零硬编码: 标签和 CSS 白名单在 constants/HTMLConstants
 * - 安全优先: CSS 过滤在 services/CSSWhitelist
 * - 零核心修改: 全部通过 context API 注册
 */

import { IPlugin, PluginCategory, IPluginContext } from '@/kernel/system/plugin/types';
import { SyntaxNodeRef } from '@lezer/common';
import { IDecorationContext } from '../../../../registries/MarkdownDecorationRegistry';
import { buildHTMLDecorations } from './services/HTMLTagParser';
import { HTML_PURIFY_TAGS, HTML_PURIFY_ATTRS } from './constants/HTMLConstants';
import { HTML_RENDER_CSS } from './styles/HTMLRenderStyles';

/**
 * 需要扫描的节点类型
 * 
 * Lezer Markdown parser 不提供细粒度的 HTML 节点，
 * 只给出 Paragraph / Blockquote / ListItem 等容器节点。
 * 因此需要在这些容器中用正则扫描 HTML 标签（和 MathPlugin 策略一致）。
 */
const SCAN_NODE_TYPES = ['Paragraph', 'Blockquote', 'ListItem'];

export default class HTMLRenderPlugin implements IPlugin {
    id = 'html-render';
    name = 'HTML Inline Render';
    version = '1.0.0';
    description = '在编辑器中渲染安全的 HTML 内联标签（<mark>, <kbd>, <sub>, <sup> 等）';
    category = PluginCategory.EDITOR;
    internal = true;
    order = 15;

    activate(context: IPluginContext) {
        // 1. 注册样式
        context.registerStyle('html-render', HTML_RENDER_CSS);

        // 2. 注册 DOMPurify 白名单（导出时允许这些标签和属性通过净化）
        context.registerMarkdownUsage({
            id: 'html-render-purify',
            apply: () => { /* 无需 markdown-it 插件，DOMPurify 配置即可 */ },
            getPurifyConfig: () => ({
                ADD_TAGS: HTML_PURIFY_TAGS,
                ADD_ATTR: HTML_PURIFY_ATTRS,
            }),
        });

        // 3. 注册编辑器装饰器
        context.registerMarkdownDecorationProvider({
            nodeTypes: SCAN_NODE_TYPES,
            render: (node: SyntaxNodeRef, { state, isRangeActive }: IDecorationContext) => {
                const { from, to } = node;
                const text = state.sliceDoc(from, to);

                // 快速检测：无 < 字符则跳过，避免不必要的正则开销
                if (!text.includes('<')) return [];

                return buildHTMLDecorations(text, from, state, isRangeActive);
            },
        });
    }
}
