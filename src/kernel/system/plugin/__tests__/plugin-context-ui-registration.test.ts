/**
 * 测试范围：PluginContext / RestrictedPluginContext 的 UI 规范接入辅助方法
 * 测试类型：集成 / 回归
 * 测试目的：守护 Phase 4 新增的正式 UI 接入方法，避免扩展插件继续依赖字符串插槽 ID
 * 防回归问题：编辑器头部右侧与模态层注册误入错误插槽、扩展 UI 未被标记为受限组件、卸载时残留注册项
 * 关键不变量：
 * - registerEditorHeaderRightItem 必须注册到 EDITOR_HEADER_RIGHT
 * - registerEditorModal 必须注册到 EDITOR_MODALS
 * - RestrictedPluginContext 注册的 UI 组件必须带 isExtension 标记
 * 边界说明：
 * - 不覆盖 UISlot 的实际渲染逻辑
 * - 不覆盖 Kernel UI_UPDATED 事件的 React 响应链
 * 依赖与限制（如有）：
 * - 使用最小化 Kernel / Registry 实例，不依赖真实编辑器环境
 */
import React from 'react';
import { describe, expect, it } from 'vitest';

import { UISlotId } from '@/kernel/core/Constants';
import { Kernel } from '@/kernel/core/Kernel';
import { EditorExtensionRegistry } from '@/kernel/registries/EditorExtensionRegistry';
import { MarkdownDecorationRegistry } from '@/kernel/registries/MarkdownDecorationRegistry';
import { PluginContext } from '@/kernel/system/plugin/PluginContext';
import { RestrictedPluginContext } from '@/kernel/system/plugin/RestrictedPluginContext';

const DummyComponent: React.FC = () => null;

function createRegistries() {
    return {
        editorRegistry: new EditorExtensionRegistry(),
        decorationRegistry: new MarkdownDecorationRegistry(),
    };
}

describe('PluginContext UI registration helpers', () => {
    it('内置插件上下文应将头部右侧和模态层项目注册到标准插槽', () => {
        const kernel = new Kernel();
        const { editorRegistry, decorationRegistry } = createRegistries();
        const context = new PluginContext(kernel, 'built-in-test', editorRegistry, decorationRegistry);

        context.registerEditorHeaderRightItem('header-right-item', DummyComponent, { from: 'header-right' }, 41);
        context.registerEditorModal('editor-modal-item', DummyComponent, { from: 'modal' }, 101);

        expect(kernel.getUI(UISlotId.EDITOR_HEADER_RIGHT)).toEqual([
            expect.objectContaining({
                id: 'header-right-item',
                component: DummyComponent,
                props: { from: 'header-right' },
                order: 41,
            }),
        ]);
        expect(kernel.getUI(UISlotId.EDITOR_MODALS)).toEqual([
            expect.objectContaining({
                id: 'editor-modal-item',
                component: DummyComponent,
                props: { from: 'modal' },
                order: 101,
            }),
        ]);
    });

    it('受限插件上下文应注册到标准插槽并附加 isExtension 标记', () => {
        const kernel = new Kernel();
        const { editorRegistry, decorationRegistry } = createRegistries();
        const context = new RestrictedPluginContext(kernel, 'extension-test', editorRegistry, decorationRegistry);

        context.registerEditorHeaderRightItem('ext-header-right-item', DummyComponent, undefined, 40);
        context.registerEditorModal('ext-modal-item', DummyComponent, undefined, 100);

        expect(kernel.getUI(UISlotId.EDITOR_HEADER_RIGHT)).toEqual([
            expect.objectContaining({
                id: 'ext-header-right-item',
                component: DummyComponent,
                order: 40,
                isExtension: true,
            }),
        ]);
        expect(kernel.getUI(UISlotId.EDITOR_MODALS)).toEqual([
            expect.objectContaining({
                id: 'ext-modal-item',
                component: DummyComponent,
                order: 100,
                isExtension: true,
            }),
        ]);
    });

    it('新辅助方法返回的卸载函数应只移除自身注册项', () => {
        const kernel = new Kernel();
        const { editorRegistry, decorationRegistry } = createRegistries();
        const builtInContext = new PluginContext(kernel, 'built-in-test', editorRegistry, decorationRegistry);
        const restrictedContext = new RestrictedPluginContext(kernel, 'extension-test', editorRegistry, decorationRegistry);

        const disposeHeader = builtInContext.registerEditorHeaderRightItem('built-in-header-right', DummyComponent, undefined, 30);
        restrictedContext.registerEditorHeaderRightItem('extension-header-right', DummyComponent, undefined, 40);

        disposeHeader();

        expect(kernel.getUI(UISlotId.EDITOR_HEADER_RIGHT)).toEqual([
            expect.objectContaining({
                id: 'extension-header-right',
                order: 40,
                isExtension: true,
            }),
        ]);
    });
});
