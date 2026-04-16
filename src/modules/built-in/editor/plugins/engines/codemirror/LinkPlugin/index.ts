import { EditorView } from '@codemirror/view';
import { IPlugin, PluginCategory, IPluginContext } from '@/kernel/system/plugin/types';
import { CoreEvents } from '@/kernel/core/Events';
import { UISlotId } from '@/kernel/core/Constants';
import { Link as LinkIcon } from 'lucide-react';
import { LINK_CSS } from './styles/LinkStyles';
import { handleLinkCommand } from './services/LinkCommands';
import { LinkModalContainer } from './components/LinkModalContainer';

/**
 * 链接插件
 * 职责：
 * 1. 提供链接插入命令
 * 2. 提供工具栏按钮
 * 3. 注册链接输入弹窗（通过 TRIGGER_LINK_MODAL 事件驱动）
 * 
 * 注意：本文件仅负责注册，逻辑在 services/LinkCommands.ts
 */
export default class LinkPlugin implements IPlugin {
    id = 'link-support';
    name = 'Link Support';
    version = '1.0.0';
    category = PluginCategory.EDITOR;
    internal = true;
    order = 51;

    activate(context: IPluginContext) {
        // 1. 注册样式
        context.registerStyle('link', LINK_CSS);

        // 2. 工具栏按钮
        context.registerEditorToolbarItem({
            id: 'Link',
            label: '链接',
            icon: LinkIcon,
            type: 'button',
            group: 'insert',
            order: 51,
            onClick: () => {
                context.kernel.emit(CoreEvents.TRIGGER_LINK_MODAL);
            }
        });

        // 3. 注册链接输入弹窗（监听 TRIGGER_LINK_MODAL）
        context.registerUI(UISlotId.EDITOR_MODALS, {
            id: 'link-input-dialog',
            component: LinkModalContainer
        });

        // 4. 注册 LINK 命令 (逻辑已抽离到 services/)
        context.registerCommand({
            id: 'LINK',
            title: '插入链接',
            category: '编辑器',
            handler: (view: EditorView, params: any) => handleLinkCommand(view, params)
        });
    }
}
