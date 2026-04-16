import { WidgetType, EditorView } from "@codemirror/view";
import { IIsolatedRenderPayload } from "@/kernel/system/plugin/types";
import { IFrameBridge } from "../utils/IFrameBridge";
import { ISOLATION_CONSTANTS } from "@/kernel/constants/IsolationConstants";

/**
 * 隔离框架 Widget
 * 
 * 硬隔离核心容器
 * 
 * 设计目标：
 * 1. 使用 IFrame 实现物理级的 CSS 和 JS 隔离
 * 2. 自动同步宿主主题变量
 * 3. 自动计算并同步高度，避免产生滚动条
 */
export class IsolatedFrameWidget extends WidgetType {
    private iframe: HTMLIFrameElement | null = null;
    private isolationId: string;

    constructor(
        readonly payload: IIsolatedRenderPayload,
        readonly nodeType: string
    ) {
        super();
        this.isolationId = `iso-${Math.random().toString(36).substr(2, 9)}`;
    }

    eq(other: IsolatedFrameWidget) {
        return other.payload.html === this.payload.html &&
            other.payload.css === this.payload.css &&
            other.nodeType === this.nodeType;
    }

    toDOM(view: EditorView) {
        const wrapper = document.createElement("div");
        wrapper.className = `cm-isolated-frame-wrapper cm-isolated-${this.nodeType}`;
        wrapper.style.width = "100%";
        wrapper.style.minHeight = "20px";
        wrapper.style.overflow = "hidden";

        const iframe = document.createElement("iframe");
        this.iframe = iframe;

        // 物理安全加固：启用沙箱
        // 关键：仅限脚本执行，禁止同源访问 (这样 window.parent 就会失效，阻断逃逸)
        iframe.sandbox.add("allow-scripts");

        // 设置基础属性以确保无感融入
        iframe.style.width = "100%";
        iframe.style.border = "none";
        iframe.style.display = "block";
        iframe.style.overflow = "hidden";
        iframe.style.backgroundColor = "transparent";
        iframe.setAttribute("scrolling", "no");

        // 安全策略注入 (CSP)
        // 限制网络请求，仅允许内联资源与本地图片数据
        const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src * data:; style-src 'unsafe-inline'; script-src 'unsafe-inline';">`;

        // 组装渲染文档
        const styles = `<style>${IFrameBridge.getBaseStyles()}${this.payload.css || ''}</style>`;

        // 注入包含唯一 ID 的桥接脚本 (通过字符串替换)
        const rawScript = ISOLATION_CONSTANTS.BRIDGE_SCRIPT;
        const injectedScript = rawScript.replace('ISOLATION_ID_PLACEHOLDER', this.isolationId);
        const script = `<script>${injectedScript}</script>`;

        // 注入业务自定义脚本
        const customScripts = (this.payload.scripts || []).map(s => `<script>${s}</script>`).join('\n');

        const content = `<div id="render-root">${this.payload.html}</div>`;

        iframe.srcdoc = `<!DOCTYPE html><html><head>${csp}${styles}</head><body>${content}${script}${customScripts}</body></html>`;

        // 绑定加载事件：注册到桥接管理器
        iframe.onload = () => {
            IFrameBridge.register(this.isolationId, iframe);
        };

        wrapper.appendChild(iframe);
        return wrapper;
    }

    ignoreEvent() {
        return false;
    }

    destroy() {
        if (this.iframe) {
            IFrameBridge.unregister(this.isolationId);
            this.iframe = null;
        }
    }
}
