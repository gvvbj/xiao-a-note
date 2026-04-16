import { IPlugin, PluginCategory, IPluginContext } from '@/kernel/system/plugin/types';
import { ToolbarStateService } from './services/ToolbarStateService';

/**
 * ToolbarStatePlugin
 * 
 * 职责：
 * 监听编辑器光标位置变化，解析当前行的 Markdown 语法，
 * 驱动工具栏按钮根据语法上下文自动高亮。
 * 
 * 架构：
 * - ToolbarStateService 负责 CodeMirror 扩展注册和 AST 解析
 * - 通过 EditorEvents.TOOLBAR_STATE_CHANGED 事件与 NoteEditor 解耦
 */
export default class ToolbarStatePlugin implements IPlugin {
    id = 'toolbar-state';
    readonly name = 'Toolbar State Sync';
    readonly category = PluginCategory.CORE;
    readonly internal = true;
    readonly order = 16;
    readonly description = 'Synchronizes toolbar button active states with cursor Markdown context.';
    version = '1.0.0';
    readonly essential = true;

    private service: ToolbarStateService | null = null;

    activate(context: IPluginContext) {
        this.service = new ToolbarStateService(context.kernel);
        this.service.start();
    }

    deactivate() {
        this.service?.dispose();
        this.service = null;
    }
}
