import { describe, expect, it } from 'vitest';
import { buildRemoteMessages, summarizeEditorContext } from '../ai/AIMessagePromptPolicy';

describe('AIMessagePromptPolicy', () => {
    it('为编辑模式构造带结构化契约的模型消息', () => {
        const messages = buildRemoteMessages('edit', {
            prompt: '请在当前文档末尾增加一行 hello',
            requestMode: 'document-edit',
            documentEditModeHint: 'append-document',
            contextVisibility: 'implicit',
            systemPrompt: '你是文档编辑助手',
            history: [
                { role: 'user', content: '先看当前文档' },
                { role: 'assistant', content: '已读取当前文档。' },
            ],
            context: {
                editor: {
                    content: '# 标题',
                    selection: null,
                },
            },
        });

        expect(messages[0]).toEqual({
            role: 'system',
            content: '你是文档编辑助手',
        });
        expect(messages[1]?.content).toBe('先看当前文档');
        expect(messages[2]?.content).toBe('已读取当前文档。');
        expect(messages[3]?.content).toContain('当前模式：document-edit');
        expect(messages[3]?.content).toContain('documentArtifact');
        expect(messages[3]?.content).toContain('report');
    });

    it('为工作区提案模式拼接结构化 proposal 契约', () => {
        const messages = buildRemoteMessages('workspace-change', {
            prompt: '请为这个插件新建一个 service 文件',
            requestMode: 'workspace-change',
            contextVisibility: 'implicit',
            context: {
                workspaceRoot: '/workspace',
                fileTree: [{ path: '/workspace/src', isDirectory: true }],
            },
        });

        expect(messages[messages.length - 1]?.content).toContain('workspaceProposal');
        expect(messages[messages.length - 1]?.content).toContain('changes');
        expect(messages[messages.length - 1]?.content).toContain('create|update|delete|rename');
    });

    it('explicit 上下文下允许显式引用当前文档摘要', () => {
        const summary = summarizeEditorContext({
            contextVisibility: 'explicit',
            context: {
                editor: {
                    content: '# 当前标题\n正文',
                },
            },
        });

        expect(summary).toContain('文档开头');
    });

    it('clarify 模式只要求提出澄清问题', () => {
        const messages = buildRemoteMessages('chat', {
            prompt: '更新到文档里面',
            requestMode: 'clarify',
            contextVisibility: 'implicit',
            context: {
                editor: {
                    content: '# note',
                    selection: null,
                },
            },
        });

        expect(messages[messages.length - 1]?.content).toContain('当前模式：clarify');
        expect(messages[messages.length - 1]?.content).not.toContain('已经写入文件');
    });
});
