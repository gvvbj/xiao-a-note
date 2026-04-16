import { loggerService } from '../services/LoggerService';

const logger = loggerService.createLogger('MarkdownPluginRegistry');

/**
 * Markdown 插件接口定义
 * 符合 Plugin-First 原则，允许插件携带解析逻辑、样式及净化规则
 */
export interface IMarkdownPlugin {
    /** 插件唯一标识 */
    id: string;
    /** 加载到 markdown-it 实例的方法 */
    apply: (md: any) => void;
    /** 该插件所需的 CSS 样式 (用于导出) */
    getCss?: () => string;
    /** 该插件所需的 DOMPurify 白名单配置 */
    getPurifyConfig?: () => {
        ADD_TAGS?: string[];
        ADD_ATTR?: string[];
    };
    /**
     * 可选：异步后处理钩子
     * 在 markdown-it 同步渲染完成后执行，用于需要异步操作的场景
     * (如 Mermaid 图表需要动态加载库并渲染 SVG)
     */
    postProcess?: (html: string) => Promise<string>;
    /** 排序权重，小的在前 */
    order?: number;
}

/**
 * Markdown 插件注册中心
 * 位于内核层，解耦具体语法实现与渲染引擎
 */
export class MarkdownPluginRegistry {
    private plugins: IMarkdownPlugin[] = [];
    private listeners: (() => void)[] = [];

    /**
     * 注册一个新的 Markdown 插件
     */
    register(plugin: IMarkdownPlugin): () => void {
        const newPlugin = { order: 100, ...plugin };
        this.plugins.push(newPlugin);
        this.plugins.sort((a, b) => (a.order || 0) - (b.order || 0));

        this.notify();

        return () => {
            this.plugins = this.plugins.filter(p => p.id !== plugin.id);
            this.notify();
        };
    }

    /**
     * 获取所有已注册插件
     */
    getPlugins(): IMarkdownPlugin[] {
        return [...this.plugins];
    }

    /**
     * 汇总所有插件的 CSS
     */
    getAllStyles(): string {
        return this.plugins
            .filter(p => p.getCss)
            .map(p => p.getCss!())
            .join('\n');
    }

    /**
     * 汇总所有插件的净化配置
     */
    getPurifyConfigs() {
        const config = { ADD_TAGS: [] as string[], ADD_ATTR: [] as string[] };
        this.plugins.forEach(p => {
            const pConfig = p.getPurifyConfig?.();
            if (pConfig) {
                if (pConfig.ADD_TAGS) config.ADD_TAGS.push(...pConfig.ADD_TAGS);
                if (pConfig.ADD_ATTR) config.ADD_ATTR.push(...pConfig.ADD_ATTR);
            }
        });
        return config;
    }

    /**
     * 运行所有插件的异步后处理器
     * 在 markdown-it 同步渲染后调用，按 order 顺序链式执行
     */
    async runPostProcessors(html: string): Promise<string> {
        let result = html;
        for (const plugin of this.plugins) {
            if (plugin.postProcess) {
                try {
                    result = await plugin.postProcess(result);
                } catch (e) {
                    logger.error(`postProcess failed for plugin ${plugin.id}`, e);
                }
            }
        }
        return result;
    }

    subscribe(listener: () => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notify() {
        this.listeners.forEach(l => l());
    }
}
