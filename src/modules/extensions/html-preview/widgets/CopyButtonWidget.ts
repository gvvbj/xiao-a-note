import { WidgetType } from "@codemirror/view";

/**
 * 源码态专用复制按钮挂件
 * 职责：仅在源码模式下显示，提供一键复制功能和切回预览功能，带视觉反馈
 */
export class CopyButtonWidget extends WidgetType {
    constructor(
        private readonly code: string,
        private readonly pos: number, // 显式接收位置信息
        private readonly onSetMode?: (pos: number, mode: string) => void
    ) {
        super();
    }

    toDOM() {
        const wrapper = document.createElement("div");
        wrapper.className = "cm-code-copy-wrapper";
        wrapper.style.cssText = `
            position: absolute; right: 28px; top: 4px; z-index: 100;
            display: flex; align-items: center; gap: 8px;
        `;

        // 按钮容器，方便统一样式
        const createBtn = (icon: string, label: string) => {
            const btn = document.createElement("button");
            btn.innerHTML = `<span>${icon}</span> ${label}`;
            btn.style.cssText = `
                border: 1px solid #ddd; background: #fff; border-radius: 4px;
                font-size: 11px; padding: 2px 6px; cursor: pointer; color: #666;
                display: flex; align-items: center; gap: 4px; transition: all 0.2s;
                box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            `;
            btn.onmouseover = () => { btn.style.background = "#f5f5f5"; };
            btn.onmouseout = () => { btn.style.background = "#fff"; };
            return btn;
        };

        // 按钮 1: 复制按钮
        const copyBtn = createBtn("📋", "Copy");
        copyBtn.onmousedown = (e) => {
            e.preventDefault();
            navigator.clipboard.writeText(this.code).then(() => {
                copyBtn.innerHTML = "<span>✅</span> Copied!";
                copyBtn.style.borderColor = "#4caf50";
                copyBtn.style.color = "#4caf50";
                setTimeout(() => {
                    copyBtn.innerHTML = "<span>📋</span> Copy";
                    copyBtn.style.borderColor = "#ddd";
                    copyBtn.style.color = "#666";
                }, 2000);
            });
        };
        wrapper.appendChild(copyBtn);

        // 按钮 2: 切回预览按钮
        const previewBtn = createBtn("🖼️", "Preview");
        previewBtn.onmousedown = (e) => {
            e.preventDefault();
            this.onSetMode?.(this.pos, 'preview');
        };
        wrapper.appendChild(previewBtn);

        return wrapper;
    }

    ignoreEvent() { return true; }
}
