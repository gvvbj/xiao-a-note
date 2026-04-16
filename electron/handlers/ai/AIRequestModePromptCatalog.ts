import type {
    AIAssistantContextVisibility,
    AIAssistantDocumentEditMode,
    AIAssistantRequestMode,
} from './AIRequestContractTypes';

function buildContextVisibilityInstruction(contextVisibility: AIAssistantContextVisibility): string {
    if (contextVisibility === 'explicit') {
        return '上下文表达规则：用户已经明确要求你基于当前文档进行总结、分析或引用，你可以显式引用必要内容，但不要无关复述。';
    }

    return '上下文表达规则：你可以利用当前文档或选区帮助理解请求，但除非用户明确要求总结、分析或引用当前文档，否则不要主动复述文档原文、标题或片段。';
}

function buildDocumentEditModeInstruction(documentEditModeHint: AIAssistantDocumentEditMode | undefined): string {
    if (documentEditModeHint === 'replace-selection') {
        return '编辑目标提示：当前应替换或删除选区内容，documentArtifact.target.type 优先使用 selection，operation 优先使用 replace 或 delete。';
    }

    if (documentEditModeHint === 'insert-cursor') {
        return '编辑目标提示：当前应在光标处插入内容，documentArtifact.target.type 优先使用 cursor，operation 优先使用 insert-after。';
    }

    return '编辑目标提示：当前应向当前文档追加内容，documentArtifact.target.type 优先使用 document-end，operation 优先使用 append。';
}

export function buildRequestModeInstruction(
    requestMode: AIAssistantRequestMode,
    contextVisibility: AIAssistantContextVisibility,
    documentEditModeHint?: AIAssistantDocumentEditMode
): string {
    const contextInstruction = buildContextVisibilityInstruction(contextVisibility);

    if (requestMode === 'document-edit') {
        return [
            '当前模式：document-edit。',
            '你现在不是在普通聊天，而是在为编辑器生成可直接应用的结构化文档工件。',
            '不要解释、不要给操作建议、不要输出 Markdown 代码块、不要声明自己不能操作本地文件。',
            buildDocumentEditModeInstruction(documentEditModeHint),
            contextInstruction,
        ].join('\n');
    }

    if (requestMode === 'workspace-change') {
        return [
            '当前模式：workspace-change。',
            '你可以分析工作区，但不要假装已经创建或修改文件。',
            '请只返回结构化工作区提案，不要输出自然语言段落代替变更列表，不要输出“已写入文件”这类执行性表达。',
            contextInstruction,
        ].join('\n');
    }

    if (requestMode === 'clarify') {
        return [
            '当前模式：clarify。',
            '信息不足，请只提出一个简洁澄清问题，帮助用户明确要修改的目标、位置或内容。',
            '不要直接生成文档内容，不要展开长篇解释，不要默认复述当前文档。',
            contextInstruction,
        ].join('\n');
    }

    return [
        '当前模式：chat。',
        '请正常回答用户问题或给出建议，但默认不要把当前文档内容直接复述出来。',
        contextInstruction,
    ].join('\n');
}
