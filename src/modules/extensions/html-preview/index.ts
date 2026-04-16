import { IPlugin, IPluginContext } from "@/kernel/system/plugin/types";
import { HtmlRenderService } from "./services/HtmlRenderService";
import { SignalHandler } from "./handlers/SignalHandler";
import { CoreEvents } from "@/kernel/core/Events";
import { MODE_CHANGE_MESSAGE_TYPE } from "./templates/ModeChangeScript";

/**
 * HTML/CSS 预览插件入口（集成交互式块基础设施）
 * 职责：仅负责基础设施注册，不含业务逻辑
 */
export default class HtmlPreviewPlugin implements IPlugin {
    id = "html-preview-plugin";
    name = "HTML Preview";
    version = "2.1.0";
    description = "Isolated HTML/CSS preview with tri-state locking logic.";
    internal = false;

    activate(context: IPluginContext) {
        // 模式切换回调：通过事件总线触发装饰重算
        const onSetMode = (pos: number, mode: string) => {
            service.setMode(pos, mode as 'auto' | 'preview' | 'source');
            // 通过受控事件接口触发装饰重算，避免扩展插件直接访问 context.kernel
            context.emit(CoreEvents.EDITOR_REQUEST_REFRESH);
        };
        const service = new HtmlRenderService(onSetMode);
        const handler = new SignalHandler(context, service);

        // 1. 全局消息监听：接收 IFrame 的 raw postMessage 模式切换消息
        //    绕过 IFrameBridge 生命周期管理，确保消息在 IFrame 销毁后仍可送达
        const messageHandler = (event: MessageEvent) => {
            const data = event.data;
            if (!data || data.type !== MODE_CHANGE_MESSAGE_TYPE) return;

            const { pos, mode } = data;
            if (typeof pos === 'number' && mode) {
                onSetMode(pos, mode);
            }
        };
        window.addEventListener('message', messageHandler);

        // 2. 业务逻辑收敛：注册所有信号处理器
        handler.register();

        // 3. 渲染能力耦合：注册隔离渲染协议
        context.registerIsolatedRenderer({
            nodeTypes: ['FencedCode'],
            getPayload: (node, ctx) => service.getPayload(node, ctx)
        });

        // 4. 增强能力补充：为源码视图注册复制按钮挂件
        context.registerMarkdownDecorationProvider({
            nodeTypes: ['FencedCode'],
            render: (node, ctx) => service.getCopyDecoration(node, ctx)
        });

        context.logger.info("Activated with interactive block infrastructure (v2.1).");
    }

    deactivate() { }
}
