/**
 * IMarkdownService.ts
 * 
 * 定义 Markdown 解析服务的接口。
 * 允许通过插件替换底层的解析引擎（如从 marked 切换到 markdown-it）。
 */
export interface IMarkdownService {
    /**
     * 将 Markdown 文本转换为 HTML 字符串
     * @param content Markdown 原始文本
     * @returns 渲染后的 HTML 字符串
     */
    render(content: string): Promise<string>;

    /**
     * 将 Markdown 行内文本转换为 HTML 字符串（不包裹 p 标签）
     * @param content Markdown 行内文本
     */
    renderInline(content: string): string;

    /**
     * 获取当前解析器的名称（用于调试或 UI 显示）
     */
    readonly name: string;

    /**
     * 可选：获取插件要求的全局样式 (用于导出)
     */
    getRequiredStyles?(): string;

    /**
     * 可选：获取插件要求的净化配置 (用于导出)
     */
    getRequiredPurifyConfig?(): { ADD_TAGS?: string[], ADD_ATTR?: string[] };
}
