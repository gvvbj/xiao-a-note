import type { IEditorEngine } from '@/kernel/interfaces/IEditorEngine';
import * as cmState from '@codemirror/state';
import * as cmView from '@codemirror/view';
import * as cmLanguage from '@codemirror/language';
import { CODEMIRROR_ENGINE_CAPABILITY_SCHEMA, IEditorEngineCapabilitySchema } from '../core/EngineCapabilitySchema';

/**
 * CodeMirrorEngineAdapter
 *
 * 当前阶段仅承载引擎标识与运行时模块导出。
 * 更完整的切换能力在阶段 B 后续任务中扩展。
 */
export class CodeMirrorEngineAdapter implements IEditorEngine {
    id = 'codemirror';
    name = 'CodeMirror 6';
    version = '6.x';

    getRuntimeModules(): Record<string, unknown> {
        return {
            '@codemirror/state': cmState,
            '@codemirror/view': cmView,
            '@codemirror/language': cmLanguage,
        };
    }

    getCapabilities(): IEditorEngineCapabilitySchema {
        return CODEMIRROR_ENGINE_CAPABILITY_SCHEMA;
    }
}
