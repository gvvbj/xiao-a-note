/**
 * 测试范围：EditorActionService 当前文档语义动作层
 * 测试类型：单元 / 回归
 * 测试目的：守护 AI 编辑器正式动作接口的读写语义，确保不再依赖 DOM 或直接暴露底层视图对象。
 * 防回归问题：当前文档快照缺失、批量文本编辑位置错乱、无活动编辑器时静默失败、撤销重做未走统一命令入口。
 * 关键不变量：
 * - getActiveSnapshot() 始终以 EditorService 状态 + 当前活动编辑器内容为准
 * - applyTextEdits() 基于同一快照坐标按降序应用，避免位移串扰
 * - 无活动编辑器时读操作返回空快照，写操作抛出明确错误
 * - undo/redo/focus 走统一编辑器引用能力
 * 边界说明：
 * - 不覆盖真实 CodeMirror 事务实现
 * - 不覆盖未来其他编辑器引擎适配
 * 依赖与限制（如有）：
 * - 使用轻量 IEditorRef stub 验证语义层，不依赖真实 UI 组件挂载
 */

import { describe, expect, it } from 'vitest';
import { Kernel } from '@/kernel/core/Kernel';
import { ServiceId } from '@/kernel/core/ServiceId';
import { EditorService } from '@/kernel/services/EditorService';
import type { IEditorTextEdit } from '@/kernel/interfaces';
import type { IEditorRef, IEditorSelectionTarget } from '../../framework/types';
import { EditorActionService } from '../EditorActionService';

class EditorRefStub implements IEditorRef {
    view = undefined;
    private commandCalls: string[] = [];
    private focusCount = 0;

    constructor(
        private content: string,
        private selection: { from: number; to: number } = { from: 0, to: 0 },
    ) {}

    getContent(): string {
        return this.content;
    }

    setContent(content: string): void {
        this.content = content;
    }

    getScrollState() {
        return { cursorPosition: this.selection.to, scrollTop: 0, topLineNumber: 1, topOffset: 0 };
    }

    resetState(content: string): void {
        this.content = content;
        this.selection = { from: 0, to: 0 };
    }

    executeCommand(cmd: string): void {
        this.commandCalls.push(cmd);
    }

    getActiveStates(): Record<string, boolean> {
        return {};
    }

    getSelection() {
        const { from, to } = this.selection;
        return {
            from,
            to,
            text: this.content.slice(from, to),
        };
    }

    applyTextEdits(edits: IEditorTextEdit[], selection?: IEditorSelectionTarget): void {
        let nextContent = this.content;
        const normalizedEdits = edits
            .slice()
            .sort((left, right) => {
                if (left.range.from !== right.range.from) {
                    return right.range.from - left.range.from;
                }

                return right.range.to - left.range.to;
            });

        for (const edit of normalizedEdits) {
            nextContent =
                nextContent.slice(0, edit.range.from) +
                edit.text +
                nextContent.slice(edit.range.to);
        }

        this.content = nextContent;

        if (selection) {
            const head = selection.head ?? selection.anchor;
            this.selection = { from: selection.anchor, to: head };
            return;
        }

        this.selection = { from: 0, to: 0 };
    }

    focus(): void {
        this.focusCount += 1;
    }

    getExecutedCommands(): string[] {
        return this.commandCalls;
    }

    getFocusCount(): number {
        return this.focusCount;
    }
}

function setup(initialContent: string = '# hello world', selection = { from: 2, to: 7 }) {
    const kernel = new Kernel();
    const editorService = new EditorService();
    kernel.registerService(ServiceId.EDITOR, editorService, true);
    editorService.setCurrentFile('docs/ai.md');
    editorService.setUnsaved(true);
    editorService.setViewMode('source');

    const actionService = new EditorActionService(kernel);
    const editorRef = new EditorRefStub(initialContent, selection);
    const dispose = actionService.registerEditorRefProvider(() => editorRef);

    return { actionService, editorRef, editorService, dispose };
}

describe('EditorActionService', () => {
    it('应返回当前活动文档快照并包含选区语义信息', () => {
        const { actionService } = setup();

        expect(actionService.getActiveSnapshot()).toEqual({
            filePath: 'docs/ai.md',
            content: '# hello world',
            isDirty: true,
            viewMode: 'source',
            selection: {
                from: 2,
                to: 7,
                text: 'hello',
            },
        });
    });

    it('应按同一快照坐标降序应用批量文本编辑，避免位移串扰', () => {
        const { actionService, editorRef } = setup('abcdef', { from: 0, to: 0 });

        actionService.applyTextEdits([
            { range: { from: 4, to: 6 }, text: 'Z' },
            { range: { from: 1, to: 3 }, text: 'XY' },
        ]);

        expect(editorRef.getContent()).toBe('aXYdZ');
    });

    it('应通过语义动作完成替换、插入和删除，而不是依赖底层 view 暴露', () => {
        const { actionService, editorRef } = setup('hello world', { from: 0, to: 5 });

        actionService.replaceSelection('hi');
        actionService.insertText('!', 'selectionEnd');
        actionService.deleteRange({ from: 3, to: 7 });

        expect(editorRef.getContent()).toBe('hi!ld');
        expect(actionService.getSelection()).toEqual({
            from: 3,
            to: 3,
            text: '',
        });
    });

    it('无活动编辑器时应返回空快照，并在写操作时抛出明确错误', () => {
        const kernel = new Kernel();
        const editorService = new EditorService();
        kernel.registerService(ServiceId.EDITOR, editorService, true);
        editorService.setCurrentFile('docs/empty.md');
        editorService.setViewMode('preview');

        const actionService = new EditorActionService(kernel);

        expect(actionService.getActiveSnapshot()).toEqual({
            filePath: 'docs/empty.md',
            content: '',
            isDirty: false,
            viewMode: 'preview',
            selection: null,
        });
        expect(() => actionService.insertText('x')).toThrow(/No active editor session/);
    });

    it('应通过统一命令入口执行 focus、undo 和 redo', () => {
        const { actionService, editorRef } = setup();

        actionService.focus();
        actionService.undo();
        actionService.redo();

        expect(editorRef.getFocusCount()).toBe(1);
        expect(editorRef.getExecutedCommands()).toEqual(['UNDO', 'REDO']);
    });
});
