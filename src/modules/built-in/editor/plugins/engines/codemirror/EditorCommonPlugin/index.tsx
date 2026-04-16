import React from 'react';
import { Undo, Redo } from 'lucide-react';
import { IPlugin, IPluginContext } from '@/kernel/system/plugin/types';
import { IEditorRef } from '../../../../framework/types';
import { undo, redo } from '@codemirror/commands';
import { getCoreExtensions } from './services/CoreExtensions';

/**
 * 通用编辑器功能插件
 * 提供撤销、重做功能，以及核心语言支持和 CodeMirror 基础扩展
 * 
 * 注意：本文件仅负责注册，扩展配置在 services/CoreExtensions.ts
 */
export default class EditorCommonPlugin implements IPlugin {
    id = 'editor-common';
    name = 'Editor Common Features';
    version = '1.1.0';
    internal = true;
    readonly essential = true;

    activate(context: IPluginContext) {
        // 1. 历史记录按钮
        context.registerEditorToolbarItem({
            id: 'UNDO', label: '撤销', icon: Undo, type: 'button', group: 'history', order: 100,
            onClick: (ref: React.MutableRefObject<IEditorRef | null>) => {
                const view = ref.current?.view;
                if (view) undo(view);
            }
        });

        context.registerEditorToolbarItem({
            id: 'REDO', label: '重做', icon: Redo, type: 'button', group: 'history', order: 101,
            onClick: (ref: React.MutableRefObject<IEditorRef | null>) => {
                const view = ref.current?.view;
                if (view) redo(view);
            }
        });

        // 2. 注册核心 CodeMirror 扩展 (配置已抽离到 services/)
        const coreExtensions = getCoreExtensions();
        coreExtensions.forEach(ext => context.registerEditorExtension(ext));

        // 3. 基础命令 (常规操作)
        context.registerCommand({ id: 'UNDO', title: '撤销', category: '常规', handler: (view) => undo(view) });
        context.registerCommand({ id: 'REDO', title: '重做', category: '常规', handler: (view) => redo(view) });
    }
}
