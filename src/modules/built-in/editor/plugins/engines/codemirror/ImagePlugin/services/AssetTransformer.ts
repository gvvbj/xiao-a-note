/**
 * AssetTransformer - 图片资产转换器
 * 
 * 从 NoteService 迁移的资产处理逻辑
 * 
 * 职责:
 * 1. 检测 Markdown 内容中的临时图片链接 (local-resource://)
 * 2. 将临时图片复制到文件旁边的 assets/ 目录
 * 3. 替换链接为相对路径
 */

import { Kernel } from '@/kernel/core/Kernel';
import { ServiceId } from '@/kernel/core/ServiceId';
import { IFileSystem } from '@/kernel/interfaces/IFileSystem';
import { EDITOR_CONSTANTS } from '../../../../../constants/EditorConstants';
import { loggerService } from '@/kernel/services/LoggerService';

const logger = loggerService.createLogger('AssetTransformer');

export interface TransformResult {
    content: string;
    replacements: Array<{ oldText: string; newText: string }>;
}

export class AssetTransformer {
    private kernel: Kernel;

    constructor(kernel: Kernel) {
        this.kernel = kernel;
    }

    private get fileSystem(): IFileSystem | undefined {
        return this.kernel.getService<IFileSystem>(ServiceId.FILE_SYSTEM, false);
    }

    /**
     * 转换内容中的临时资源链接
     */
    async transform(content: string, targetPath: string): Promise<TransformResult> {
        const replacements: Array<{ oldText: string; newText: string }> = [];

        if (!this.fileSystem) {
            return { content, replacements };
        }

        // 快速路径：如果内容不包含临时资源链接，直接返回
        if (!content.includes('local-resource://')) {
            return { content, replacements };
        }

        let processedContent = content;
        const saveDir = await this.fileSystem.getDirname(targetPath);
        const assetsDir = await this.fileSystem.pathJoin(saveDir, EDITOR_CONSTANTS.ASSETS_DIR);

        // 匹配临时图片链接
        const tempImgRegex = /!\[(.*?)\]\(local-resource:\/\/\/(.*?temp_images.*?)\)/g;
        const matches = [...processedContent.matchAll(tempImgRegex)];

        if (matches.length > 0) {
            for (const match of matches) {
                const fullMatch = match[0];
                const altText = match[1];
                const srcPath = match[2];

                const fileName = srcPath.split(/[\\/]/).pop() || `${EDITOR_CONSTANTS.DEFAULT_IMG_PREFIX}${Date.now()}.png`;
                const destPath = await this.fileSystem.pathJoin(assetsDir, fileName);

                try {
                    const copyRes = await this.fileSystem.copy(srcPath, destPath);
                    if (copyRes.success) {
                        const newText = `![${altText}](${EDITOR_CONSTANTS.ASSETS_DIR}/${fileName})`;
                        processedContent = processedContent.split(fullMatch).join(newText);
                        replacements.push({ oldText: fullMatch, newText });
                    }
                } catch (err) {
                    logger.error(`Migration failed: ${srcPath}`, err);
                }
            }
        }

        return { content: processedContent, replacements };
    }
}
