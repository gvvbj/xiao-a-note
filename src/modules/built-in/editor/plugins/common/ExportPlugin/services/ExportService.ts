import { Kernel } from '@/kernel/core/Kernel';
import { ServiceId } from '@/kernel/core/ServiceId';
import { IFileSystem } from '@/kernel/interfaces/IFileSystem';
import { IMarkdownService } from '@/kernel/interfaces/IMarkdownService';
import { THEME_CONSTANTS } from '@/shared/constants/ThemeConstants';
import { wrapPluginStyles } from './ExportUtils';
import { loggerService } from '@/kernel/services/LoggerService';

const logger = loggerService.createLogger('ExportService');

/**
 * 导出服务
 * 处理单文件和多文件批量导出逻辑
 */
export async function handleGlobalExport(
    kernel: Kernel,
    type: 'pdf' | 'word',
    paths?: string[]
): Promise<void> {
    // 无路径参数时，由 EditorExportService 处理当前标签页导出
    if (!paths || !Array.isArray(paths) || paths.length === 0) return;

    const fileSystem = kernel.getService<IFileSystem>(ServiceId.FILE_SYSTEM);
    const markdownService = kernel.getService<IMarkdownService>(ServiceId.MARKDOWN);

    if (!fileSystem || !markdownService) {
        logger.error('Required services not available');
        return;
    }

    const DOMPurify = (await import('dompurify')).default;

    const ext = type === 'pdf' ? 'pdf' : 'mht';
    const filterName = type === 'pdf' ? 'PDF' : 'Word (MHTML)';

    // 收集所有待导出的 Markdown 文件路径
    let allFilePaths: string[] = [];
    for (const p of paths) {
        try {
            const res = await fileSystem.readFile(p);
            if (res.success) {
                // 是文件
                allFilePaths.push(p);
            } else {
                // 可能是文件夹，递归获取所有 markdown 文件
                const mdFiles = await fileSystem.getAllMarkdownFiles(p);
                allFilePaths = allFilePaths.concat(mdFiles);
            }
        } catch {
            try {
                const mdFiles = await fileSystem.getAllMarkdownFiles(p);
                allFilePaths = allFilePaths.concat(mdFiles);
            } catch (e) {
                logger.error(`Failed to process path: ${p}`, e);
            }
        }
    }

    // 过滤只保留 .md 文件
    allFilePaths = allFilePaths.filter(p => p.toLowerCase().endsWith('.md'));

    if (allFilePaths.length === 0) {
        logger.warn('No markdown files found to export');
        return;
    }

    // 单文件导出
    if (allFilePaths.length === 1) {
        await exportSingleFile(fileSystem, markdownService, DOMPurify, allFilePaths[0], type, ext, filterName);
    } else {
        // 多文件导出为 ZIP
        await exportMultipleFiles(fileSystem, markdownService, DOMPurify, allFilePaths, type);
    }
}

async function exportSingleFile(
    fileSystem: IFileSystem,
    markdownService: IMarkdownService,
    DOMPurify: any,
    path: string,
    type: 'pdf' | 'word',
    ext: string,
    filterName: string
): Promise<void> {
    try {
        const res = await fileSystem.readFile(path);
        if (!res.success) return;

        const rawHtml = await markdownService.render(res.content as string);

        // 合并插件的 DOMPurify 白名单配置
        const pluginPurifyConfig = markdownService.getRequiredPurifyConfig?.() || { ADD_TAGS: [], ADD_ATTR: [] };
        const cleanHtml = DOMPurify.sanitize(rawHtml as string, {
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

        const basePath = (await fileSystem.getDirname(path)) || '';
        const fileName = path.split(/[\\/]/).pop()?.replace(/\.md$/i, '') || 'Untitled';

        // 构建包含插件样式的完整 HTML 模板
        const finalHtml = buildExportHtml(cleanHtml, markdownService, fileName);

        const userPath = await fileSystem.showSaveDialog({
            defaultPath: `${fileName}.${ext}`,
            filters: [{ name: filterName, extensions: [ext] }]
        });

        if (userPath) {
            if (type === 'pdf') {
                await fileSystem.exportToPDF(finalHtml, userPath, { basePath });
            } else {
                await fileSystem.exportToWord(finalHtml, userPath, { basePath });
            }
        }
    } catch (e) {
        logger.error('Export failed', e);
    }
}

async function exportMultipleFiles(
    fileSystem: IFileSystem,
    markdownService: IMarkdownService,
    DOMPurify: any,
    allFilePaths: string[],
    type: 'pdf' | 'word'
): Promise<void> {
    try {
        const files: Array<{ path: string; name: string; content: string }> = [];

        for (const path of allFilePaths) {
            const res = await fileSystem.readFile(path);
            if (!res.success) continue;

            const rawHtml = await markdownService.render(res.content as string);

            // 合并插件的 DOMPurify 白名单配置
            const pluginPurifyConfig = markdownService.getRequiredPurifyConfig?.() || { ADD_TAGS: [], ADD_ATTR: [] };
            const cleanHtml = DOMPurify.sanitize(rawHtml as string, {
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

            const fileName = path.split(/[\\/]/).pop() || 'file.md';
            const finalHtml = buildExportHtml(cleanHtml, markdownService, fileName.replace(/\.md$/i, ''));

            files.push({ path, name: fileName, content: finalHtml });
        }

        if (files.length === 0) return;

        const zipPath = await fileSystem.showSaveDialog({
            defaultPath: `导出_${files.length}个文件.zip`,
            filters: [{ name: 'ZIP Archive', extensions: ['zip'] }]
        });

        if (zipPath) {
            await fileSystem.exportToZip(files, zipPath, type);
        }
    } catch (e) {
        logger.error('Batch export failed', e);
    }
}

/**
 * 构建导出用的完整 HTML 模板
 * 包含插件样式注入（KaTeX CSS、Mermaid 样式、代码高亮主题等）
 */
function buildExportHtml(contentHtml: string, markdownService: IMarkdownService, title: string): string {
    const pluginStyles = wrapPluginStyles(markdownService.getRequiredStyles?.() || '');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title || 'Exported Document'}</title>
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
        img { max-width: 100%; }
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
        ${contentHtml}
    </div>
</body>
</html>
    `;
}

