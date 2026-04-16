import React from 'react';
import { Sigma } from 'lucide-react';
import { IPlugin, PluginCategory, IPluginContext } from '@/kernel/system/plugin/types';
import { markdownServiceFacet } from '../../../../constants/Facets';
import { SyntaxNodeRef } from '@lezer/common';
import { IDecorationContext } from '../../../../registries/MarkdownDecorationRegistry';
import markdownItKatex from 'markdown-it-katex';
import 'katex/dist/katex.min.css';
import { MATH_CSS } from './styles/MathStyles';
import { mathParser } from './services/MathParser';
import { MathButton } from './components/MathButton';

/**
 * 数学公式插件
 * 
 * 重构后的纯 wiring 入口
 * 
 * 职责：
 * 1. 提供 KaTeX 渲染支持
 * 2. 注册 Markdown-it 插件
 * 3. 提供 CodeMirror 装饰器
 * 
 * 遵循原则:
 * - Plugin-First: 解析逻辑在 MathParser
 * - 0 硬编码: Widget 在 widgets/MathWidgets
 */
export default class MathPlugin implements IPlugin {
    id = 'math-support';
    name = 'Math Support';
    version = '1.1.0';
    category = PluginCategory.EDITOR;
    internal = true;
    order = 20;
    // 懒加载配置
    lazy = true;
    activationTrigger = {
        type: 'syntax' as const,
        pattern: /\$[^$]+\$|\$\$[\s\S]+?\$\$/  // 匹配行内或块级数学公式
    };

    // 静态 UI 定义
    staticToolbarItems = [{
        id: 'insert-math',
        label: '插入公式',
        icon: Sigma,
        type: 'custom' as const,
        group: 'insert' as const,
        order: 20
    }];

    // 自动休眠超时 (10分钟)
    hibernationTimeout = 600000;

    activate(context: IPluginContext) {
        // 0. 注册工具栏渲染器 (因为是 custom 类型)
        context.registerEditorToolbarItem({
            id: 'insert-math',
            label: '插入公式',
            icon: Sigma,
            type: 'custom',
            group: 'insert',
            order: 20,
            render: () => React.createElement(MathButton, { kernel: context.kernel })
        });

        // 1. 注册样式
        context.registerStyle('math', MATH_CSS);

        // 2. 注册 Markdown-it 插件
        context.registerMarkdownUsage({
            id: 'katex',
            apply: (md) => {
                md.use(markdownItKatex, { throwOnError: false });
            }
        });

        // 3. 注册装饰器 (调用 MathParser)
        context.registerMarkdownDecorationProvider({
            nodeTypes: ['Paragraph', 'Blockquote'],
            render: (node: SyntaxNodeRef, { state, isRangeActive }: IDecorationContext) => {
                const { from, to } = node;
                const text = state.sliceDoc(from, to);
                const service = state.facet(markdownServiceFacet);
                const sourceName = service ? (service as { name: string }).name : 'default';

                return mathParser.parse(text, from, state, isRangeActive, sourceName);
            }
        });
    }
}
