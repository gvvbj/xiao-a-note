/**
 * 链接点击处理器
 * 处理 Ctrl+Click 打开链接的逻辑
 */
import { loggerService } from '@/kernel/services/LoggerService';

export function handleLinkClick(event: MouseEvent): boolean {
    // 如果是 Ctrl + 点击（macOS 为 Meta + 点击）
    if (event.ctrlKey || event.metaKey) {
        const target = event.target as HTMLElement;
        // 检查是否点击了链接文本（由 livePreview.ts 标注的类名）
        const linkEl = target.closest('.cm-link-text');
        if (linkEl) {
            const url = (linkEl as HTMLElement).dataset.url;
            if (url) {
                loggerService.createLogger('PreviewPlugin').info(`Opening link via shell: ${url}`);
                // 使用 IPC 调用系统浏览器，并显式激活
                if (window.electronAPI?.openExternal) {
                    window.electronAPI.openExternal(url);
                } else {
                    window.open(url, '_blank');
                }
                event.preventDefault();
                event.stopPropagation();
                return true; // 阻止默认行为
            }
        }
    }
    return false;
}
