import { describe, expect, it } from 'vitest';
import {
    buildDocumentEditContractPrompt,
    parseDocumentEditContract,
} from '../ai/AIDocumentEditContract';

describe('AIDocumentEditContract', () => {
    it('构造编辑契约提示词时包含 report 和 documentArtifact 约束', () => {
        const prompt = buildDocumentEditContractPrompt('append-document');

        expect(prompt).toContain('documentArtifact');
        expect(prompt).toContain('report');
        expect(prompt).toContain('append');
    });

    it('解析合法的结构化单文档编辑工件', () => {
        const contract = parseDocumentEditContract(JSON.stringify({
            assistantMessage: '已在当前标题下追加一段内容。',
            report: '本次在标题块下追加了一段说明。',
            documentArtifact: {
                target: {
                    type: 'heading',
                    headingText: '概览',
                    headingLevel: 2,
                },
                operation: 'insert-after',
                content: '追加内容',
                summary: '在标题块后追加一段内容',
                confidence: 'medium',
            },
        }));

        expect(contract).toMatchObject({
            assistantMessage: '已在当前标题下追加一段内容。',
            report: '本次在标题块下追加了一段说明。',
            documentArtifact: {
                target: {
                    type: 'heading',
                    headingText: '概览',
                    headingLevel: 2,
                },
                operation: 'insert-after',
                content: '追加内容',
                summary: '在标题块后追加一段内容',
                confidence: 'medium',
            },
        });
    });

    it('遇到非法结构时返回 null', () => {
        const contract = parseDocumentEditContract(JSON.stringify({
            assistantMessage: '以下是修改内容',
            documentArtifact: {
                content: 'hello',
            },
        }));

        expect(contract).toBeNull();
    });
});
