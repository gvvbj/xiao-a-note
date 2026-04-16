import React from 'react';
import { Table } from 'lucide-react';
import { IPlugin, PluginCategory, IPluginContext } from '@/kernel/system/plugin/types';
import { CoreEvents } from '@/kernel/core/Events';

/**
 * 表格插件 (Core)
 * 职责：
 * 1. 注入表格 CSS 样式（解决无边框问题）
 * 2. 提供“插入表格”工具栏按钮
 * 3. (可选) 注册 markdown-it 表格解析插件
 */
export default class TablePlugin implements IPlugin {
    id = 'core-table-features';
    name = 'Table Support';
    version = '1.0.0';
    category = PluginCategory.CORE; // 隐式核心插件
    internal = true;
    readonly order = 30;

    activate(context: IPluginContext) {
        // 1. 注册 Markdown 样式 (修复丑陋的表格)
        context.registerMarkdownUsage({
            id: 'markdown-table-style',
            apply: (md) => {
                // 如果需要动态加载 markdown-it-plugin，可以在这里做
                // 例如: await import('markdown-it-multimd-table')
                // 目前主要修复样式
            },
            getCss: () => `
/* 表格基础样式 */
.markdown-body table {
    border-collapse: collapse;
    width: 100%;
    margin: 1em 0;
    overflow: auto;
    display: block; /* 响应式滚动 */
}

.markdown-body table th,
.markdown-body table td {
    padding: 8px 12px;
    border: 1px solid var(--border-color, #d0d7de);
}

.markdown-body table th {
    background-color: var(--bg-secondary, #f6f8fa);
    font-weight: 600;
}

.markdown-body table tr:nth-child(2n) {
    background-color: var(--bg-tertiary, #ffffff);
}
            `
        });

        // 2. 注册工具栏按钮 (Disabled: Duplicate of editor/plugins/TablePlugin)
        /*
        context.registerEditorToolbarItem({
            id: 'insert-table',
            label: '插入表格',
            icon: Table,
            type: 'button',
            group: 'insert',
            order: 50,
            onClick: () => {
                // 插入一个标准 Markdown 表格模板
                const tableTemplate = `
| 列 1 | 列 2 | 列 3 |
| :--- | :---: | ---: |
| 文本 | 文本 | 文本 |
| 文本 | 文本 | 文本 |
`;
                context.kernel.emit(CoreEvents.EDITOR_INSERT_TEXT, tableTemplate);
            }
        });
        */
    }
}
