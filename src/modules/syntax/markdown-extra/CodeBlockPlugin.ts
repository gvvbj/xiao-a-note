import { SquareCode } from 'lucide-react';
import { IPlugin, PluginCategory, IPluginContext } from '@/kernel/system/plugin/types';
import { CoreEvents } from '@/kernel/core/Events';
import hljs from 'highlight.js';
import { sanitizeCodeHTML } from '@/shared/utils/sanitize';

/**
 * 代码块插件 (Core)
 * 
 * 安全加固重构:
 * - 使用本地安装的 highlight.js，不再依赖 CDN
 * - 使用 DOMPurify 消毒高亮输出
 * 
 * 职责：
 * 1. 使用本地 highlight.js 实现语法高亮
 * 2. 提供"插入代码块"工具栏按钮
 * 3. 注入代码块主题 CSS (GitHub Dark)
 */
export default class CodeBlockPlugin implements IPlugin {
    id = 'core-code-block';
    name = 'Code Block & Highlighting';
    version = '1.1.0'; // 版本升级: CDN -> Local
    category = PluginCategory.CORE;
    internal = true;
    readonly order = 30;

    activate(context: IPluginContext) {
        // 1. 注册 Markdown 语法增强 (配置高亮)
        context.registerMarkdownUsage({
            id: 'markdown-it-highlight',
            apply: async (md) => {
                // 使用本地安装的 highlight.js，无需网络请求
                md.set({
                    highlight: (str: string, lang: string) => {
                        if (lang && hljs.getLanguage(lang)) {
                            try {
                                const highlighted = hljs.highlight(str, {
                                    language: lang,
                                    ignoreIllegals: true
                                }).value;
                                // XSS 防护: 消毒高亮输出
                                return '<pre><code class="hljs">' +
                                    sanitizeCodeHTML(highlighted) +
                                    '</code></pre>';
                            } catch (__) {
                                // 高亮失败时静默降级
                            }
                        }
                        // 未知语言时返回空，让 markdown-it 使用默认转义
                        return '';
                    }
                });
            },
            // 使用内联 CSS 替代 CDN 样式
            getCss: () => CODE_BLOCK_THEME_CSS
        });

        // 2. 注册工具栏按钮
        context.registerEditorToolbarItem({
            id: 'insert-code-block',
            label: '代码块',
            icon: SquareCode,
            type: 'button',
            group: 'insert',
            order: 55,
            onClick: () => {
                const codeTemplate = '\n```\n$0\n```\n';
                context.kernel.emit(CoreEvents.EDITOR_INSERT_TEXT, codeTemplate);
            }
        });
    }
}

/**
 * GitHub Dark 主题 CSS (本地化)
 * 
 * 不再依赖 CDN @import，直接内联样式
 * 基于 highlight.js 官方 github-dark 主题
 */
const CODE_BLOCK_THEME_CSS = `
/* GitHub Dark Theme for highlight.js (Inline) */
.hljs {
    color: #c9d1d9;
    background: #0d1117;
}

.hljs-doctag,
.hljs-keyword,
.hljs-meta .hljs-keyword,
.hljs-template-tag,
.hljs-template-variable,
.hljs-type,
.hljs-variable.language_ {
    color: #ff7b72;
}

.hljs-title,
.hljs-title.class_,
.hljs-title.class_.inherited__,
.hljs-title.function_ {
    color: #d2a8ff;
}

.hljs-attr,
.hljs-attribute,
.hljs-literal,
.hljs-meta,
.hljs-number,
.hljs-operator,
.hljs-variable,
.hljs-selector-attr,
.hljs-selector-class,
.hljs-selector-id {
    color: #79c0ff;
}

.hljs-regexp,
.hljs-string,
.hljs-meta .hljs-string {
    color: #a5d6ff;
}

.hljs-built_in,
.hljs-symbol {
    color: #ffa657;
}

.hljs-comment,
.hljs-code,
.hljs-formula {
    color: #8b949e;
}

.hljs-name,
.hljs-quote,
.hljs-selector-tag,
.hljs-selector-pseudo {
    color: #7ee787;
}

.hljs-subst {
    color: #c9d1d9;
}

.hljs-section {
    color: #1f6feb;
    font-weight: bold;
}

.hljs-bullet {
    color: #f2cc60;
}

.hljs-emphasis {
    color: #c9d1d9;
    font-style: italic;
}

.hljs-strong {
    color: #c9d1d9;
    font-weight: bold;
}

.hljs-addition {
    color: #aff5b4;
    background-color: #033a16;
}

.hljs-deletion {
    color: #ffdcd7;
    background-color: #67060c;
}

/* 代码块容器样式 */
.markdown-body pre {
    background-color: #0d1117;
    border-radius: 6px;
    padding: 16px;
    overflow: auto;
}

.markdown-body code {
    font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace;
    font-size: 85%;
}
`;

