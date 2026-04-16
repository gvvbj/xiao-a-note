import { IPlugin, PluginCategory, IPluginContext } from '@/kernel/system/plugin/types';
import { PersistenceService } from './services/PersistenceService';
import { EDITOR_CONSTANTS } from '../../../constants/EditorConstants';

/**
 * 持久化插件 (Core)
 * 职责：
 * 1. 注册持久化服务 (自动保存 + 手动保存)
 * 2. 管理持久化相关的生命周期
 * 
 * 注意：本文件仅负责注册，业务逻辑在 services/PersistenceService.ts 中实现
 */
export default class PersistencePlugin implements IPlugin {
    id = 'persistence-plugin';
    readonly name = '持久化服务';
    readonly category = PluginCategory.CORE;
    readonly internal = true;
    readonly order = 15;
    readonly description = '负责文档自动保存、手动保存与状态记忆';
    version = '1.0.0';
    readonly essential = true;

    private persistenceService?: PersistenceService;

    activate(context: IPluginContext) {
        // 创建并启动持久化服务
        this.persistenceService = new PersistenceService(context.kernel);
        this.persistenceService.start();

        // 注册服务供其他插件使用 (遵循无硬编码原则)
        context.registerService(EDITOR_CONSTANTS.SERVICE_NAMES.PERSISTENCE, this.persistenceService);
    }

    deactivate() {
        if (this.persistenceService) {
            this.persistenceService.dispose();
        }
    }
}

