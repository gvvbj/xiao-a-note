import { IPlugin, PluginCategory, IPluginContext } from '@/kernel/system/plugin/types';
import { ServiceId } from '@/kernel/core/ServiceId';
import { SyncService } from './services/SyncService';

/**
 * EditorSyncPlugin - 编辑器同步插件
 * 职责：注册并管理跨模块的副作用同步服务
 * 
 * 注意：本文件仅负责注册，业务逻辑在 services/ 目录中实现
 */
export default class EditorSyncPlugin implements IPlugin {
    id = 'editor-sync';
    readonly name = 'Editor Side-effect Sync';
    readonly category = PluginCategory.CORE;
    readonly internal = true;
    readonly order = 20;
    readonly description = 'Handles editor content synchronization with tabs and explorer.';
    version = '1.0.0';
    readonly essential = true;

    private syncService?: SyncService;

    activate(context: IPluginContext) {
        // 创建并启动同步服务
        this.syncService = new SyncService(context.kernel);
        this.syncService.start();

        // 注册服务供其他插件使用
        context.registerService(ServiceId.EDITOR_SYNC, this.syncService);
    }

    deactivate() {
        if (this.syncService) {
            this.syncService.dispose();
        }
    }
}
