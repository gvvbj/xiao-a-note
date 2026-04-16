/**
 * 测试范围：D8 工具栏能力门控辅助逻辑（schema 解析、受管项判定、不支持项收集）
 * 测试类型：单元/回归
 * 测试目的：确保能力驱动工具栏渲染的基础判定稳定，避免显示/禁用策略误判
 * 防回归问题：D8（能力驱动工具栏渲染）
 * 关键不变量：
 * - 受管工具栏项按 schema 判定支持性
 * - 非受管项默认放行，避免误伤第三方扩展项
 * - 不支持项收集仅包含“受管且不支持”的项
 * 边界说明：
 * - 不覆盖 React UI 渲染细节
 * - 不覆盖引擎切换事务行为（D6 范围）
 * 依赖与限制（如有）：
 * - 使用最小 IUIComponent 结构模拟输入
 */

import { describe, expect, it } from 'vitest';
import type React from 'react';
import type { IUIComponent } from '@/kernel/core/Kernel';
import {
    collectUnsupportedToolbarItems,
    isManagedToolbarCapabilityItem,
    isToolbarItemSupported,
    resolveEngineCapabilitySchema,
} from '../EngineToolbarCapabilityGate';
import {
    CODEMIRROR_ENGINE_CAPABILITY_SCHEMA,
    EditorToolbarCapability,
    IEditorEngineCapabilitySchema,
} from '../EngineCapabilitySchema';

describe('EngineToolbarCapabilityGate', () => {
    it('resolveEngineCapabilitySchema: codemirror 应回退到内置基线 schema', () => {
        const schema = resolveEngineCapabilitySchema('codemirror', null);
        expect(schema).toEqual(CODEMIRROR_ENGINE_CAPABILITY_SCHEMA);
    });

    it('isManagedToolbarCapabilityItem: 能正确区分受管与非受管项', () => {
        expect(isManagedToolbarCapabilityItem(EditorToolbarCapability.STRONG_EMPHASIS)).toBe(true);
        expect(isManagedToolbarCapabilityItem('third-party-custom-item')).toBe(false);
    });

    it('isToolbarItemSupported: 非受管项默认支持，受管项按 schema 判定', () => {
        const minimalSchema: IEditorEngineCapabilitySchema = {
            engineId: 'prosemirror',
            toolbar: { supported: [EditorToolbarCapability.LINK] },
            commands: { supported: [] },
        };

        expect(isToolbarItemSupported({ id: 'third-party-custom-item' }, minimalSchema)).toBe(true);
        expect(isToolbarItemSupported({ id: EditorToolbarCapability.LINK }, minimalSchema)).toBe(true);
        expect(isToolbarItemSupported({ id: EditorToolbarCapability.STRONG_EMPHASIS }, minimalSchema)).toBe(false);
    });

    it('collectUnsupportedToolbarItems: 仅收集受管且不支持项', () => {
        const schema: IEditorEngineCapabilitySchema = {
            engineId: 'prosemirror',
            toolbar: { supported: [EditorToolbarCapability.LINK] },
            commands: { supported: [] },
        };

        const items: IUIComponent[] = [
            { id: EditorToolbarCapability.STRONG_EMPHASIS, component: (() => null) as React.ComponentType<any> },
            { id: EditorToolbarCapability.LINK, component: (() => null) as React.ComponentType<any> },
            { id: 'third-party-custom-item', component: (() => null) as React.ComponentType<any> },
        ];

        const unsupported = collectUnsupportedToolbarItems(items, schema);
        expect(unsupported.map(item => item.id)).toEqual([EditorToolbarCapability.STRONG_EMPHASIS]);
    });
});
