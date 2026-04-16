import React from 'react';
import { Smile } from 'lucide-react';
import { IPlugin, PluginCategory, IPluginContext } from '@/kernel/system/plugin/types';
import { EmojiButton } from './components/EmojiButton';

/**
 * 表情选择插件
 * 彻底从核心层解耦
 */
export default class EmojiPlugin implements IPlugin {
    id = 'emoji-support';
    name = 'Emoji Support';
    version = '1.0.0';
    category = PluginCategory.EDITOR;
    internal = true;
    order = 21;

    // 支持懒加载
    lazy = true;
    activationTrigger = { type: 'manual' as const }; // 由工具栏触发激活

    staticToolbarItems = [{
        id: 'insert-emoji',
        label: '插入表情',
        icon: Smile,
        type: 'custom' as const,
        group: 'insert' as const,
        order: 21
    }];

    activate(context: IPluginContext) {
        context.registerEditorToolbarItem({
            id: 'insert-emoji',
            label: '插入表情',
            icon: Smile,
            type: 'custom',
            group: 'insert',
            order: 21,
            render: () => React.createElement(EmojiButton, { kernel: context.kernel })
        });
    }
}
