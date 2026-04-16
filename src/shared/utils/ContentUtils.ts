/**
 * normalizeMarkdown - 统一处理 Markdown 内容的格式
 * 1. 强制将 Windows 换行符 (\r\n) 转换为标准 Unix 换行符 (\n)
 * 2. 确保内容比对在不同平台间具备一致性
 */
export function normalizeMarkdown(content: string): string {
    if (!content) return '';
    return content.replace(/\r\n/g, '\n');
}
