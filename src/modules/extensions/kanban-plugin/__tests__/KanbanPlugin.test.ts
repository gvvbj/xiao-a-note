/**
 * 测试范围：看板插件与编辑器事件链路
 * 测试类型：集成 / 回归
 * 测试目的：验证看板插件对 EDITOR_CONTENT_INPUT 的识别、首开探测、
 * 主视图重挂载后的回切恢复，以及退出视图时的程序事务回写。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Transaction } from '@codemirror/state';

import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import {
    InternalSyncAnnotation,
    ProgrammaticTransactionSourceAnnotation,
} from '@/modules/built-in/editor/constants/Annotations';
import { PROGRAMMATIC_TRANSACTION_SOURCES } from '@/modules/built-in/editor/constants/ProgrammaticTransactionSources';
import type { IPluginContext } from '@/kernel/system/plugin/types';
import type { KanbanController } from '../services/KanbanController';

const codemirrorViewMock = vi.hoisted(() => ({
    viewPluginClass: null as (new (view: {
        state: { doc: { toString: () => string; length?: number } };
        dispatch?: (...args: any[]) => void;
        focus?: () => void;
    }) => unknown) | null,
}));

vi.mock('@codemirror/view', () => ({
    ViewPlugin: {
        fromClass: (klass: new (view: {
            state: { doc: { toString: () => string; length?: number } };
            dispatch?: (...args: any[]) => void;
            focus?: () => void;
        }) => unknown) => {
            codemirrorViewMock.viewPluginClass = klass;
            return { kind: 'view-plugin', klass };
        },
    },
    EditorView: {
        updateListener: {
            of: (fn: (update: { view: unknown }) => void) => ({ kind: 'update-listener', fn }),
        },
    },
}));

import KanbanPlugin from '../index';

function createMockContext() {
    const handlers = new Map<string, (...args: any[]) => void>();
    const registerEditorExtension = vi.fn();
    const registerStyle = vi.fn();
    const registerUI = vi.fn();
    const emit = vi.fn();
    const logger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    };

    let editorState = {
        currentFileId: 'kanban.md',
        currentContent: undefined as string | undefined,
        editorViewContent: undefined as string | undefined,
    };

    const editorService = {
        getState: vi.fn(() => editorState),
        getEditorView: vi.fn(() => editorState.currentContent ? {
            state: {
                doc: {
                    toString: () => editorState.editorViewContent ?? editorState.currentContent ?? '',
                },
            },
        } : null),
    };

    const context = {
        registerStyle,
        registerUI,
        registerEditorHeaderItem: vi.fn(),
        registerEditorHeaderRightItem: vi.fn(),
        registerEditorToolbarItem: vi.fn(),
        registerEditorModal: vi.fn(),
        registerEditorExtension,
        emit,
        on: vi.fn((event: string, handler: (...args: any[]) => void) => {
            handlers.set(event, handler);
            return () => handlers.delete(event);
        }),
        getService: vi.fn((id: string) => {
            if (id === ServiceId.EDITOR) {
                return editorService;
            }

            return undefined;
        }),
        logger,
    } as unknown as IPluginContext;

    return {
        context,
        emit,
        handlers,
        editorService,
        registerEditorExtension,
        setEditorState: (nextState: Partial<typeof editorState>) => {
            editorState = { ...editorState, ...nextState };
        },
    };
}

describe('KanbanPlugin', () => {
    beforeEach(() => {
        codemirrorViewMock.viewPluginClass = null;
    });

    it('应从 EDITOR_CONTENT_INPUT 的 newContent 识别看板文件', () => {
        const { context, handlers } = createMockContext();
        const plugin = new KanbanPlugin();

        plugin.activate(context);

        const onInput = handlers.get(CoreEvents.EDITOR_CONTENT_INPUT);
        expect(onInput).toBeTruthy();

        onInput?.({
            path: 'kanban.md',
            newContent: '---\ntype: kanban\n---\n# Board',
            initialContent: '',
        });

        const controller = Reflect.get(plugin, 'controller') as KanbanController;
        expect(controller.getState().isKanbanFile).toBe(true);
    });

    it('应在扩展挂载时用当前 EditorView 内容完成首开探测', () => {
        const { context, registerEditorExtension } = createMockContext();
        const plugin = new KanbanPlugin();

        plugin.activate(context);

        expect(registerEditorExtension).toHaveBeenCalledTimes(1);
        expect(codemirrorViewMock.viewPluginClass).toBeTruthy();

        const view = {
            state: {
                doc: {
                    toString: () => '---\ntype: kanban\n---\n# Board',
                },
            },
        };

        const PluginClass = codemirrorViewMock.viewPluginClass!;
        new PluginClass(view);

        const controller = Reflect.get(plugin, 'controller') as KanbanController;
        expect(controller.getState().isKanbanFile).toBe(true);
    });

    it('应在切回 kanban 标签且主视图重挂载后自动恢复看板视图', () => {
        const raf = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
            cb(0);
            return 0;
        });

        const { context, handlers, setEditorState } = createMockContext();
        const plugin = new KanbanPlugin();
        plugin.activate(context);

        const controller = Reflect.get(plugin, 'controller') as KanbanController;
        const kanbanContent = '---\ntype: kanban\n---\n# Board';
        const plainContent = '# Plain';

        handlers.get(CoreEvents.DOCUMENT_CHANGED)?.({
            path: 'plain.md',
            content: plainContent,
        });
        expect(controller.getState().isActive).toBe(false);

        handlers.get(CoreEvents.DOCUMENT_CHANGED)?.({
            path: 'kanban.md',
            content: '',
        });
        expect(controller.getState().isActive).toBe(false);

        setEditorState({
            currentFileId: 'kanban.md',
            currentContent: kanbanContent,
        });

        handlers.get(CoreEvents.MAIN_VIEW_READY)?.({});

        expect(controller.getState().isKanbanFile).toBe(true);
        expect(controller.getState().isActive).toBe(true);

        raf.mockRestore();
    });

    it('应在 kanban 标签之间切换时忽略瞬时空内容，避免视图闪回源码', () => {
        const { context, handlers } = createMockContext();
        const plugin = new KanbanPlugin();
        plugin.activate(context);

        const controller = Reflect.get(plugin, 'controller') as KanbanController;
        const kanbanA = '---\ntype: kanban\n---\n# Board A';
        const kanbanB = '---\ntype: kanban\n---\n# Board B';

        handlers.get(CoreEvents.DOCUMENT_CHANGED)?.({
            path: 'kanban-a.md',
            content: kanbanA,
        });
        expect(controller.getState().isActive).toBe(true);

        handlers.get(CoreEvents.DOCUMENT_CHANGED)?.({
            path: 'kanban-b.md',
            content: '',
        });
        expect(controller.getState().isActive).toBe(true);

        handlers.get(CoreEvents.LIFECYCLE_FILE_LOADED)?.({
            path: 'kanban-b.md',
            content: kanbanB,
        });

        expect(controller.getState().isActive).toBe(true);
        expect(controller.getState().data?.boards[0]?.title).toBe('Board B');
    });

    it('应在 kanban 标签之间切换时忽略瞬时空内容，避免视图闪回源码', () => {
        const { context, handlers } = createMockContext();
        const plugin = new KanbanPlugin();
        plugin.activate(context);

        const controller = Reflect.get(plugin, 'controller') as KanbanController;
        const kanbanA = '---\ntype: kanban\n---\n# Board A';
        const kanbanB = '---\ntype: kanban\n---\n# Board B';

        handlers.get(CoreEvents.DOCUMENT_CHANGED)?.({
            path: 'kanban-a.md',
            content: kanbanA,
        });
        expect(controller.getState().isActive).toBe(true);

        handlers.get(CoreEvents.DOCUMENT_CHANGED)?.({
            path: 'kanban-b.md',
            content: '',
        });
        expect(controller.getState().isActive).toBe(true);

        handlers.get(CoreEvents.DOCUMENT_CHANGED)?.({
            path: 'kanban-b.md',
            content: kanbanB,
        });

        expect(controller.getState().isActive).toBe(true);
        expect(controller.getState().data?.boards[0]?.title).toBe('Board B');
    });

    it('应在退出看板时以内同步事务回写内容，避免污染撤销栈', () => {
        const raf = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
            cb(0);
            return 0;
        });

        const { context } = createMockContext();
        const plugin = new KanbanPlugin();
        plugin.activate(context);

        const content = '---\ntype: kanban\n---\n# Board';
        const dispatch = vi.fn();
        const focus = vi.fn();
        const view = {
            dispatch,
            focus,
            state: {
                doc: {
                    toString: () => content,
                    length: content.length,
                },
            },
        };

        const PluginClass = codemirrorViewMock.viewPluginClass!;
        new PluginClass(view);

        const controller = Reflect.get(plugin, 'controller') as KanbanController;
        controller.toggleView();
        controller.toggleView();

        const payload = dispatch.mock.calls.at(-1)?.[0];
        expect(payload.annotations).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ type: InternalSyncAnnotation, value: true }),
                expect.objectContaining({
                    type: ProgrammaticTransactionSourceAnnotation,
                    value: PROGRAMMATIC_TRANSACTION_SOURCES.KANBAN_DEACTIVATE_VIEW,
                }),
                expect.objectContaining({ type: Transaction.addToHistory, value: false }),
            ]),
        );

        raf.mockRestore();
    });

    it('authoritative load should auto-activate kanban view', () => {
        const { context, handlers } = createMockContext();
        const plugin = new KanbanPlugin();
        plugin.activate(context);

        const controller = Reflect.get(plugin, 'controller') as KanbanController;

        handlers.get(CoreEvents.DOCUMENT_CHANGED)?.({
            path: 'kanban.md',
            content: '',
        });
        expect(controller.getState().isActive).toBe(false);

        handlers.get(CoreEvents.LIFECYCLE_FILE_LOADED)?.({
            path: 'kanban.md',
            content: '---\ntype: kanban\n---\n# Board',
        });

        expect(controller.getState().isKanbanFile).toBe(true);
        expect(controller.getState().isActive).toBe(true);
        expect(controller.getState().data?.boards[0]?.title).toBe('Board');
    });

    it('应在重探测时优先使用当前 EditorView 内容，避免旧状态内容压掉 kanban 激活', () => {
        const raf = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
            cb(0);
            return 0;
        });

        const { context, handlers, setEditorState } = createMockContext();
        const plugin = new KanbanPlugin();
        plugin.activate(context);

        const controller = Reflect.get(plugin, 'controller') as KanbanController;

        setEditorState({
            currentFileId: 'kanban.md',
            currentContent: '# stale plain content',
            editorViewContent: '---\ntype: kanban\n---\n# Board',
        });

        handlers.get(CoreEvents.MAIN_VIEW_READY)?.({});

        expect(controller.getState().isKanbanFile).toBe(true);
        expect(controller.getState().isActive).toBe(true);
        expect(controller.getState().data?.boards[0]?.title).toBe('Board');

        raf.mockRestore();
    });
    it('should ignore empty view init after kanban is already active', () => {
        const { context, handlers } = createMockContext();
        const plugin = new KanbanPlugin();
        plugin.activate(context);

        const controller = Reflect.get(plugin, 'controller') as KanbanController;
        handlers.get(CoreEvents.LIFECYCLE_FILE_LOADED)?.({
            path: 'kanban.md',
            content: '---\ntype: kanban\n---\n# Board',
        });
        expect(controller.getState().isActive).toBe(true);

        const PluginClass = codemirrorViewMock.viewPluginClass!;
        new PluginClass({
            state: {
                doc: {
                    toString: () => '',
                },
            },
        });

        expect(controller.getState().isKanbanFile).toBe(true);
        expect(controller.getState().isActive).toBe(true);
        expect(controller.getState().data?.boards[0]?.title).toBe('Board');
    });

    it('应在切到 untitled 标签时把当前看板内容同步回原路径缓存链', () => {
        const { context, handlers, emit } = createMockContext();
        const plugin = new KanbanPlugin();
        plugin.activate(context);

        handlers.get(CoreEvents.LIFECYCLE_FILE_LOADED)?.({
            path: 'kanban.md',
            content: '---\ntype: kanban\n---\n# Board',
        });

        handlers.get(CoreEvents.LIFECYCLE_FILE_LOADED)?.({
            path: 'untitled-1',
            content: '',
        });

        expect(emit).toHaveBeenCalledWith(
            CoreEvents.DOCUMENT_CHANGED,
            expect.objectContaining({
                path: 'kanban.md',
                isInitial: true,
            }),
        );
    });
});
