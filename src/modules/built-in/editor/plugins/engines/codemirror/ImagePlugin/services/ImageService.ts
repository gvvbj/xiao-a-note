import { EditorView } from '@codemirror/view';
import { WidgetType } from "@codemirror/view";
import { loggerService } from '@/kernel/services/LoggerService';

const logger = loggerService.createLogger('ImageService');

// === Icon SVGs ===
const COPY_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
const CHECK_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-500"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

/**
 * 转义正则表达式特殊字符
 */
export function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 将图片转换为 PNG 格式
 */
export async function convertToPng(blob: Blob): Promise<Blob> {
    if (blob.type === "image/png") return blob;
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(blob);
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                reject(new Error("Failed to get canvas context"));
                return;
            }
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((result) => {
                URL.revokeObjectURL(url);
                if (result) resolve(result);
                else reject(new Error("Failed to convert to PNG"));
            }, "image/png");
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Failed to load image"));
        };
        img.src = url;
    });
}

/**
 * 图片 Widget - 负责渲染图片预览和编辑控件
 */
export class ImageWidget extends WidgetType {
    constructor(
        readonly src: string,
        readonly alt: string,
        readonly width: string | undefined,
        readonly basePath: string | null,
        private readonly onPreview?: (src: string) => void
    ) {
        super();
    }

    eq(other: ImageWidget) {
        return other.src === this.src &&
            other.alt === this.alt &&
            other.width === this.width &&
            other.basePath === this.basePath &&
            other.onPreview === this.onPreview;
    }

    toDOM(view: EditorView) {
        const container = document.createElement("div");
        container.className = "cm-img-container group relative inline-block";
        container.style.width = this.width ? `${this.width}%` : 'auto';

        let finalSrc = this.src;
        if (!this.src.startsWith('http') && !this.src.startsWith('data:') && !this.src.startsWith('local-resource:')) {
            if (this.basePath) {
                const cleanBasePath = this.basePath.replace(/\\/g, '/');
                const cleanSrc = this.src.replace(/\\/g, '/');
                let fullPath = cleanBasePath.endsWith('/') ? cleanBasePath : cleanBasePath + '/';
                fullPath = (fullPath + cleanSrc.replace(/^\.\//, '')).replace(/([^:])\/\/+/g, '$1/');
                finalSrc = `local-resource:///${encodeURI(fullPath)}`;
            }
        }

        const img = document.createElement("img");
        img.src = finalSrc;
        img.alt = this.alt;
        img.className = "cm-img-widget rounded-md shadow-sm border border-transparent hover:border-primary/50 transition-all";
        img.onload = () => view.requestMeasure();
        img.ondblclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.onPreview?.(finalSrc);
        };

        const toolbar = document.createElement("div");
        toolbar.className = "absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-sm rounded-md p-1 z-10";

        const copyBtn = document.createElement("button");
        copyBtn.className = "p-1 text-white hover:text-green-400 transition-colors rounded cursor-pointer";
        copyBtn.innerHTML = COPY_ICON;
        copyBtn.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            try {
                const response = await fetch(finalSrc);
                let blob = await response.blob();
                if (blob.type !== "image/png") blob = await convertToPng(blob);
                await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
                copyBtn.innerHTML = CHECK_ICON;
                setTimeout(() => copyBtn.innerHTML = COPY_ICON, 1500);
            } catch (err) {
                logger.error('Copy failed', err);
            }
        };

        const resizeWrapper = document.createElement("div");
        resizeWrapper.className = "flex items-center text-white px-1 border-l border-white/20 ml-1";
        const input = document.createElement("input");
        input.type = "text";
        input.className = "w-8 bg-transparent border-none text-right text-xs font-mono focus:outline-none text-white p-0 m-0 h-auto";
        input.value = this.width || "";
        input.placeholder = "auto";
        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                input.blur();
            }
        };
        input.onblur = () => {
            let val = input.value.trim();
            if (val) {
                let num = parseInt(val);
                if (isNaN(num)) num = 100;
                val = Math.max(10, Math.min(100, num)).toString();
            }
            if (val === (this.width || "")) return;

            const pos = view.posAtDOM(container);
            if (pos === -1) return;
            const line = view.state.doc.lineAt(pos);
            const regex = new RegExp(`!\\[${escapeRegExp(this.alt)}(?:\\|\\d+)?\\]\\(${escapeRegExp(this.src)}\\)`);
            const match = regex.exec(line.text);
            if (match) {
                const start = line.from + match.index;
                const newText = `![${this.alt}${val ? '|' + val : ''}](${this.src})`;
                view.dispatch({ changes: { from: start, to: start + match[0].length, insert: newText } });
            }
        };
        input.onmousedown = (e) => e.stopPropagation();

        const unit = document.createElement("span");
        unit.className = "text-[10px] ml-0.5 opacity-70";
        unit.textContent = "%";
        resizeWrapper.append(input, unit);
        toolbar.append(copyBtn, resizeWrapper);
        container.append(img, toolbar);
        return container;
    }
}
