/**
 * AI Capability Policy Interfaces
 *
 * 定义 AI 相关能力枚举与授权策略接口。
 * 第一阶段仅落地权限模型，不实现具体 AI 任务能力。
 */

export const AICapabilityId = {
    EDITOR_READ: 'editor.read',
    EDITOR_WRITE_ACTIVE: 'editor.write.active',
    WORKSPACE_READ_TREE: 'workspace.read.tree',
    WORKSPACE_READ_FILE: 'workspace.read.file',
    WORKSPACE_CHANGE_STAGE: 'workspace.change.stage',
    WORKSPACE_CHANGE_APPLY: 'workspace.change.apply',
    UI_ACTION_EXECUTE: 'ui.action.execute',
    AI_TASK_RUN: 'ai.task.run',
} as const;

export type AICapability = typeof AICapabilityId[keyof typeof AICapabilityId];

export interface IAICapabilityPolicyService {
    hasCapability(pluginId: string, capability: AICapability): boolean;
    assertCapability(pluginId: string, capability: AICapability): void;
    listCapabilities(pluginId: string): AICapability[];
}

