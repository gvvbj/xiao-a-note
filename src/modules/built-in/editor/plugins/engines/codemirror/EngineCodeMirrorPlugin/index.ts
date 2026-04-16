import { ServiceId } from '@/kernel/core/ServiceId';
import { IPlugin, IPluginContext, PluginCategory } from '@/kernel/system/plugin/types';
import { CodeMirrorEngineAdapter } from '../../../../engines/codemirror/CodeMirrorEngineAdapter';
import { ENGINE_CONFLICT_GROUP } from '../../../../engines/core/EnginePluginConstants';

export default class EngineCodeMirrorPlugin implements IPlugin {
    id = 'engine-codemirror';
    name = 'CodeMirror Engine';
    version = '1.0.0';
    category = PluginCategory.EDITOR;
    internal = true;
    essential = true;
    hidden = true;
    order = 5;
    conflictGroup = ENGINE_CONFLICT_GROUP;

    private readonly engine = new CodeMirrorEngineAdapter();

    getRuntimeModules(): Record<string, unknown> {
        return this.engine.getRuntimeModules();
    }

    activate(context: IPluginContext): void {
        context.registerService(ServiceId.EDITOR_ENGINE, this.engine);
    }
}
