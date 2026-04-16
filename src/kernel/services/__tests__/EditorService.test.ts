/**
 * 测试范围：EditorService 兼容态只读探针
 * 测试类型：单元 / 回归
 * 测试目的：守护 EditorService 与沙箱 editor 白名单之间的契约收口，不再依赖漂浮方法。
 * 防回归问题：受限插件读取当前内容、底层 view、选区时得到空实现或不一致返回。
 * 关键不变量：
 * - EditorService 可通过 compatibility probe 返回当前内容
 * - getState() 会带出兼容态 currentContent
 * - probe 释放后只读能力回退为空值
 * 边界说明：
 * - 不覆盖真正的编辑器事务写入
 * - 不覆盖 Phase 2 的正式 IEditorActionService
 * 依赖与限制（如有）：
 * - 使用轻量 probe stub，不依赖真实 CodeMirror 实例
 */

import { describe, expect, it } from 'vitest';
import { EditorService } from '@/kernel/services/EditorService';

describe('EditorService compatibility probe', () => {
    it('应通过 compatibility probe 暴露当前内容、视图和选区', () => {
        const service = new EditorService();
        const view = { id: 'view-1' };

        service.setCurrentFile('docs/test.md');

        const dispose = service.registerCompatibilityProbe({
            getCurrentContent: () => '# hello',
            getEditorView: () => view,
            getSelection: () => ({
                from: 2,
                to: 7,
                text: 'hello',
            }),
        });

        expect(service.getCurrentContent()).toBe('# hello');
        expect(service.getEditorView()).toBe(view);
        expect(service.getSelection()).toEqual({
            from: 2,
            to: 7,
            text: 'hello',
        });
        expect(service.getState()).toMatchObject({
            currentFileId: 'docs/test.md',
            currentContent: '# hello',
        });

        dispose();

        expect(service.getCurrentContent()).toBe('');
        expect(service.getEditorView()).toBeNull();
        expect(service.getSelection()).toBeNull();
        expect(service.getState().currentContent).toBe('');
    });
});

