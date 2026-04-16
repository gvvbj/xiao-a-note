import { IPlugin, IPluginContext } from '@/kernel/system/plugin/types';
import { UISlotId } from '@/kernel/core/Constants';
import { TimestampButton } from './TimestampButton';

/**
 * TimestampPlugin - 时间戳插入器
 *
 * 修复 RestrictedPluginContext 访问权限问题
 * 扩展插件不能直接访问 kernel，使用 context.logger 输出日志
 *
 * 使用 class 私有字段存储状态，确保正确卸载 UI 组件
 */
export default class TimestampPlugin implements IPlugin {
    id = 'timestamp-plugin';
    name = '插入当前时间';
    version = '1.0.0';
    description = '在编辑器中快速插入当前时间戳。';
    order = 100;
    dependencies: string[] = [];

    private cleanup?: () => void;
    private logger?: IPluginContext['logger'];

    activate(context: IPluginContext) {
        this.logger = context.logger;
        this.logger.info('Activating TimestampPlugin...');

        // 注册到 EDITOR_HEADER_RIGHT，order=110 放在全屏按钮(100)后面
        this.cleanup = context.registerUI(UISlotId.EDITOR_HEADER_RIGHT, {
            id: 'timestamp-btn',
            component: TimestampButton,
            order: 110
        });

        this.logger.info('TimestampPlugin activated successfully');
    }

    deactivate() {
        if (this.cleanup) {
            this.cleanup();
            this.cleanup = undefined;
        }
        this.logger?.info('TimestampPlugin deactivated');
        this.logger = undefined;
    }
}
