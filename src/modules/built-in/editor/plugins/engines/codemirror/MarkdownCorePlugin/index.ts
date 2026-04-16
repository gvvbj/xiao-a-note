import {
    Bold, Italic, Strikethrough, Code, Heading1, Heading2,
    List, ListOrdered, CheckSquare, Quote
} from 'lucide-react';
import { IPlugin, PluginCategory, IPluginContext } from '@/kernel/system/plugin/types';
import { keymap } from '@codemirror/view';
import { Prec } from '@codemirror/state';
import { Decoration } from '@codemirror/view';
import { Range } from '@codemirror/state';

// 模块化导入
import { HRWidget, BulletWidget, CheckboxWidget } from './widgets/MarkdownWidgets';
import { MARKDOWN_CORE_CSS } from './styles/MarkdownStyles';
import { getMarkdownCommands, getMarkdownKeymap, wrapText } from './services/MarkdownCommands';

/**
 * 核心 Markdown 编辑插件
 * 
 * 职责：
 * 1. 注册样式、命令、工具栏项
 * 2. 注册 Live Preview 装饰器
 * 
 * 注意：本文件仅负责注册
 * - 命令逻辑在 services/MarkdownCommands.ts
 * - Widget 在 widgets/MarkdownWidgets.ts
 * - 样式在 styles/MarkdownStyles.ts
 */
export default class MarkdownCorePlugin implements IPlugin {
    id = 'markdown-core';
    readonly name = 'Markdown Core';
    readonly category = PluginCategory.CORE;
    readonly internal = true;
    readonly order = 10;
    readonly description = 'Provides basic Markdown features (Toolbar + Live Preview decorations).';
    version = '1.1.0';
    readonly essential = true;

