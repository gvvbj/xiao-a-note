import React from 'react';
import { IPlugin, IPluginContext, PluginCategory } from '@/kernel/system/plugin/types';
import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import { EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';

import { KanbanController } from './services/KanbanController';
import { KanbanToggleButton } from './components/KanbanToggleButton';
import { KanbanView } from './components/KanbanView';
import { KANBAN_STYLES } from './templates/kanbanStyles';

interface IEditorProbeService {
    getState?: () => {
        currentContent?: string;
        currentFileId?: string | null;
    };
    getCurrentContent?: () => string;
    getEditorView?: () => { state?: { doc?: { toString: () => string } } } | null;
}

interface IContentInputPayload {
    path: string | null;
    newContent: string;
    initialContent?: string;
    isInternal?: boolean;
}

/**
 * 看板视图插件入口
 *
 * 第三方扩展插件（使用 RestrictedPluginContext）
 * 将包含 `type: kanban` frontmatter 的 Markdown 文档渲染为可交互的看板视图。
 *
 * 职责：仅负责注册，业务逻辑位于 KanbanController。
 */
export default class KanbanPlugin implements IPlugin {
    id = 'kanban-plugin';
    name = '看板视图';
    version = '1.0.0';
    category = PluginCategory.EDITOR;
    description = '将 Markdown 内容渲染为可交互的看板视图';
    internal = false;

    private controller: KanbanController | null = null;
    private cleanups: Array<() => void> = [];

    activate(context: IPluginContext) {
        this.controller = new KanbanController(context);
        const controller = this.controller;

        context.registerStyle('kanban-plugin-styles', KANBAN_STYLES);
        context.registerEditorHeaderRightItem('kanban-toggle', () => <KanbanToggleButton controller={controller} />, undefined, 40);
        context.registerEditorModal('kanban-view', () => <KanbanView controller={controller} />, undefined, 100);

        // 捕获当前主编辑器视图，退出看板时需要将序列化后的内容回写到 CodeMirror。
        const editorViewPlugin = ViewPlugin.fromClass(class {
            constructor(view: EditorView) {
                controller.setEditorView(view);
                try {
                    const editorService = context.getService<IEditorProbeService>(ServiceId.EDITOR);
                    const currentFileId = editorService?.getState?.().currentFileId;
                    const initialContent = view.state.doc.toString();
                    if (initialContent.trim().length > 0) {
                        controller.handleContentChange(initialContent, currentFileId ?? undefined);
                    }
                } catch {
                    // 服务尚未就绪时忽略，后续事件会补齐。
                }
            }

            update(update: ViewUpdate) {
                controller.setEditorView(update.view);
            }

            destroy() {
                controller.setEditorView(null);
            }
        });

        const editorViewCapture = EditorView.updateListener.of((update: ViewUpdate) => {
            controller.setEditorView(update.view);
        });
        context.registerEditorExtension([editorViewPlugin, editorViewCapture]);

        this.cleanups.push(context.on(CoreEvents.DOCUMENT_CHANGED, (payload: { content?: string; path?: string | null }) => {
            if (payload?.content !== undefined) {
                controller.handleContentChange(payload.content, payload.path ?? undefined);
            }
        }));

        this.cleanups.push(context.on(CoreEvents.LIFECYCLE_FILE_LOADED, (payload: { content?: string; path?: string | null }) => {
            if (payload?.content !== undefined) {
                controller.handleContentChange(payload.content, payload.path ?? undefined, true);
            }
        }));

        this.cleanups.push(context.on(CoreEvents.EDITOR_CONTENT_INPUT, (payload: IContentInputPayload) => {
            if (!controller.getState().isActive) {
                controller.handleContentChange(payload?.newContent ?? '', payload?.path ?? undefined);
            }
        }));

        // 主编辑器切换为“卸载旧输入 -> 重挂载新输入”后，外部插件不能只依赖内容事件。
        // 这里补一层主视图重挂载后的主动探测，保证切回 kanban 标签时自动恢复看板视图。
        const reprobeCurrentDocument = () => {
            this.scheduleProbeCurrentContent(context, controller);
        };
        this.cleanups.push(context.on(CoreEvents.MAIN_VIEW_READY, reprobeCurrentDocument));
        this.cleanups.push(context.on(CoreEvents.SPLIT_VIEW_CHANGED, reprobeCurrentDocument));
        this.cleanups.push(context.on(CoreEvents.SPLIT_VIEW_TAB, reprobeCurrentDocument));
        this.cleanups.push(context.on(CoreEvents.CLOSE_SPLIT_VIEW, reprobeCurrentDocument));

        this.cleanups.push(context.on(CoreEvents.APP_CMD_SAVE, () => {
            controller.save();
        }));

        this.probeCurrentContent(context, controller);

        context.logger.info('看板视图插件已激活 (v1.0.0)');
    }

    deactivate() {
        this.cleanups.forEach((fn) => fn());
        this.cleanups = [];
        this.controller?.dispose();
        this.controller = null;
    }

    /**
     * 主动探测当前已打开文档的内容。
     * 外部插件加载时机晚于内置插件，首次 DOCUMENT_CHANGED 可能已错过。
     */
    private probeCurrentContent(context: IPluginContext, controller: KanbanController) {
        try {
            const editorService = context.getService<IEditorProbeService>(ServiceId.EDITOR);
            const state = editorService?.getState?.();
            const content =
                editorService?.getEditorView?.()?.state?.doc?.toString() ||
                editorService?.getCurrentContent?.() ||
                state?.currentContent;
            const fileId = state?.currentFileId;

            if (content && fileId) {
                controller.handleContentChange(content, fileId);
            }
        } catch {
            // 服务未就绪时静默忽略，后续事件会补齐状态。
        }
    }

    private scheduleProbeCurrentContent(context: IPluginContext, controller: KanbanController) {
        const run = () => this.probeCurrentContent(context, controller);

        if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
            window.requestAnimationFrame(() => run());
            return;
        }

        setTimeout(run, 0);
    }
}
