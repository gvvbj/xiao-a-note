import { normalizeMarkdown } from '@/shared/utils/ContentUtils';

/**
 * ContentService - 内置通用内容处理服务
 * 负责提供跨插件的文本标准化、内容比对等工具逻辑
 */
export class ContentService {
    /**
     * 统一处理 Markdown 内容的格式 (Unix 换行)
     */
    normalize(content: string): string {
        return normalizeMarkdown(content);
    }

    /**
     * 比对两个内容在标准化后是否相同
     */
    isEqual(a: string, b: string): boolean {
        return this.normalize(a) === this.normalize(b);
    }
}
