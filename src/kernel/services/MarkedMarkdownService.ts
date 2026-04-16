import { IMarkdownService } from "../interfaces/IMarkdownService";
import { Kernel } from "../core/Kernel";
import { loggerService } from './LoggerService';

const logger = loggerService.createLogger('MarkedMarkdownService');

type MarkdownItModuleShape = typeof import('markdown-it') & {
    default?: typeof import('markdown-it');
};

/**
 * MarkedMarkdownService
 * 
 * 基于 markdown-it 库的解析实现。
 * [重构] 采用插件中心模式，不再硬编码具体插件
 */
export class MarkedMarkdownService implements IMarkdownService {
    readonly name = 'markdown-it';
    private md: any = null;
    private initPromise: Promise<void> | null = null;
    private kernel: Kernel | null = null;

    setKernel(kernel: Kernel) {
        this.kernel = kernel;
    }

    private async init() {
        if (this.md) return;

        if (!this.initPromise) {
            this.initPromise = (async () => {
                const markdownItModule = (await import('markdown-it')) as MarkdownItModuleShape;
                const MarkdownIt = markdownItModule.default || markdownItModule;

                this.md = new MarkdownIt({
                    html: true,
                    linkify: true,
                    typographer: true,
                    breaks: true
                });

                // 动态加载已注册的 Markdown 插件
                if (this.kernel) {
                    const registry = this.kernel.markdownPlugins;
                    const plugins = registry.getPlugins();

                    for (const plugin of plugins) {
                        try {
                            await plugin.apply(this.md);
                        } catch (e) {
                            logger.error(`Failed to apply plugin ${plugin.id}`, e);
                        }
                    }
                }
            })();
        }

        await this.initPromise;
    }

    /**
     * 获取所有插件汇总的 CSS (供导出服务使用)
     */
    getRequiredStyles(): string {
        return this.kernel?.markdownPlugins.getAllStyles() || '';
    }

    /**
     * 获取所有插件汇总的净化配置 (供导出服务使用)
     */
    getRequiredPurifyConfig() {
        return this.kernel?.markdownPlugins.getPurifyConfigs() || { ADD_TAGS: [], ADD_ATTR: [] };
    }

    async render(content: string): Promise<string> {
        await this.init();
        let html = this.md.render(content);

        // 运行已注册插件的异步后处理器（如 Mermaid SVG 渲染）
        if (this.kernel) {
            html = await this.kernel.markdownPlugins.runPostProcessors(html);
        }

        return html;
    }

    /**
     * 同步渲染行内文本
     */
    renderInline(content: string): string {
        if (!this.md) {
            // 如果还未初始化完成，尝试返回原始内容或简单转义
            // 注意：MathWidget 会频繁调用此方法，所以我们要尽快完成 init
            this.init();
            return content;
        }
        return this.md.renderInline(content);
    }
}
