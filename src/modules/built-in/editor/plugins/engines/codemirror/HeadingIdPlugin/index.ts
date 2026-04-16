/**
 * HeadingIdPlugin — 标题 ID 语法插件
 * 
 * 支持 Markdown 扩展语法：### My Heading {#custom-id}
 * 
 * 职责：
 * 1. 注册编辑器装饰：非活跃行隐藏 {#id} 标记
 * 2. 注册 markdown-it 插件：导出时给 <h> 标签添加 id 属性
 * 3. 注册样式
 * 
 * 遵循原则:
 * - Plugin-First: 业务逻辑在 services/
 * - 零硬编码: 解析逻辑在 HeadingIdParser
 * - 零核心修改: 全部通过 context API 注册
 */

import { Decoration, EditorView } from '@codemirror/view';
import { IPlugin, PluginCategory, IPluginContext } from '@/kernel/system/plugin/types';
import { SyntaxNodeRef } from '@lezer/common';
import { IDecorationContext } from '../../../../registries/MarkdownDecorationRegistry';
import { parseHeadingId } from './services/HeadingIdParser';
import { headingIdMarkdownPlugin } from './services/HeadingIdMarkdownPlugin';
import { extractAnchorId, scrollToAnchor } from './services/AnchorLinkService';
import { HEADING_ID_CSS } from './styles/HeadingIdStyles';

/** 需要监听的标题节点类型 */
const HEADING_NODE_TYPES = [
    'ATXHeading1', 'ATXHeading2', 'ATXHeading3',
    'ATXHeading4', 'ATXHeading5', 'ATXHeading6',
];

export default class HeadingIdPlugin implements IPlugin {
    id = 'heading-id';
    name = 'Heading ID';
    version = '1.0.0';
    description = '支持 Markdown 标题 ID 语法 {#custom-id}，含文档内锚点跳转';
    category = PluginCategory.EDITOR;
    internal = true;
    order = 12;

    activate(context: IPluginContext) {
        // 1. 注册样式
        context.registerStyle('heading-id', HEADING_ID_CSS);

        // 2. 注册 markdown-it 插件（导出/预览支持）
        context.registerMarkdownUsage(headingIdMarkdownPlugin);

        // 3. 注册编辑器装饰器
        context.registerMarkdownDecorationProvider({
            nodeTypes: HEADING_NODE_TYPES,
            render: (node: SyntaxNodeRef, { state, isLineActive }: IDecorationContext) => {
                const { from } = node;

                // 光标在标题行时不隐藏，让用户编辑源码
                if (isLineActive(from)) return [];

                const line = state.doc.lineAt(from);
                const result = parseHeadingId(line.text, line.from);
                if (!result) return [];

                // 非活跃行: 隐藏 {#id} 标记
                return [
                    Decoration.mark({ class: 'cm-soft-hide' }).range(result.markFrom, result.markTo),
                ];
            },
        });

        // 4. 注册锚点链接点击拦截（Ctrl+Click 跳转到文档内标题）
        context.registerEditorExtension(
            EditorView.domEventHandlers({
                click: (event: MouseEvent, view: EditorView) => {
                    // 仅处理 Ctrl+Click (macOS: Meta+Click)
                    if (!event.ctrlKey && !event.metaKey) return false;

                    const target = event.target as HTMLElement;
                    const linkEl = target.closest('.cm-link-text');
                    if (!linkEl) return false;

                    const url = (linkEl as HTMLElement).dataset.url;
                    if (!url) return false;

                    // 仅拦截 # 开头的锚点链接
                    const anchorId = extractAnchorId(url);
                    if (!anchorId) return false;

                    // 锚点链接必须无条件拦截，防止冒泡到 PreviewPlugin 的
                    // openExternal() 打开系统资源管理器
                    event.preventDefault();
                    event.stopPropagation();

                    // 尝试跳转（失败则静默忽略）
                    scrollToAnchor(view, anchorId);
                    return true;
                },
            })
        );
    }
}
