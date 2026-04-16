import { IPluginContext } from "@/kernel/system/plugin/types";
import { IFileSystem } from "@/kernel/interfaces/IFileSystem";
import { WorkspaceService } from "@/kernel/services/WorkspaceService";
import { ServiceId } from "@/kernel/core/ServiceId";
import { HtmlRenderService } from "../services/HtmlRenderService";

/**
 * 插件信号处理器
 * 职责：处理 IFrame 发出的信号，执行业务逻辑与内核交互
 *
 * 注意：set-block-mode 信号已迁移至 index.ts 的全局消息监听器处理，
 * 因为 IFrameBridge 的生命周期管理可能导致消息在 IFrame 销毁后丢失。
 */
export class SignalHandler {
    constructor(
        private readonly context: IPluginContext,
        private readonly service: HtmlRenderService
    ) { }

    /**
     * 注册所有处理器
     */
    register() {
        this.context.registerIFrameSignal('fs-query', (iframe, data) => this.handleFsQuery(iframe, data));
        this.context.registerIFrameSignal('copy-code', (iframe, data) => this.handleCopyCode(iframe, data));
    }

    private async handleFsQuery(iframe: HTMLIFrameElement, data: any) {
        const { queryId, operation, path: relPath } = data;
        try {
            const workspaceService = this.context.getService<WorkspaceService>(ServiceId.WORKSPACE);
            const fileSystem = this.context.getService<IFileSystem>(ServiceId.FILE_SYSTEM);
            if (!workspaceService) {
                throw new Error('Workspace service unavailable');
            }
            if (!fileSystem) {
                throw new Error('File system service unavailable');
            }
            const projectRoot = workspaceService.getProjectRoot();

            if (!projectRoot) throw new Error('Project root not found');

            let targetPath = await fileSystem.pathJoin(projectRoot, relPath);
            if (!targetPath.startsWith(projectRoot)) {
                throw new Error('Access denied: Out of project root');
            }

            let result: any = null;
            if (operation === 'list') {
                const tree: any = await fileSystem.readDirectoryTree(targetPath);
                result = Array.isArray(tree) ? tree : (tree.children || []);
            } else if (operation === 'read') {
                const raw = await fileSystem.readFile(targetPath);
                result = typeof raw === 'object' ? JSON.stringify(raw, null, 2) : String(raw || '');
            }

            this.postToIFrame(iframe, {
                type: 'fs-response',
                queryId,
                status: 'success',
                data: result
            });
        } catch (e: any) {
            this.postToIFrame(iframe, {
                type: 'fs-response',
                queryId,
                status: 'error',
                message: e.message
            });
        }
    }

    private async handleCopyCode(iframe: HTMLIFrameElement, data: any) {
        const { content } = data;
        if (content) {
            try {
                await navigator.clipboard.writeText(content);
            } catch (e) {
                this.context.logger.error("Failed to copy code:", e);
            }
        }
    }

    private postToIFrame(iframe: HTMLIFrameElement, payload: any) {
        iframe.contentWindow?.postMessage(payload, '*');
    }
}
