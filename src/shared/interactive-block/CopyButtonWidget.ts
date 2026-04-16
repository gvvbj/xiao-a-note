/**
 * CopyButtonWidget - 通用源码复制按钮
 *
 * 从 HTML Preview 插件的 CopyButtonWidget 泛化而来。
 * 在源码态为代码块提供 一键复制 + 切回预览 的操作按钮。
 *
 * 重要：此 Widget 使用 block: true 模式渲染，作为独立行显示在代码块上方。
 * 不使用 position: absolute，避免在 CodeMirror 行内 widget 中的定位问题。
 */

import { ICopyButtonConfig, BlockMode } from './types';
import { EngineWidgetType } from '@/modules/built-in/editor/engines/codemirror/WidgetBridge';

/**
 * 通用源码操作栏 Widget
 * 显示在代码块上方，提供复制和切回预览功能
 */
export class CopyButtonWidget extends EngineWidgetType {
    private readonly code: string;
    private readonly pos: number;
    private readonly onSetMode?: (pos: number, mode: BlockMode) => void;

    constructor(config: ICopyButtonConfig) {
        super();
        this.code = config.code;
        this.pos = config.pos;
        this.onSetMode = config.onSetMode;
    }

    eq(other: CopyButtonWidget) {
        return other.code === this.code && other.pos === this.pos;
    }

    toDOM() {
        const toolbar = document.createElement('div');
        toolbar.className = 'interactive-block-source-toolbar';

        // 辅助函数：创建按钮
        const createBtn = (icon: string, label: string, cls: string): HTMLButtonElement => {
            const btn = document.createElement('button');
            btn.innerHTML = `<span>${icon}</span> ${label}`;
            btn.className = `source-toolbar-btn ${cls}`;
            return btn;
        };

        // 按钮 1: 复制按钮
        const copyBtn = createBtn('📋', 'Copy', 'copy-btn');
        copyBtn.onmousedown = (e) => {
            e.preventDefault();
            navigator.clipboard.writeText(this.code).then(() => {
                copyBtn.innerHTML = '<span>✅</span> Copied!';
                copyBtn.classList.add('success');
                setTimeout(() => {
                    copyBtn.innerHTML = '<span>📋</span> Copy';
                    copyBtn.classList.remove('success');
                }, 2000);
            });
        };
        toolbar.appendChild(copyBtn);

        // 按钮 2: 切回预览按钮（仅在有回调时显示）
        if (this.onSetMode) {
            const previewBtn = createBtn('🖼️', 'Preview', 'preview-btn');
            previewBtn.onmousedown = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.onSetMode?.(this.pos, 'preview');
            };
            toolbar.appendChild(previewBtn);
        }

        return toolbar;
    }

    ignoreEvent() { return true; }
}

/**
 * 源码操作栏样式
 */
export const COPY_BUTTON_STYLES = `
    .interactive-block-source-toolbar {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 8px;
        background: var(--toolbar-bg, #f8f9fa);
        border: 1px solid var(--border-color, #e0e0e0);
        border-bottom: none;
        border-radius: 6px 6px 0 0;
        user-select: none;
    }
    .source-toolbar-btn {
        border: 1px solid var(--border-color, #ddd);
        background: var(--btn-bg, #fff);
        border-radius: 4px;
        font-size: 11px;
        padding: 3px 8px;
        cursor: pointer;
        color: var(--text-color, #666);
        display: flex;
        align-items: center;
        gap: 4px;
        transition: all 0.2s;
    }
    .source-toolbar-btn:hover {
        background: var(--hover-bg, #e8e8e8);
        border-color: var(--hover-border, #ccc);
    }
    .source-toolbar-btn.preview-btn {
        color: var(--primary-color, #007acc);
        border-color: var(--primary-color, #007acc);
    }
    .source-toolbar-btn.preview-btn:hover {
        background: rgba(0, 122, 204, 0.1);
    }
    .source-toolbar-btn.success {
        color: #4caf50;
        border-color: #4caf50;
    }
`;
