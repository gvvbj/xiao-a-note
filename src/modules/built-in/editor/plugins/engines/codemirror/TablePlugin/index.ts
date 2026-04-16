import { IPlugin, PluginCategory, IPluginContext } from '@/kernel/system/plugin/types';
import { Decoration, EditorView } from '@codemirror/view';
import { TableWidget, parseMarkdownTable } from './core/TableWidget';
import { findTableEndPosition } from '../../../../utils/tableUtils';
import { Table2 } from 'lucide-react';
import { TABLE_CSS } from './styles/TableStyles';
import { tableController } from './services/TableController';

/**
 * 表格插件
 * 
 * 重构后的纯 wiring 入口
 * 
 * 职责：
 * 1. 注册表格样式
 * 2. 提供插入表格命令
 * 3. 提供 Live Preview 装饰器
 * 
 * 遵循原则:
 * - Plugin-First: 业务逻辑在 TableController
 * - 0 硬编码: Widget 逻辑在 core/TableWidget
 */
export default class TablePlugin implements IPlugin {
    id = 'table-support';
    name = 'Table Support';
    version = '1.1.0';
    category = PluginCategory.EDITOR;
    internal = true;
    order = 12;

    // 懒加载配置
    lazy = true;
    activationTrigger = {
        type: 'syntax' as const,
        pattern: /\|/  // 匹配 Markdown 表格标志
    };

    // 自动休眠超时 (15分钟)
    hibernationTimeout = 900000;

    // 静态 UI 定义
    staticToolbarItems = [{
        id: 'Table',
        label: '表格',
        icon: Table2,
        type: 'button' as const,
        group: 'insert' as const,
        order: 50,
        onClick: (ref: any) => {
            const view = ref.current?.view;
            if (view) tableController.insertTable(view);
        }
    }];

    activate(context: IPluginContext) {
        // 1. 注册样式
        context.registerStyle('table', TABLE_CSS);

        // 此处不再重复注册工具栏（逻辑已移至静态定义）


        // 3. 表格命令 (调用 Controller)
        context.registerCommand({
            id: 'TABLE',
            title: '插入表格',
            category: '编辑器',
            handler: (view: EditorView) => tableController.insertTable(view)
        });

        // 4. 装饰器
        context.registerMarkdownDecorationProvider({
            nodeTypes: ['Table'],
            render: (node, { state }) => {
                const { from, to } = node;
                const text = state.sliceDoc(from, to);
                const tableData = parseMarkdownTable(text, from);
                if (tableData) {
                    const end = findTableEndPosition(state, from);
                    const startLine = state.doc.lineAt(from);
                    const endLineNode = state.doc.lineAt(end);
                    const replaceEnd = endLineNode.to < state.doc.length ? endLineNode.to + 1 : state.doc.length;

                    return {
                        decorations: [Decoration.replace({
                            widget: new TableWidget(tableData, text),
                            block: true,
                        }).range(startLine.from, replaceEnd)],
                        shouldSkipChildren: true
                    };
                }
                return { decorations: [] };
            }
        });
    }
}
