/**
 * Module Interfaces - 模块间协作契约
 * 
 * 集中导出所有模块级接口
 * 
 * 消费者：所有需要调用跨插件服务的模块
 * 规则：严禁直接 import 插件目录下的 Service Class，只能使用这里的 Interface
 */

// === Lifecycle ===
export type {
    ILifecycleService,
    ILifecycleState,
    IFileLoadedPayload,
    ILifecycleSwitchFailedPayload,
} from './ILifecycleService';

// === Persistence ===
export type { IPersistenceService } from './IPersistenceService';
export type {
    IFileChangeClassificationService,
    IFileWatchChangeClassification,
    IRawFileWatchChange,
} from './IFileChangeClassificationService';
export { FILE_CHANGE_CLASSIFICATION_SERVICE_ID } from './IFileChangeClassificationService';
export type {
    ExternalOverwriteDialogKind,
    IExternalOverwriteGuardService,
    IExternalOverwriteState,
} from './IExternalOverwriteGuardService';
export { EXTERNAL_OVERWRITE_GUARD_SERVICE_ID } from './IExternalOverwriteGuardService';

// === Note Service ===
export type { INoteService, IReplacement, ISaveResult } from './INoteService';

// === Editor Facets (跨模块协作常量) ===
export { markdownServiceFacet } from './EditorFacets';

// === Split Preview Host（split-view <-> editor 契约） ===
export type { ISplitPreviewHost, ISplitPreviewEditorProps } from './ISplitPreviewHost';
export { SPLIT_PREVIEW_HOST_SERVICE_ID } from './ISplitPreviewHost';
