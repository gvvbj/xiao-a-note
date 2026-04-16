import { IPlugin, IPluginContext, PluginCategory } from '@/kernel/system/plugin/types';
import { ServiceId } from '@/kernel/core/ServiceId';
import { LoggerService } from '@/kernel/services/LoggerService';
import { SearchReplacePanel } from './components/SearchReplacePanel';
import { EditorPanelRegistry } from '../../../../registries/EditorPanelRegistry';
import { createSearchKeyHandler } from './services/SearchKeyHandler';

/**
 * SearchPlugin - 搜索与替换插件
 * 将 NoteEditor 内部的搜索逻辑彻底剥离为独立模块
 * 
 * 注意：本文件仅负责注册，键盘处理逻辑在 services/SearchKeyHandler.ts
 */
export default class SearchPlugin implements IPlugin {
    id = 'internal.search';
    readonly name = '搜索与替换';
    readonly category = PluginCategory.CORE;
    readonly internal = true;
    readonly description = '提供编辑器内的搜索与替换功能面板。';
    version = '1.0.0';
    readonly essential = true;

    private cleanup?: () => void;

    activate(context: IPluginContext) {
        const kernel = context.kernel;
        const panelRegistry = kernel.getService(ServiceId.EDITOR_PANEL_REGISTRY) as EditorPanelRegistry;

        if (!panelRegistry) {
            context.kernel.getService<LoggerService>(ServiceId.LOGGER)?.createLogger('SearchPlugin').error('EditorPanelRegistry not found');
            return;
        }

        // 1. 注册面板
        panelRegistry.registerPanel({
            id: 'search-replace',
            position: 'top',
            component: SearchReplacePanel,
            props: {
                onClose: () => panelRegistry.closePanel('search-replace')
            }
        });

        // 2. 注册命令
        context.registerCommand({
            id: 'editor.search.toggle',
            title: '查找/替换',
            category: '编辑器',
            handler: () => panelRegistry.togglePanel('search-replace')
        });

        context.registerCommand({
            id: 'editor.search.hide',
            title: '关闭查找/替换',
            category: '编辑器',
            handler: () => panelRegistry.closePanel('search-replace')
        });

        // 3. 监听全局快捷键 (逻辑已抽离到 services/)
        const handleKeyDown = createSearchKeyHandler(panelRegistry);
        window.addEventListener('keydown', handleKeyDown, true);

        // 4. 注册快捷键元数据
        context.registerShortcuts([
            { id: 'search', keys: 'Ctrl + F', description: '查找/替换', group: 'edit', order: 30 },
            { id: 'close-search', keys: 'Escape', description: '关闭查找面板', group: 'edit', order: 31 },
        ]);

        this.cleanup = () => {
            window.removeEventListener('keydown', handleKeyDown, true);
        };
    }

    deactivate() {
        if (this.cleanup) {
            this.cleanup();
        }
    }
}

