import { describe, expect, it } from 'vitest';
import { mapAITaskResult, resolveDocumentEditMode } from '../ai/AITaskResultMapper';

describe('AITaskResultMapper', () => {
    it('根据 documentEditModeHint 优先判定编辑模式', () => {
        const mode = resolveDocumentEditMode({
            documentEditModeHint: 'append-document',
            context: {
                editor: {
                    selection: {
                        from: 10,
                        to: 20,
                    },
                },
            },
        });

        expect(mode).toBe('append-document');
    });

    it('在 edit 模式解析结构化单文档编辑工件', () => {
        const result = mapAITaskResult(
            'edit',
            {
                documentEditModeHint: 'insert-cursor',
            },
            JSON.stringify({
                assistantMessage: '已在当前光标处插入内容。',
                report: '本次在当前光标位置追加了一行 hello。',
                documentArtifact: {
                    target: {
                        type: 'cursor',
                    },
                    operation: 'insert-after',
                    content: 'hello',
                    summary: '在当前光标处插入一行 hello',
                    confidence: 'high',
                },
            }),
            '先分析上下文',
        );

        expect(result).toMatchObject({
            content: '已在当前光标处插入内容。',
            reasoning: '先分析上下文',
            report: '本次在当前光标位置追加了一行 hello。',
            documentEdit: {
                target: {
                    type: 'cursor',
                },
                operation: 'insert-after',
                content: 'hello',
                summary: '在当前光标处插入一行 hello',
                confidence: 'high',
            },
        });
    });

    it('编辑结果不符合结构化契约时不生成 documentEdit', () => {
        const result = mapAITaskResult(
            'edit',
            {},
            '以下是修改内容：hello',
        );

        expect(result).toMatchObject({
            content: '未能生成可直接应用的结构化文档修改结果，请更具体说明要修改的位置或内容。',
        });
        expect(result).not.toHaveProperty('documentEdit');
    });

    it('在 workspace-change 模式解析结构化工作区提案', () => {
        const result = mapAITaskResult(
            'workspace-change',
            {},
            JSON.stringify({
                assistantMessage: '已生成一个工作区提案。',
                report: '本次提案包含 1 个新建文件操作。',
                workspaceProposal: {
                    summary: '为当前插件新增一个 service 文件',
                    changes: [{
                        kind: 'create',
                        path: 'src/services/PluginService.ts',
                        content: 'export class PluginService {}',
                        summary: '新增 PluginService 基础骨架',
                        risk: 'medium',
                    }],
                },
            }),
        );

        expect(result).toMatchObject({
            content: '已生成一个工作区提案。',
            report: '本次提案包含 1 个新建文件操作。',
            workspaceProposal: {
                summary: '为当前插件新增一个 service 文件',
                changes: [{
                    kind: 'create',
                    path: 'src/services/PluginService.ts',
                    summary: '新增 PluginService 基础骨架',
                    risk: 'medium',
                }],
            },
        });
    });
});
