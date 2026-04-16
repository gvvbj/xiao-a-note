/**
 * EditorRefreshBridgePlugin - 编辑器刷新桥接插件
 *
 * 职责：监听 CoreEvents.EDITOR_REQUEST_REFRESH 事件，
 * 将事件总线消息转换为 CodeMirror forceRefreshEffect 调度。
 *
 * 设计意图：
 *   - 扩展插件（如 HTML Preview）无法直接 import built-in 模块的 forceRefreshEffect
 *   - 本插件作为桥梁，让任何插件都能通过事件总线触发编辑器装饰重算
 *   - 遵循零核心修改原则：不修改任何核心文件
 *
 * 使用方式：
 *   扩展插件只需 context.kernel.emit(CoreEvents.EDITOR_REQUEST_REFRESH) 即可
 */

import { IPlugin, IPluginContext } from '@/kernel/system/plugin/types';
import { CoreEvents } from '@/kernel/core/Events';
import { EditorView } from '@codemirror/view';
import { forceRefreshEffect } from '../../../../cm-extensions/livePreview';

export default class EditorRefreshBridgePlugin implements IPlugin {
    id = 'editor-refresh-bridge';
    name = 'Editor Refresh Bridge';
    version = '1.0.0';
    description = 'Bridges kernel events to CodeMirror refresh effects.';
    internal = true;

    activate(context: IPluginContext) {
        let editorView: EditorView | null = null;

        // 1. 捕获 EditorView 引用
        context.registerEditorExtension(
            EditorView.updateListener.of((update) => {
                editorView = update.view;
            })
        );

        // 2. 监听内核事件 → dispatch forceRefreshEffect
        context.kernel.on(CoreEvents.EDITOR_REQUEST_REFRESH, () => {
            if (editorView) {
                editorView.dispatch({
                    effects: forceRefreshEffect.of(null)
                });
            }
        });

        context.logger.info('Activated. Event-to-effect bridge ready.');
    }

    deactivate() { }
}
