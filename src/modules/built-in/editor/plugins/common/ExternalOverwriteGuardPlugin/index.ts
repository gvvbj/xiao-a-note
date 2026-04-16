import { IPlugin, IPluginContext, PluginCategory } from '@/kernel/system/plugin/types';
import { EXTERNAL_OVERWRITE_GUARD_SERVICE_ID } from '@/modules/interfaces';
import { ExternalOverwriteGuardService } from './services/ExternalOverwriteGuardService';

export default class ExternalOverwriteGuardPlugin implements IPlugin {
    id = 'external-overwrite-guard-plugin';
    name = 'External Overwrite Guard';
    version = '1.0.0';
    category = PluginCategory.CORE;
    internal = true;
    essential = true;
    order = 14;

    private service: ExternalOverwriteGuardService | null = null;

    activate(context: IPluginContext) {
        this.service = new ExternalOverwriteGuardService(context.kernel);
        this.service.start();
        context.registerService(EXTERNAL_OVERWRITE_GUARD_SERVICE_ID, this.service);
    }

    deactivate() {
        this.service?.dispose();
        this.service = null;
    }
}
