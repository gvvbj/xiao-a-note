/**
 * 测试范围：HistoryService 历史隔离实现
 * 测试类型：单元 / 回归
 * 测试目的：验证切换文件时会真正清空 CodeMirror 历史栈，避免撤销/重做串到下一份文档
 * 防回归问题：文件 A 的编辑历史在切换到文件 B 后仍可通过撤销/重做作用到文件 B
 * 关键不变量：
 * - 真实文件切换时必须清空 undo/redo 栈
 * - 切换后的程序同步事务不能重新污染历史栈
 * - 空路径切换不应误清历史
 * 边界说明：
 * - 只覆盖 Codemirror 历史插件实现
 * - 不覆盖 Toolbar / 快捷键 UI 层
 * 依赖与限制：
 * - 依赖真实 EditorView 与 jsdom 环境
 */

import { afterEach, describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { undo, undoDepth, redoDepth } from '@codemirror/commands';

import { Kernel } from '@/kernel/core/Kernel';
import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import { EditorExtensionRegistry } from '@/kernel/registries/EditorExtensionRegistry';
import { PROGRAMMATIC_TRANSACTION_SOURCES } from '@/modules/built-in/editor/constants/ProgrammaticTransactionSources';
import { createInternalSyncTransaction } from '@/modules/built-in/editor/utils/InternalSyncTransaction';

import { HistoryService } from '../HistoryService';

const mountedViews: EditorView[] = [];

function createHistoryHarness() {
    const kernel = new Kernel();
    const extensionRegistry = new EditorExtensionRegistry();
    kernel.registerService(ServiceId.EDITOR_EXTENSION_REGISTRY, extensionRegistry, true);

    const service = new HistoryService(kernel);
    service.start();

    const parent = document.createElement('div');
    document.body.appendChild(parent);

    const view = new EditorView({
        state: EditorState.create({
            doc: 'alpha',
            extensions: extensionRegistry.getExtensions(),
        }),
        parent,
    });

    mountedViews.push(view);
    kernel.emit(CoreEvents.MAIN_VIEW_READY, view);

    return { kernel, view, service };
}

afterEach(() => {
    while (mountedViews.length > 0) {
        const view = mountedViews.pop();
        view?.destroy();
        view?.dom.parentElement?.remove();
    }
});

describe('HistoryService', () => {
    it('切换文件时应真正清空 undo/redo 历史，避免撤销串到新文档', () => {
        const { kernel, view } = createHistoryHarness();

        view.dispatch({
            changes: { from: view.state.doc.length, to: view.state.doc.length, insert: '-draft' },
        });
        expect(view.state.doc.toString()).toBe('alpha-draft');
        expect(undoDepth(view.state)).toBe(1);

        kernel.emit(CoreEvents.LIFECYCLE_SWITCHING_START, {
            prevPath: 'C:/workspace/a.md',
            nextPath: 'C:/workspace/b.md',
        });

        expect(undoDepth(view.state)).toBe(0);
        expect(redoDepth(view.state)).toBe(0);

        view.dispatch(createInternalSyncTransaction(
            {
                changes: { from: 0, to: view.state.doc.length, insert: 'bravo' },
            },
            { source: PROGRAMMATIC_TRANSACTION_SOURCES.SYNC_PROTOCOL },
        ));

        expect(view.state.doc.toString()).toBe('bravo');
        expect(undoDepth(view.state)).toBe(0);
        expect(undo(view)).toBe(false);
        expect(view.state.doc.toString()).toBe('bravo');
    });

    it('关闭所有文件时不应误清空当前历史栈', () => {
        const { kernel, view } = createHistoryHarness();

        view.dispatch({
            changes: { from: view.state.doc.length, to: view.state.doc.length, insert: '-draft' },
        });
        expect(undoDepth(view.state)).toBe(1);

        kernel.emit(CoreEvents.LIFECYCLE_SWITCHING_START, {
            prevPath: 'C:/workspace/a.md',
            nextPath: null,
        });

        expect(undoDepth(view.state)).toBe(1);
    });
});
