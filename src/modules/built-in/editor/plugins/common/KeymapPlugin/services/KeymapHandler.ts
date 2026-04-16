import { Kernel } from '@/kernel/core/Kernel';
import { CoreEvents } from '@/kernel/core/Events';
import { LayoutService } from '@/kernel/services/LayoutService';

/**
 * 全局快捷键处理器
 * 负责处理所有全局键盘快捷键
 */
export function createGlobalKeyHandler(
    kernel: Kernel,
    layoutService: LayoutService
): (e: KeyboardEvent) => void {
    return (e: KeyboardEvent) => {
        const ctrl = e.ctrlKey || e.metaKey;
        const shift = e.shiftKey;
        const key = e.key.toLowerCase();
        const { isZenMode } = layoutService.getState();

        // ESC: 退出全屏沉浸模式
        if (e.key === 'Escape' && isZenMode) {
            e.preventDefault();
            layoutService.setZenMode(false);
            return;
        }

        // F11: 切换全屏沉浸模式
        if (e.key === 'F11') {
            e.preventDefault();
            layoutService.setZenMode(!isZenMode);
            return;
        }

        // Ctrl+Shift+N: 新建窗口
        if (ctrl && shift && key === 'n') {
            e.preventDefault();
            window.electronAPI?.newWindow();
            return;
        }

        // Ctrl+N: 新建文件
        if (ctrl && !shift && key === 'n') {
            e.preventDefault();
            e.stopPropagation();
            kernel.emit(CoreEvents.APP_CMD_NEW_FILE);
            return;
        }

        // Ctrl+Shift+S: 另存为
        if (ctrl && shift && key === 's') {
            e.preventDefault();
            kernel.emit(CoreEvents.APP_CMD_SAVE_AS);
            return;
        }

        // Ctrl+S: 保存
        if (ctrl && !shift && key === 's') {
            e.preventDefault();
            kernel.emit(CoreEvents.APP_CMD_SAVE);
            return;
        }

        // Ctrl+O: 打开文件
        if (ctrl && key === 'o') {
            e.preventDefault();
            kernel.emit(CoreEvents.APP_CMD_OPEN_FILE);
            return;
        }
    };
}
