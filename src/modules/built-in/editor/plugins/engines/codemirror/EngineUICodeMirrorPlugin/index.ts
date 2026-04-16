import { IPlugin, IPluginContext, PluginCategory } from '@/kernel/system/plugin/types';
import { ENGINE_UI_CONFLICT_GROUP } from '../../../../engines/core/EnginePluginConstants';

export default class EngineUICodeMirrorPlugin implements IPlugin {
    id = 'engine-ui-codemirror';
    name = 'CodeMirror Engine UI';
    version = '1.0.0';
    category = PluginCategory.UI;
    internal = true;
    hidden = true;
    lazy = true;
    order = 125;
    conflictGroup = ENGINE_UI_CONFLICT_GROUP;
    supportedEngines = ['codemirror'];

    activate(_context: IPluginContext): void {
        // 预留：CodeMirror 引擎专属 UI 在此插件中按需注入。
    }
}
