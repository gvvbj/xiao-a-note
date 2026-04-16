import { IPlugin, IPluginContext } from '@/kernel/system/plugin/types';
import { ServiceId } from '@/kernel/core/ServiceId';
import { LoggerService } from '@/kernel/services/LoggerService';
import 'katex/dist/katex.min.css';

import { markdownServiceFacet } from "@/modules/interfaces/EditorFacets";
import { MarkdownItService } from './services/MarkdownItService';

/**
 * MarkdownItPlugin
 * 
 * 迁移至统一日志系统
 * 
 * 一个基于 markdown-it 的高级解析器插件。
 * 支持：
 * 1. 数学公式 (KaTeX)
 * 2. 优化的表格样式
 * 3. 更好的语义化 HTML
 */
export default class MarkdownItPlugin implements IPlugin {
    id = 'markdown-it-parser';
    name = 'Markdown-it 高级渲染器';
    version = '1.0.0';
    description = '使用 markdown-it 引擎替换默认解析器。支持 LaTeX 公式、优化后的表格排版。';

    private logger?: any;

    activate(context: IPluginContext) {
        // 使用 LoggerService
        const loggerService = context.kernel.getService<LoggerService>(ServiceId.LOGGER, false);
        this.logger = loggerService?.createLogger('MarkdownItPlugin');
        this.logger?.info('正在激活 Markdown-it 插件...');

        const service = new MarkdownItService();
        this.logger?.warn('Registering markdownService. This might shadow the core service!');

        // 1. 注册服务 (允许覆盖，修复热更新问题)
        context.registerService(ServiceId.MARKDOWN, service);

        // 2. 注册 Editor 扩展 (Facet)
        if (context.registerEditorExtension) {
            context.registerEditorExtension(markdownServiceFacet.of(service));
        }

        // 3. KaTeX 样式通过本地包导入（避免 CSP 拦截 CDN 外链）

        this.logger?.info('Markdown-it 插件激活成功');
    }

    deactivate() {
        this.logger?.info('Markdown-it 插件已停用');
        this.logger = undefined;
    }
}

