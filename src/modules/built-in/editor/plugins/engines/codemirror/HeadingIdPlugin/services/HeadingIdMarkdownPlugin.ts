/**
 * HeadingIdMarkdownPlugin — markdown-it 标题 ID 插件
 * 
 * 职责：在导出/预览渲染时解析 {#custom-id} 语法，
 * 给生成的 <h> 标签添加 id 属性，并从渲染文本中移除标记。
 * 
 * 遵循原则:
 * - Plugin-First: 通过 MarkdownPluginRegistry 注册
 * - 零硬编码: 正则模式集中定义
 */

import { IMarkdownPlugin } from '@/kernel/registries/MarkdownPluginRegistry';

/** 匹配 {#id} 模式（支持中文等 Unicode 字母，用于 markdown-it token 内容处理） */
const HEADING_ID_PATTERN = /\s*\{#([\w\p{L}-]+)\}\s*$/u;

/**
 * 创建 Heading ID 的 markdown-it 插件实例
 * 
 * 工作原理：
 * 1. 拦截 markdown-it 的 core ruler
 * 2. 扫描所有 heading_open token
 * 3. 从其后的 inline token 中提取 {#id}
 * 4. 将提取的 id 设置到 heading_open 的 attr 上
 * 5. 从 inline 内容中移除 {#id} 标记
 */
export const headingIdMarkdownPlugin: IMarkdownPlugin = {
    id: 'heading-id',
    order: 5,

    apply(md: any): void {
        md.core.ruler.push('heading_id', (state: any) => {
            const tokens = state.tokens;

            for (let i = 0; i < tokens.length; i++) {
                if (tokens[i].type !== 'heading_open') continue;

                // 查找紧随其后的 inline token
                const inlineToken = tokens[i + 1];
                if (!inlineToken || inlineToken.type !== 'inline') continue;

                const match = HEADING_ID_PATTERN.exec(inlineToken.content);
                if (!match) continue;

                const customId = match[1];

                // 设置 id 属性到 heading_open token
                tokens[i].attrSet('id', customId);

                // 从 inline 内容中移除 {#id} 标记
                inlineToken.content = inlineToken.content.replace(HEADING_ID_PATTERN, '');

                // 同时清理 inline 的子 token
                if (inlineToken.children && inlineToken.children.length > 0) {
                    const lastChild = inlineToken.children[inlineToken.children.length - 1];
                    if (lastChild && lastChild.type === 'text') {
                        lastChild.content = lastChild.content.replace(HEADING_ID_PATTERN, '');
                    }
                }
            }
        });
    },

    getPurifyConfig() {
        return {
            ADD_ATTR: ['id'],
        };
    },
};
