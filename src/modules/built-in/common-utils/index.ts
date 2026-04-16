import { IPlugin, IPluginContext, PluginCategory } from "@/kernel/system/plugin/types";
import { ServiceId } from "@/kernel/core/ServiceId";
import { ContentService } from "./services/ContentService";

/**
 * 内置通用工具库插件 (Built-in Common Utils)
 * 职责：注册供所有内置插件使用的公共服务
 */
export default class BuiltInCommonUtilsPlugin implements IPlugin {
    id = 'built-in-common-utils';
    name = 'Built-in Common Utilities';
    version = '1.0.0';
    description = 'Provides shared services for built-in plugins.';
    category = PluginCategory.CORE;
    internal = true;
    order = 0; // 最高优先级，确保第一个加载
    essential = true;

    activate(context: IPluginContext) {
        // 注册内容处理服务
        context.registerService(ServiceId.COMMON_CONTENT, new ContentService());
    }
}
