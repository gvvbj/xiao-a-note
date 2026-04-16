/**
 * 测试范围：编辑器引擎能力模型（toolbar/command schema）与 CodeMirror 适配器能力导出
 * 测试类型：单元/回归
 * 测试目的：确保 D7 能力模型定义稳定，避免后续 D8 渲染阶段出现能力误判
 * 防回归问题：D7（引擎能力模型定义）
 * 关键不变量：
 * - CodeMirror 引擎必须提供与 engineId 对齐的能力模型
 * - 工具栏项与命令支持判定函数结果稳定可复现
 * 边界说明：
 * - 不覆盖 UI 层显示/禁用策略（D8 范围）
 * - 不覆盖多引擎切换编排（D6 范围）
 * 依赖与限制（如有）：
 * - 仅验证纯模型与适配器导出，不依赖 DOM
 */

import { describe, expect, it } from 'vitest';
import { CodeMirrorEngineAdapter } from '../../codemirror/CodeMirrorEngineAdapter';
import {
    CODEMIRROR_ENGINE_CAPABILITY_SCHEMA,
    EditorCommandCapability,
    EditorToolbarCapability,
    isCommandCapabilitySupported,
    isToolbarCapabilitySupported,
} from '../EngineCapabilitySchema';

describe('EngineCapabilitySchema', () => {
    it('CodeMirrorEngineAdapter 应导出与 codemirror 对齐的能力模型', () => {
        const adapter = new CodeMirrorEngineAdapter();
        const schema = adapter.getCapabilities();

        expect(schema.engineId).toBe('codemirror');
        expect(schema).toEqual(CODEMIRROR_ENGINE_CAPABILITY_SCHEMA);
    });

    it('工具栏能力判定应正确识别支持与不支持项', () => {
        const schema = CODEMIRROR_ENGINE_CAPABILITY_SCHEMA;

        expect(isToolbarCapabilitySupported(schema, EditorToolbarCapability.STRONG_EMPHASIS)).toBe(true);
        expect(isToolbarCapabilitySupported(schema, EditorToolbarCapability.INSERT_MATH)).toBe(true);
        expect(isToolbarCapabilitySupported(schema, 'UnknownToolbarItem')).toBe(false);
    });

    it('命令能力判定应正确识别支持与不支持项', () => {
        const schema = CODEMIRROR_ENGINE_CAPABILITY_SCHEMA;

        expect(isCommandCapabilitySupported(schema, EditorCommandCapability.BOLD)).toBe(true);
        expect(isCommandCapabilitySupported(schema, EditorCommandCapability.SEARCH_TOGGLE)).toBe(true);
        expect(isCommandCapabilitySupported(schema, 'UNKNOWN_COMMAND')).toBe(false);
    });
});
