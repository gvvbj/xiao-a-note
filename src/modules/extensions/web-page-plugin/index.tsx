import React from 'react';
import { EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import { IPlugin, IPluginContext, PluginCategory } from '@/kernel/system/plugin/types';
import { WEB_PAGE_STYLES } from './constants/WebPageConstants';
import { WebPageToggleButton } from './components/WebPageToggleButton';
import { WebPageView } from './components/WebPageView';
import { WebPageController } from './services/WebPageController';

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
}

export default class WebPagePlugin implements IPlugin {
    id = 'web-page-plugin';
    name = '页面文档视图';
    version = '1.0.0';
    category = PluginCategory.EDITOR;
    description = '为 type: web-page 文档提供源码/页面双视图渲染能力。';
    internal = false;

    private controller: WebPageController | null = null;
    private cleanups: Array<() => void> = [];

    activate(context: IPluginContext) {
        this.controller = new WebPageController(context);
        const controller = this.controller;

        context.registerStyle('web-page-plugin-styles', WEB_PAGE_STYLES);

        context.registerEditorHeaderRightItem('web-page-toggle', () => <WebPageToggleButton controller={controller} />, undefined, 41);

        context.registerEditorModal('web-page-view', () => <WebPageView controller={controller} />, undefined, 101);

        const editorViewPlugin = ViewPlugin.fromClass(class {
            constructor(view: EditorView) {
                controller.setEditorView(view);
                try {
                    const editorService = context.getService<IEditorProbeService>(ServiceId.EDITOR);
                    const currentFileId = editorService?.getState?.().currentFileId;
                    controller.handleContentChange(view.state.doc.toString(), currentFileId ?? undefined);
                } catch {
                    // 静默忽略：后续事件会补齐
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
                controller.handleContentChange(payload.content, payload.path ?? undefined);
            }
        }));

        this.cleanups.push(context.on(CoreEvents.EDITOR_CONTENT_INPUT, (payload: IContentInputPayload) => {
            controller.handleContentChange(payload?.newContent ?? '', payload?.path ?? undefined);
        }));

        this.cleanups.push(context.on(CoreEvents.MAIN_VIEW_READY, () => {
            this.scheduleProbeCurrentContent(context, controller);
        }));

        this.cleanups.push(context.on(CoreEvents.SPLIT_VIEW_CHANGED, () => {
            this.scheduleProbeCurrentContent(context, controller);
        }));

        this.cleanups.push(context.on(CoreEvents.SPLIT_VIEW_TAB, () => {
            this.scheduleProbeCurrentContent(context, controller);
        }));

        this.cleanups.push(context.on(CoreEvents.CLOSE_SPLIT_VIEW, () => {
            this.scheduleProbeCurrentContent(context, controller);
        }));

        this.probeCurrentContent(context, controller);

        context.logger.info('页面文档视图插件已激活 (v1.0.0)');
    }

    deactivate() {
        this.cleanups.forEach((fn) => fn());
        this.cleanups = [];
        this.controller?.dispose();
        this.controller = null;
    }

    private probeCurrentContent(context: IPluginContext, controller: WebPageController) {
        try {
            const editorService = context.getService<IEditorProbeService>(ServiceId.EDITOR);
            const state = editorService?.getState?.();
            const content =
                state?.currentContent ||
                editorService?.getCurrentContent?.() ||
                editorService?.getEditorView?.()?.state?.doc?.toString();
            const fileId = state?.currentFileId;

            if (content && fileId) {
                controller.handleContentChange(content, fileId);
            }
        } catch {
            // 静默忽略：后续事件会补齐
        }
    }

    private scheduleProbeCurrentContent(context: IPluginContext, controller: WebPageController) {
        const run = () => this.probeCurrentContent(context, controller);

        if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
            window.requestAnimationFrame(() => run());
            return;
        }

        setTimeout(run, 0);
    }
}
