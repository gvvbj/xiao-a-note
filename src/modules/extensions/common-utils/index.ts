import { IPlugin, IPluginContext, PluginCategory } from "@/kernel/system/plugin/types";
import { IFileSystem } from "@/kernel/interfaces/IFileSystem";

/**
 * 通用工具库插件 (Common Utils)
 * 
 * 这是一个 "Shared Capability" (共享能力) 插件的范例。
 * 它不提供 UI 界面，而是注册一组通用服务供其他插件使用。
 */
export default class CommonUtilsPlugin implements IPlugin {
    id = 'common-utils';
    name = 'Common Utilities';
    version = '1.0.0';
    description = 'Provides shared services like Logger, DateUtils, etc. for other plugins.';
    category = PluginCategory.SYSTEM;
    essential = true;  // 强制始终开启
    hidden = true;     // 在扩展中心隐藏
    author = 'Xiao A Note Team';


    activate(context: IPluginContext) {
        // 重构：CommonUtils 目前仅保留架构占位，后续可添加 DateUtils 等
        // LoggerService 已移至 Kernel
        context.logger.info('CommonUtilsPlugin activated (LoggerService migrated to Kernel).');
    }

    deactivate() {
        // No cleanup needed
    }
}
