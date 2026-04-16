import { IPlugin, IPluginContext, PluginCategory } from '@/kernel/system/plugin/types';
import { FILE_CHANGE_CLASSIFICATION_SERVICE_ID } from '@/modules/interfaces';
import { FileChangeClassificationService } from './services/FileChangeClassificationService';

export default class FileChangeClassificationPlugin implements IPlugin {
    id = 'file-change-classification-plugin';
    name = 'File Change Classification';
    version = '1.0.0';
    category = PluginCategory.CORE;
    internal = true;
    essential = true;
    order = 13;

    private service: FileChangeClassificationService | null = null;

    activate(context: IPluginContext) {
        this.service = new FileChangeClassificationService(context.kernel);
        this.service.start();
        context.registerService(FILE_CHANGE_CLASSIFICATION_SERVICE_ID, this.service);
    }

    deactivate() {
        this.service?.dispose();
        this.service = null;
    }
}
