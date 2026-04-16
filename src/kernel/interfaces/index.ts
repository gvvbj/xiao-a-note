/**
 * Kernel Interfaces - 核心接口导出
 * 
 * 集中导出所有内核级接口
 * 
 * 使用方式: import { IFileSystem, ITabService } from '@/kernel/interfaces';
 */

// === File System ===
export type { IFileSystem } from './IFileSystem';

// === Tab Service ===
export type { ITabService, IEditorTab } from './ITabService';

// === Editor Service ===
export type {
    IEditorCompatibilityProbe,
    IEditorSelectionSnapshot,
    IEditorService,
    IEditorState
} from './IEditorService';

// === AI / Action Services ===
export type { IAICapabilityPolicyService, AICapability } from './IAICapabilityPolicyService';
export { AICapabilityId } from './IAICapabilityPolicyService';
export type {
    IEditorActionService,
    IEditorDocumentSelection,
    IEditorDocumentSnapshot,
    IEditorTextEdit,
    IEditorTextRange,
} from './IEditorActionService';
export type {
    IWorkspaceActionService,
    IWorkspaceChange,
    IWorkspaceChangePlan,
    IWorkspaceFileRef,
} from './IWorkspaceActionService';
export type {
    IUIActionDefinition,
    IUIActionExecuteResult,
    IUIActionService,
} from './IUIActionService';
export type {
    IAIContextRequest,
    IAIContextService,
    IAIContextSnapshot,
} from './IAIContextService';
export type {
    IAITaskError,
    IAITaskEvent,
    IAITaskRequest,
    IAITaskService,
    AITaskStatus,
} from './IAITaskService';

// === Settings Service ===
export type { ISettingsService } from './ISettingsService';

// === Window Service ===
export type { IWindowService } from './IWindowService';

// === Markdown Service ===
export type { IMarkdownService } from './IMarkdownService';
export type {
    IEditorEngine,
    IEditorEngineSnapshot,
    IEditorEngineSelection,
    EditorEngineDecoration,
    EditorEngineExtension,
    EditorEngineRange,
    EditorEngineState,
    EditorEngineSyntaxNode,
    EditorEngineView,
} from './IEditorEngine';

// === Plugin API (Facade) ===
export type {
    IPluginAPI,
    IUIRegistrationOptions,
    ICommandRegistrationOptions,
    IMenuRegistrationOptions
} from './IPluginAPI';
