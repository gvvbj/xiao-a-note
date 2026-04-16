import { Blocks } from "lucide-react";
import { PluginSidebarView } from "./views/PluginSidebarView";
import { IPlugin, IPluginContext, PluginCategory } from "./types";

/**
 * 插件系统本身的 UI 插件
 * 负责注册 "扩展" 侧边栏
 */
export const PluginSystemPlugin: IPlugin = {
    id: 'plugin-system-ui',
    name: '插件管理器',
    version: '1.0.0',
    description: '提供插件管理界面',
    category: PluginCategory.SYSTEM,
    internal: true,
    essential: true,
    order: 100,
    activate: (context: IPluginContext) => {
        // 注册侧边栏视图
        context.registerSidebarItem(
            'plugin-sidebar',
            PluginSidebarView,
            '扩展',
            Blocks,
            100 // [MODIFIED] Set explicitly low priority (high number)
        );
    }
};

export default PluginSystemPlugin;
