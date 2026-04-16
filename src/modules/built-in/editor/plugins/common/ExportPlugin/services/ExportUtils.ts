/**
 * ExportUtils - 导出服务的共享工具函数
 *
 * 提供导出相关的 HTML 模板构建和样式处理工具，
 * 供 ExportService 和 EditorExportService 共用。
 */

/**
 * 智能包裹插件样式
 *
 * 插件的 getCss() 返回内容不统一：
 * - KaTeXPlugin 返回 <link> + <style> HTML 标签
 * - CodeBlockPlugin / TablePlugin 返回纯 CSS 文本
 *
 * 此函数将已有 HTML 标签原样保留，纯 CSS 文本包裹进 <style> 标签
 */
export function wrapPluginStyles(rawStyles: string): string {
    if (!rawStyles.trim()) return '';

    // 提取所有 <link ...> 和 <style>...</style> 以及 <!-- ... --> HTML 块
    const htmlBlockRegex = /(<link[^>]*>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->)/gi;
    const htmlBlocks: string[] = [];

    let match;
    while ((match = htmlBlockRegex.exec(rawStyles)) !== null) {
        htmlBlocks.push(match[0]);
    }

    // 移除已匹配的 HTML 块，剩下的就是纯 CSS
    const remaining = rawStyles.replace(htmlBlockRegex, '').trim();

    const parts: string[] = [];

    // 1. 先输出已有的 HTML 块（<link>, <style>）
    if (htmlBlocks.length > 0) {
        parts.push(htmlBlocks.join('\n'));
    }

    // 2. 纯 CSS 包裹在 <style> 中
    if (remaining) {
        parts.push(`<style>\n${remaining}\n</style>`);
    }

    return parts.join('\n');
}
