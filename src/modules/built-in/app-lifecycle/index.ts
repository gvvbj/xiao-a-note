/**
 * AppLifecyclePlugin
 *
 * 应用生命周期插件 — 从 AppLayout 中剥离的核心业务逻辑。
 *
 * 职责：
 * 1. 文件打开命令处理（APP_CMD_OPEN_FILE）
 * 2. Electron 文件关联启动（双击.md文件打开）
 * 3. 新窗口状态隔离（检查 URL 参数，清空标签页）
 *
 * 安全等级：internal（完整 PluginContext）
 * 设计原则：
 * - 所有事件监听在 deactivate 中清理
 * - 不依赖 React 组件生命周期
 * - 使用 LoggerService 记录关键操作
 */

import { IPlugin, IPluginContext, PluginCategory } from '@/kernel/system/plugin/types';
import { ServiceId } from '@/kernel/core/ServiceId';
import { LoggerService } from '@/kernel/services/LoggerService';
import { AppLifecycleController } from './services/AppLifecycleController';
export default class AppLifecyclePlugin implements IPlugin {
    id = 'app-lifecycle';
    name = '应用生命周期';
    version = '1.0.0';
    category = PluginCategory.SYSTEM;
    internal = true;
    essential = true;
    hidden = true;
    order = 999; // 最后激活，确保所有其他插件已注册 APP_CLEAR_STATE 监听器

    private controller: AppLifecycleController | null = null;

    activate(context: IPluginContext) {
        const kernel = context.kernel;

        const logger = kernel.getService<LoggerService>(ServiceId.LOGGER, false)?.createLogger('AppLifecyclePlugin');
        this.controller = new AppLifecycleController(kernel, logger);
        this.controller.init();
    }

    deactivate() {
        this.controller?.dispose();
        this.controller = null;
    }
}

