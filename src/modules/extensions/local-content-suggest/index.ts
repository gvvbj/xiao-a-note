import { IPlugin, IPluginContext } from '@/kernel/system/plugin/types';
import { LOCAL_CONTENT_SUGGEST_CONSTANTS as C } from './constants/LocalContentSuggestConstants';
import { createLocalContentSuggestExtensions } from './services/LocalContentCompletion';

export default class LocalContentSuggestPlugin implements IPlugin {
    id = C.PLUGIN_ID;
    name = C.PLUGIN_NAME;
    version = C.VERSION;
    description = C.DESCRIPTION;

    private disposables: Array<() => void> = [];

    activate(context: IPluginContext) {
        const extensions = createLocalContentSuggestExtensions();
        for (const ext of extensions) {
            this.disposables.push(context.registerEditorExtension(ext));
        }

        context.logger.info(`${C.PLUGIN_NAME} 已激活`);
    }

    deactivate() {
        for (const dispose of this.disposables.splice(0)) {
            try {
                dispose();
            } catch {
                // 保证停用阶段尽量不抛出异常
            }
        }
    }
}

