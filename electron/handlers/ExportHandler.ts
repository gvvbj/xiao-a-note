/**
 * ExportHandler - 导出处理器
 * 
 * [Phase 9] 后端架构重构
 * 
 * 职责:
 * - PDF 导出 (fs:exportToPDF)
 * - Word 导出 (fs:exportToWord) 
 * - ZIP 批量导出 (fs:exportToZip)
 * 
 * 设计原则:
 * - 单一职责: 仅处理导出相关操作
 * - 无硬编码: 使用 channels.ts 常量
 */

import { ipcMain, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import { EXPORT_CHANNELS, MIME_TYPES } from '../constants/channels';
import { MainLoggerHandler } from './MainLoggerHandler';

export class ExportHandler {
    private static instance: ExportHandler | null = null;
    private static isRegistered = false;

    private logger = MainLoggerHandler.initialize();
    private ns = 'ExportHandler';

    /**
     * 初始化导出处理器（单例）
     */
    static initialize(): ExportHandler {
        if (ExportHandler.isRegistered) {
            return ExportHandler.instance!;
        }

        ExportHandler.instance = new ExportHandler();
        ExportHandler.isRegistered = true;
        return ExportHandler.instance;
    }

    private constructor() {
        this.registerHandlers();
    }

    private registerHandlers() {
        this.logger.info(this.ns, 'Registering handlers...');

        // === PDF 导出 ===
        ipcMain.handle(EXPORT_CHANNELS.FS_EXPORT_PDF, async (_event, html: string, savePath: string, options?: { basePath?: string }) => {
            let printWindow: BrowserWindow | null = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false } });
            try {
                const processedHtml = await this.convertImagesToBase64(html, options?.basePath);
                const { toc, html: htmlWithIds } = this.generateTOCAndAddIds(processedHtml);

                const htmlContent = this.buildPDFHtml(toc, htmlWithIds);
                await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
                await new Promise(resolve => setTimeout(resolve, 500));

                const data = await printWindow.webContents.printToPDF({
                    printBackground: true,
                    pageSize: 'A4',
                    margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 },
                    generateDocumentOutline: true,
                    generateTaggedPDF: true
                });
                await fs.promises.writeFile(savePath, data);
                printWindow.close();
                return { success: true };
            } catch (err: unknown) {
                if (printWindow) printWindow.close();
                const error = err as Error;
                return { success: false, error: error.message };
            }
        });

        // === Word 导出 (MHTML 格式) ===
        ipcMain.handle(EXPORT_CHANNELS.FS_EXPORT_WORD, async (_event, html: string, savePath: string, options?: { basePath?: string }) => {
            try {
                const { html: processedHtml, imageParts } = await this.extractImagesForMHTML(html, options?.basePath);
                const { toc, html: htmlWithIds } = this.generateTOCAndAddIds(processedHtml);

                const mhtml = this.buildMHTML(toc, htmlWithIds, imageParts);
                const actualPath = savePath.replace(/\.docx?$/i, '.mht');
                await fs.promises.writeFile(actualPath, mhtml, 'utf-8');
                return { success: true };
            } catch (err: unknown) {
                const error = err as Error;
                return { success: false, error: error.message };
            }
        });

        // === ZIP 批量导出 ===
        ipcMain.handle(EXPORT_CHANNELS.FS_EXPORT_ZIP, async (_event, files: Array<{ path: string; name: string; content: string }>, savePath: string, exportType: 'pdf' | 'word') => {
            try {
                const archiver = require('archiver');
                const output = fs.createWriteStream(savePath);
                const archive = archiver('zip', { zlib: { level: 9 } });

                archive.pipe(output);

                for (const file of files) {
                    const basePath = path.dirname(file.path);
                    const processedHtml = await this.convertImagesToBase64(file.content, basePath);
                    const { toc, html: htmlWithIds } = this.generateTOCAndAddIds(processedHtml);

                    const fullHtml = this.buildPDFHtml(toc, htmlWithIds);

                    if (exportType === 'pdf') {
                        const pdfData = await this.generatePDFBuffer(fullHtml);
                        if (pdfData) {
                            archive.append(pdfData, { name: file.name.replace(/\.md$/i, '.pdf') });
                        }
                    } else {
                        const mhtContent = this.buildMHTML(toc, htmlWithIds, []);
                        archive.append(mhtContent, { name: file.name.replace(/\.md$/i, '.mht') });
                    }
                }

                await archive.finalize();

                return new Promise((resolve) => {
                    output.on('close', () => resolve({ success: true }));
                    output.on('error', (err: Error) => resolve({ success: false, error: err.message }));
                });
            } catch (err: unknown) {
                const error = err as Error;
                return { success: false, error: error.message };
            }
        });

        this.logger.info(this.ns, 'Handlers registered successfully.');
    }

    // === 辅助方法 ===

    /**
     * 构建 PDF 导出用的 HTML
     */
    private buildPDFHtml(toc: string, content: string): string {
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif; padding: 40px; line-height: 1.6; }
        img { max-width: 100%; height: auto; }
        h1, h2, h3, h4, h5, h6 { page-break-after: avoid; margin-top: 1.5em; }
        pre { background: #f5f5f5; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 13px; }
        code { background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
        pre code { background: none; padding: 0; }
        blockquote { border-left: 4px solid #4f46e5; margin-left: 0; padding-left: 16px; color: #666; background: #f9f9f9; padding: 8px 16px; }
        table { border-collapse: collapse; width: 100%; margin: 1em 0; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background-color: #f5f5f5; font-weight: 600; }
        tr:nth-child(even) { background-color: #fafafa; }
        .toc { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .toc h2 { margin-top: 0; color: #333; }
        .toc ul { list-style: none; padding-left: 0; }
        .toc li { margin: 6px 0; }
        .toc a { color: #4f46e5; text-decoration: none; }
        hr { border: none; border-top: 2px solid #eee; margin: 2em 0; }
    </style>
</head>
<body>
${toc}
${content}
</body>
</html>`;
    }

    /**
     * 构建 MHTML (Word 兼容格式)
     */
    private buildMHTML(toc: string, content: string, imageParts: Array<{ contentId: string; mimeType: string; base64: string }>): string {
        let mhtml = `MIME-Version: 1.0
Content-Type: multipart/related; boundary="----=_NextPart_01"

------=_NextPart_01
Content-Type: text/html; charset="utf-8"
Content-Transfer-Encoding: 8bit

<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
    <style>
        body { font-family: 'Microsoft YaHei', 'SimSun', sans-serif; padding: 20px; line-height: 1.6; }
        img { max-width: 100%; height: auto; }
        pre { background: #f5f5f5; padding: 12px; overflow-x: auto; }
        code { background: #f0f0f0; padding: 2px 6px; }
        pre code { background: none; padding: 0; }
        blockquote { border-left: 4px solid #4f46e5; margin-left: 0; padding-left: 16px; color: #666; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background-color: #f5f5f5; }
        .toc { background: #f8f9fa; padding: 20px; margin-bottom: 20px; }
        .toc h2 { margin-top: 0; }
        .toc ul { list-style: none; padding-left: 0; }
        .toc li { margin: 6px 0; }
        .toc a { color: #4f46e5; text-decoration: none; }
    </style>
</head>
<body>
${toc}
${content}
</body>
</html>
`;
        // 添加图片 MIME 部分
        for (const img of imageParts) {
            mhtml += `
------=_NextPart_01
Content-Type: ${img.mimeType}
Content-Transfer-Encoding: base64
Content-Location: ${img.contentId}

${img.base64}
`;
        }

        mhtml += `------=_NextPart_01--`;
        return mhtml;
    }

    /**
     * 将图片转换为 Base64 Data URI
     */
    private async convertImagesToBase64(html: string, basePath?: string): Promise<string> {
        const imgRegex = /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;
        let result = html;
        let match;

        const matches: Array<{ full: string; src: string }> = [];
        while ((match = imgRegex.exec(html)) !== null) {
            matches.push({ full: match[0], src: match[1] });
        }

        for (const { full, src } of matches) {
            try {
                let imgPath = src;

                if (src.startsWith('local-resource://')) {
                    imgPath = decodeURIComponent(src.replace('local-resource://', '').replace(/^\/+/, ''));
                } else if (!src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:')) {
                    if (basePath) {
                        imgPath = path.join(basePath, src);
                    }
                } else if (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) {
                    continue;
                }

                if (fs.existsSync(imgPath)) {
                    const imgBuffer = await fs.promises.readFile(imgPath);
                    const ext = path.extname(imgPath).toLowerCase().replace('.', '');
                    const mimeType = this.getMimeType(ext);
                    const base64 = imgBuffer.toString('base64');
                    const dataUri = `data:${mimeType};base64,${base64}`;

                    const newImg = full.replace(src, dataUri);
                    result = result.replace(full, newImg);
                }
            } catch (e) {
                this.logger.error(this.ns, 'Failed to convert image:', { src, error: e });
            }
        }

        return result;
    }

    /**
     * 提取图片为 MHTML 格式
     */
    private async extractImagesForMHTML(html: string, basePath?: string): Promise<{
        html: string;
        imageParts: Array<{ contentId: string; mimeType: string; base64: string }>;
    }> {
        const imgRegex = /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;
        let result = html;
        const imageParts: Array<{ contentId: string; mimeType: string; base64: string }> = [];
        let imageIndex = 0;

        const matches: Array<{ full: string; src: string }> = [];
        let match;
        while ((match = imgRegex.exec(html)) !== null) {
            matches.push({ full: match[0], src: match[1] });
        }

        for (const { full, src } of matches) {
            try {
                let imgPath = src;

                if (src.startsWith('local-resource://')) {
                    imgPath = decodeURIComponent(src.replace('local-resource://', '').replace(/^\/+/, ''));
                } else if (!src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:')) {
                    if (basePath) {
                        imgPath = path.join(basePath, src);
                    }
                } else if (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) {
                    continue;
                }

                if (fs.existsSync(imgPath)) {
                    const imgBuffer = await fs.promises.readFile(imgPath);
                    const ext = path.extname(imgPath).toLowerCase().replace('.', '');
                    const mimeType = this.getMimeType(ext);
                    const base64 = imgBuffer.toString('base64');

                    const contentId = `image${imageIndex}.${ext}`;
                    imageParts.push({ contentId, mimeType, base64 });

                    const newImg = full.replace(src, contentId);
                    result = result.replace(full, newImg);
                    imageIndex++;
                }
            } catch (e) {
                this.logger.error(this.ns, 'Failed to extract image for MHTML:', { src, error: e });
            }
        }

        return { html: result, imageParts };
    }

    /**
     * 获取 MIME 类型
     */
    private getMimeType(ext: string): string {
        return MIME_TYPES[ext] || 'image/png';
    }

    /**
     * 生成目录并添加 ID
     */
    private generateTOCAndAddIds(html: string): { toc: string; html: string } {
        const headingRegex = /<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/gi;
        const headings: Array<{ level: number; text: string; id: string; fullMatch: string }> = [];
        let match;
        let index = 0;

        const stripHtml = (str: string) => str.replace(/<[^>]*>/g, '').trim();

        while ((match = headingRegex.exec(html)) !== null) {
            const level = parseInt(match[1]);
            const innerHtml = match[3];
            const text = stripHtml(innerHtml);

            if (!text) continue;

            const textId = text.replace(/[^\w\u4e00-\u9fa5]/g, '-').replace(/-+/g, '-').toLowerCase();
            const id = `heading-${textId}-${index}`;

            headings.push({ level, text, id, fullMatch: match[0] });
            index++;
        }

        if (headings.length === 0) {
            return { toc: '', html };
        }

        let modifiedHtml = html;
        for (const heading of headings) {
            const newHeading = heading.fullMatch.replace(
                new RegExp(`<h${heading.level}([^>]*)>`),
                `<h${heading.level}$1 id="${heading.id}">`
            );
            modifiedHtml = modifiedHtml.replace(heading.fullMatch, newHeading);
        }

        let toc = '<div class="toc"><h2>目录</h2><ul>';
        for (const h of headings) {
            const indent = (h.level - 1) * 20;
            toc += `<li style="padding-left: ${indent}px;"><a href="#${h.id}">${h.text}</a></li>`;
        }
        toc += '</ul></div><hr/>';

        return { toc, html: modifiedHtml };
    }

    /**
     * 生成 PDF Buffer
     */
    private async generatePDFBuffer(html: string): Promise<Buffer | null> {
        let printWindow: BrowserWindow | null = null;
        try {
            printWindow = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false } });
            await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
            await new Promise(resolve => setTimeout(resolve, 500));

            const data = await printWindow.webContents.printToPDF({
                printBackground: true,
                pageSize: 'A4',
                margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 },
                generateDocumentOutline: true,
                generateTaggedPDF: true
            });

            printWindow.close();
            return Buffer.from(data);
        } catch (e) {
            this.logger.error(this.ns, 'Failed to generate PDF:', e);
            if (printWindow) printWindow.close();
            return null;
        }
    }
}
