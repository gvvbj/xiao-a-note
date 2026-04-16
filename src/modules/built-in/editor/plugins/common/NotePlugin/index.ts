import { IPlugin, PluginCategory, IPluginContext } from '@/kernel/system/plugin/types';
import { ServiceId } from '@/kernel/core/ServiceId';
import { NoteService } from './services/NoteService';

/**
 * NotePlugin - 笔记核心逻辑插件
 * 彻底从核心层解耦
 */
export default class NotePlugin implements IPlugin {
    id = 'note-core';
    name = 'Note Core';
    version = '1.0.0';
    category = PluginCategory.CORE;
    internal = true;
    essential = true;
    order = 5; // 较早加载，因为其他插件依赖 NoteService

    activate(context: IPluginContext) {
        const noteService = new NoteService(context.kernel);
        context.registerService(ServiceId.NOTE, noteService);
    }
}
