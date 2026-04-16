import { IFileSystem } from '@/kernel/interfaces/IFileSystem';
import { Kernel } from '@/kernel/core/Kernel';
import { ServiceId } from '@/kernel/core/ServiceId';
import { IMarkdownService } from '@/kernel/interfaces/IMarkdownService';
import { THEME_CONSTANTS } from '@/shared/constants/ThemeConstants';
import { wrapPluginStyles } from './ExportUtils';
import { loggerService } from '@/kernel/services/LoggerService';

const logger = loggerService.createLogger('EditorExportService');

export interface ExportOptions {
    basePath?: string;
    title?: string;
}

export class EditorExportService {
    // private fileSystem: IFileSystem; // Removed
    private kernel: Kernel;

    constructor(kernel: Kernel) {
        this.kernel = kernel;
        // this.fileSystem = kernel.getService<IFileSystem>(ServiceId.FILE_SYSTEM); // Removed immediate access
    }

    private get fileSystem(): IFileSystem {
        return this.kernel.getService<IFileSystem>(ServiceId.FILE_SYSTEM);
    }

    /**
     * 核心导出方法：负责渲染、净化与分发
     */
    async exportFile(content: string, savePath: string, format: 'md' | 'pdf' | 'mht', options: ExportOptions = {}): Promise<void> {
        if (format === 'md') {
            await this.fileSystem.saveFile(savePath, content);
            return;
        }

        // 渲染 HTML
        const markdownService = this.kernel.getService<IMarkdownService>(ServiceId.MARKDOWN);
        if (!markdownService) throw new Error('MarkdownService not found');

        const rawHtml = await markdownService.render(content);

        // 动态导入 DOMPurify 以减小主包体积
        const DOMPurify = (await import('dompurify')).default;

        // 配置 DOMPurify：动态合并来自 Markdown 插件的白名单规则
        const pluginPurifyConfig = markdownService.getRequiredPurifyConfig?.() || { ADD_TAGS: [], ADD_ATTR: [] };

        const cleanHtmlFragment = DOMPurify.sanitize(rawHtml as string, {
            ADD_TAGS: [
                'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li',
                'blockquote', 'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
                'em', 'strong', 'del', 'a', 'img',
                ...(pluginPurifyConfig.ADD_TAGS || [])
            ],
            ADD_ATTR: [
                'href', 'src', 'alt', 'title', 'class', 'style', 'target',
                ...(pluginPurifyConfig.ADD_ATTR || [])
            ],
        });

        // 将渲染出的片段包裹在完整的 HTML 模板中，并注入样式
        const pluginStyles = wrapPluginStyles(markdownService.getRequiredStyles?.() || '');
        const finalHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${options.title || 'Exported Document'}</title>
    <!-- 动态注入来自 Markdown 插件的全局样式 -->
    ${pluginStyles}
    <style>
        body {
            font-family: ${THEME_CONSTANTS.EXPORT.FONT_SANS};
            line-height: 1.6;
            color: ${THEME_CONSTANTS.EXPORT.COLOR_TEXT};
            max-width: ${THEME_CONSTANTS.EXPORT.MAX_WIDTH};
            margin: 0 auto;
            padding: 2rem;
        }
        /* KaTeX 样式修正，防止在某些导出环境下溢出 */
        .katex-display {
            overflow-x: auto;
            overflow-y: hidden;
            padding: 0.5em 0;
        }
        pre {
            background: ${THEME_CONSTANTS.EXPORT.COLOR_BG_CODE};
            padding: 1rem;
            border-radius: 4px;
            overflow-x: auto;
        }
        code {
            background: ${THEME_CONSTANTS.EXPORT.COLOR_BG_CODE};
            padding: 0.2rem 0.4rem;
            border-radius: 3px;
        }
        /* 现代表格样式 */
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 1.5rem 0;
            box-shadow: 0 0 10px rgba(0,0,0,0.05);
        }
        table th, table td {
            border: 1px solid ${THEME_CONSTANTS.EXPORT.COLOR_BORDER_TABLE};
            padding: 12px;
            text-align: left;
        }
        table th {
            background-color: ${THEME_CONSTANTS.EXPORT.COLOR_BG_TABLE_HEADER};
            font-weight: 600;
        }
        table tr:nth-child(even) {
            background-color: ${THEME_CONSTANTS.EXPORT.COLOR_BG_TABLE_EVEN};
        }
        img {
            max-width: 100%;
        }
        .markdown-body {
            box-sizing: border-box;
            min-width: 200px;
            max-width: ${THEME_CONSTANTS.EXPORT.MARKDOWN_MAX_WIDTH};
            margin: 0 auto;
        }
    </style>
</head>
<body>
    <div class="markdown-body">
        ${cleanHtmlFragment}
    </div>
</body>
</html>
        `;

        if (format === 'pdf') {
            await this.fileSystem.exportToPDF(finalHtml, savePath, { basePath: options.basePath });
        } else if (format === 'mht') {
            await this.fileSystem.exportToWord(finalHtml, savePath, { basePath: options.basePath });
        }
    }

    /**
     * @deprecated 请使用集成的 exportFile 方法
     */
    async exportToMHT(fileName: string, content: string, title: string = ''): Promise<boolean> {
        try {
            await this.exportFile(content, fileName, 'mht', { title });
            return true;
        } catch (e) {
            logger.error('MHT Export failed', e);
            return false;
        }
    }
}
