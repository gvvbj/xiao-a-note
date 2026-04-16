import { describe, expect, it } from 'vitest';
import {
    buildWorkspaceProposalContractPrompt,
    parseWorkspaceProposalContract,
} from '../ai/AIWorkspaceProposalContract';

describe('AIWorkspaceProposalContract', () => {
    it('构造工作区提案契约提示词时包含 changes 结构约束', () => {
        const prompt = buildWorkspaceProposalContractPrompt();

        expect(prompt).toContain('workspaceProposal');
        expect(prompt).toContain('changes');
        expect(prompt).toContain('create|update|delete|rename');
    });

    it('解析合法的结构化工作区提案', () => {
        const contract = parseWorkspaceProposalContract(JSON.stringify({
            assistantMessage: '已生成 2 项工作区提案。',
            report: '当前仅生成提案，未直接落盘。',
            workspaceProposal: {
                summary: '为插件新增服务文件并更新导出',
                changes: [
                    {
                        kind: 'create',
                        path: 'src/services/PluginService.ts',
                        content: 'export class PluginService {}',
                        summary: '新增服务文件骨架',
                        risk: 'medium',
                    },
                    {
                        kind: 'update',
                        path: 'src/index.ts',
                        summary: '更新导出入口',
                        risk: 'low',
                    },
                ],
            },
        }));

        expect(contract).toMatchObject({
            assistantMessage: '已生成 2 项工作区提案。',
            report: '当前仅生成提案，未直接落盘。',
            workspaceProposal: {
                summary: '为插件新增服务文件并更新导出',
                changes: [
                    expect.objectContaining({
                        kind: 'create',
                        path: 'src/services/PluginService.ts',
                        risk: 'medium',
                    }),
                    expect.objectContaining({
                        kind: 'update',
                        path: 'src/index.ts',
                        risk: 'low',
                    }),
                ],
            },
        });
    });

    it('非法提案不进入结构化结果', () => {
        const contract = parseWorkspaceProposalContract(JSON.stringify({
            assistantMessage: '建议新建文件',
            workspaceProposal: {
                summary: '只有摘要',
                changes: [],
            },
        }));

        expect(contract).toBeNull();
    });
});