    activate(context: IPluginContext) {
        // --- 1. 注册样式 ---
        context.registerStyle('markdown-core', MARKDOWN_CORE_CSS);

        // --- 2. 注册命令 ---
        const commands = getMarkdownCommands();
        commands.forEach(cmd => context.registerCommand(cmd));

        // --- 3. 注册工具栏项 ---
        context.registerEditorToolbarItem({
            id: 'StrongEmphasis', label: '加粗', icon: Bold, type: 'button', group: 'basic', order: 10,
            onClick: (ref) => ref.current?.executeCommand('BOLD')
        });

        context.registerEditorToolbarItem({
            id: 'Emphasis', label: '斜体', icon: Italic, type: 'button', group: 'basic', order: 11,
            onClick: (ref) => ref.current?.executeCommand('ITALIC')
        });

        context.registerEditorToolbarItem({
            id: 'StrikeThrough', label: '删除线', icon: Strikethrough, type: 'button', group: 'basic', order: 12,
            onClick: (ref) => ref.current?.executeCommand('STRIKE')
        });

        context.registerEditorToolbarItem({
            id: 'InlineCode', label: '行内代码', icon: Code, type: 'button', group: 'basic', order: 13,
            onClick: (ref) => ref.current?.executeCommand('CODE')
        });

        context.registerEditorToolbarItem({
            id: 'ATXHeading1', label: '一级标题', icon: Heading1, type: 'button', group: 'basic', order: 20,
            onClick: (ref) => ref.current?.executeCommand('H1')
        });

        context.registerEditorToolbarItem({
            id: 'ATXHeading2', label: '二级标题', icon: Heading2, type: 'button', group: 'basic', order: 21,
            onClick: (ref) => ref.current?.executeCommand('H2')
        });

        context.registerEditorToolbarItem({
            id: 'BulletList', label: '无序列表', icon: List, type: 'button', group: 'basic', order: 30,
            onClick: (ref) => ref.current?.executeCommand('UL')
        });

        context.registerEditorToolbarItem({
            id: 'OrderedList', label: '有序列表', icon: ListOrdered, type: 'button', group: 'basic', order: 31,
            onClick: (ref) => ref.current?.executeCommand('OL')
        });

        context.registerEditorToolbarItem({
            id: 'Task', label: '任务列表', icon: CheckSquare, type: 'button', group: 'basic', order: 32,
            onClick: (ref) => ref.current?.executeCommand('TASK')
        });

        context.registerEditorToolbarItem({
            id: 'Blockquote', label: '引用', icon: Quote, type: 'button', group: 'basic', order: 33,
            onClick: (ref) => ref.current?.executeCommand('QUOTE')
        });

        // --- 3.5 注册编辑快捷键 keymap ---
        context.registerEditorKeymap(Prec.highest(keymap.of([
            { key: 'Mod-b', run: (view) => { wrapText(view, '**'); return true; } },
            { key: 'Mod-i', run: (view) => { wrapText(view, '*'); return true; } },
        ])));

        // --- 3.6 注册快捷键元数据 ---
        context.registerShortcuts([
            { id: 'undo', keys: 'Ctrl + Z', description: '撤销', group: 'edit', order: 20 },
            { id: 'redo', keys: 'Ctrl + Shift + Z', description: '重做', group: 'edit', order: 21 },
            { id: 'bold', keys: 'Ctrl + B', description: '加粗', group: 'edit', order: 22 },
            { id: 'italic', keys: 'Ctrl + I', description: '斜体', group: 'edit', order: 23 },
            { id: 'indent', keys: 'Tab', description: '缩进', group: 'edit', order: 24 },
            { id: 'unindent', keys: 'Shift + Tab', description: '取消缩进', group: 'edit', order: 25 },
        ]);

        // --- 4. 注册 Live Preview 装饰器 ---
        if (context.registerMarkdownDecorationProvider) {
            // 4.1 加粗 (StrongEmphasis)
            context.registerMarkdownDecorationProvider({
                nodeTypes: ['StrongEmphasis'],
                render: (node, { state, isRangeActive }) => {
                    const { from, to } = node;
                    const text = state.sliceDoc(from, to);
                    const markLen = text.startsWith('***') ? 3 : (text.startsWith('**') ? 2 : 0);
                    if (markLen === 0) return [];
                    const decorations = [
                        Decoration.mark({ class: 'cm-bold-text' }).range(from + markLen, to - markLen)
                    ];
                    if (!isRangeActive(from, to)) {
                        decorations.push(Decoration.mark({ class: 'cm-soft-hide' }).range(from, from + markLen));
                        decorations.push(Decoration.mark({ class: 'cm-soft-hide' }).range(to - markLen, to));
                    }
                    return decorations;
                }
            });

            // 4.2 斜体 (Emphasis)
            context.registerMarkdownDecorationProvider({
                nodeTypes: ['Emphasis'],
                render: (node, { state, isRangeActive }) => {
                    const { from, to } = node;
                    const text = state.sliceDoc(from, to);
                    const markLen = text.startsWith('*') || text.startsWith('_') ? 1 : 0;
                    if (markLen === 0) return [];
                    const decorations = [
                        Decoration.mark({ class: 'cm-italic-text' }).range(from + markLen, to - markLen)
                    ];
                    if (!isRangeActive(from, to)) {
                        decorations.push(Decoration.mark({ class: 'cm-soft-hide' }).range(from, from + markLen));
                        decorations.push(Decoration.mark({ class: 'cm-soft-hide' }).range(to - markLen, to));
                    }
                    return decorations;
                }
            });

            // 4.3 删除线 (Strikethrough)
            context.registerMarkdownDecorationProvider({
                nodeTypes: ['Strikethrough'],
                render: (node, { isRangeActive }) => {
                    const { from, to } = node;
                    const builder = [Decoration.mark({ class: 'cm-strikethrough' }).range(from, to)];
                    if (!isRangeActive(from, to)) {
                        builder.push(Decoration.mark({ class: 'cm-soft-hide' }).range(from, from + 2));
                        builder.push(Decoration.mark({ class: 'cm-soft-hide' }).range(to - 2, to));
                    }
                    return builder;
                }
            });

            // 4.4 行内代码 (InlineCode)
            context.registerMarkdownDecorationProvider({
                nodeTypes: ['InlineCode'],
                render: (node, { isRangeActive }) => {
                    const { from, to } = node;
                    if (isRangeActive(from, to)) return [];
                    return [
                        Decoration.mark({ class: 'cm-soft-hide' }).range(from, from + 1),
                        Decoration.mark({ class: 'cm-soft-hide' }).range(to - 1, to),
                        Decoration.mark({ class: 'cm-inline-code' }).range(from + 1, to - 1)
                    ];
                }
            });

            // 4.5 标题 (Heading)
            context.registerMarkdownDecorationProvider({
                nodeTypes: ['ATXHeading1', 'ATXHeading2', 'ATXHeading3', 'ATXHeading4', 'ATXHeading5', 'ATXHeading6'],
                render: (node, { state }) => {
                    const { from, name } = node;
                    const level = name.charAt(name.length - 1);
                    const line = state.doc.lineAt(from);
                    return [Decoration.line({ class: `cm-heading-line cm-heading-${level}` }).range(line.from)];
                }
            });

            context.registerMarkdownDecorationProvider({
                nodeTypes: ['HeaderMark'],
                render: (node, { isLineActive, state }) => {
                    const { from, to } = node;
                    if (!isLineActive(from)) {
                        return [Decoration.mark({ class: 'cm-soft-hide' }).range(from, Math.min(to + 1, state.doc.length))];
                    }
                    return [];
                }
            });

            // 4.6 引用 (Blockquote)
            context.registerMarkdownDecorationProvider({
                nodeTypes: ['Blockquote'],
                render: (node, { state }) => {
                    const { from, to } = node;
                    const builder: Range<Decoration>[] = [];
                    const startLine = state.doc.lineAt(from).number;
                    const endLine = state.doc.lineAt(to).number;
                    for (let n = startLine; n <= endLine; n++) {
                        const line = state.doc.line(n);
                        builder.push(Decoration.line({ class: 'cm-quote-line' }).range(line.from));
                    }
                    return builder;
                }
            });

            context.registerMarkdownDecorationProvider({
                nodeTypes: ['QuoteMark'],
                render: (node, { isRangeActive }) => {
                    const { from, to } = node;
                    if (!isRangeActive(from, to)) {
                        return [Decoration.mark({ class: 'cm-soft-hide' }).range(from, to)];
                    }
                    return [];
                }
            });

            // 4.7 分界线 (HorizontalRule)
            context.registerMarkdownDecorationProvider({
                nodeTypes: ['HorizontalRule'],
                render: (node, { isRangeActive }) => {
                    const { from, to } = node;
                    if (!isRangeActive(from, to)) {
                        return [Decoration.replace({ widget: new HRWidget() }).range(from, to)];
                    }
                    return [];
                }
            });

            // 4.8 列表标记 (ListMark, TaskMarker)
            context.registerMarkdownDecorationProvider({
                nodeTypes: ['ListMark', 'TaskMarker'],
                render: (node, { isLineActive, state }) => {
                    const { from, to, name } = node;
                    if (isLineActive(from)) return [];
                    const text = state.sliceDoc(from, to);
                    if (name === 'ListMark' && (text === '-' || text === '*' || text === '+')) {
                        return [Decoration.replace({ widget: new BulletWidget() }).range(from, to)];
                    }
                    if (name === 'TaskMarker') {
                        const isChecked = text.toLowerCase().includes('x');
                        return [Decoration.replace({ widget: new CheckboxWidget(isChecked, from) }).range(from, to)];
                    }
                    return [];
                }
            });

            // 4.9 LinkMaster
            context.registerMarkdownDecorationProvider({
                nodeTypes: ['Link', 'URL'],
                render: (node, { state, isRangeActive }) => {
                    const { from, to, name } = node;
                    const active = isRangeActive(from, to);
                    const decorations: Range<Decoration>[] = [];
                    if (name === 'URL' && (!node.node.parent || node.node.parent.name === 'Paragraph' || node.node.parent.name === 'Document')) {
                        const url = state.sliceDoc(from, to);
                        return [Decoration.mark({
                            class: 'cm-link-text',
                            attributes: { "data-url": url, "title": `点击访问: ${url}` }
                        }).range(from, to)];
                    }
                    if (name === 'Link') {
                        let url = "";
                        node.node.cursor().iterate((c: { name: string; from: number; to: number }) => {
                            if (c.name === 'URL') { url = state.sliceDoc(c.from, c.to); return false; }
                        });
                        node.node.cursor().iterate((c: { name: string; from: number; to: number }) => {
                            const cName = c.name, cFrom = c.from, cTo = c.to, cText = state.sliceDoc(cFrom, cTo);
                            const isMarkup = /Markup|Mark|[()[\]]/.test(cName) || cName === 'URL' || cName === 'LinkTitle';
                            if (isMarkup) {
                                if (!active) decorations.push(Decoration.mark({ class: 'cm-soft-hide' }).range(cFrom, cTo));
                            } else if (cName === 'LinkText' || (cFrom >= from && cTo <= to && !isMarkup && cText.trim() !== "")) {
                                decorations.push(Decoration.mark({
                                    class: 'cm-link-text',
                                    attributes: { "data-url": url, "title": url ? `Ctrl + 点击访问: ${url}` : "" }
                                }).range(cFrom, cTo));
                            }
                        });
                        return { decorations, shouldSkipChildren: true };
                    }
                    return [];
                }
            });

            // 4.10 格式化标记
            context.registerMarkdownDecorationProvider({
                nodeTypes: ['EmphasisMark', 'StrongEmphasisMark'],
                render: (node, { isRangeActive }) => {
                    const { from, to } = node;
                    if (isRangeActive(from, to)) return [];
                    return [Decoration.mark({ class: 'cm-soft-hide' }).range(from, to)];
                }
            });
        }

        // --- 5. 注册按键映射 ---
        context.registerEditorKeymap(getMarkdownKeymap());
    }
}
