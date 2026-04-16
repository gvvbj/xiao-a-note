/**
 * KeymapPlugin
 * 
 * 遵循 Plugin-First 原则:
 * - 所有全局快捷键逻辑集中在 services/KeymapHandler.ts
 * - 通过事件与其他模块通信
 * - 完全可插拔，禁用后仅影响快捷键功能
 * 
 * 注意：本文件仅负责注册，快捷键处理逻辑在 services/KeymapHandler.ts
 */

import { IPlugin, IPluginContext, PluginCategory } from "@/kernel/system/plugin/types";
import { ServiceId } from '@/kernel/core/ServiceId';
import { LoggerService } from '@/kernel/services/LoggerService';
import { LayoutService } from "@/kernel/services/LayoutService";
import { createGlobalKeyHandler } from './services/KeymapHandler';

export default class KeymapPlugin implements IPlugin {
    id = "keymap";
    name = "全局快捷键";
    version = "1.0.0";
    category = PluginCategory.CORE;
    internal = true;
    essential = true;
    order = 5;

    private cleanup: (() => void) | null = null;
    private logger: any = null;

    activate(context: IPluginContext) {
        const kernel = context.kernel;
        const layoutService = kernel.getService<LayoutService>(ServiceId.LAYOUT);

        // 使用 LoggerService
        const loggerService = kernel.getService<LoggerService>(ServiceId.LOGGER, false);
        this.logger = loggerService?.createLogger('KeymapPlugin');
        this.logger?.info('Activating KeymapPlugin...');

        // 创建键盘处理器 (逻辑已抽离到 services/)
        const handleKeyDown = createGlobalKeyHandler(kernel, layoutService);
        window.addEventListener('keydown', handleKeyDown, { capture: true });

        // 注册快捷键元数据 (供 ShortcutListDialog 展示)
        context.registerShortcuts([
            { id: 'save', keys: 'Ctrl + S', description: '保存文件', group: 'file', order: 10 },
            { id: 'save-as', keys: 'Ctrl + Shift + S', description: '另存为', group: 'file', order: 11 },
            { id: 'new-file', keys: 'Ctrl + N', description: '新建文件', group: 'file', order: 12 },
            { id: 'new-window', keys: 'Ctrl + Shift + N', description: '新建窗口', group: 'file', order: 13 },
            { id: 'open-file', keys: 'Ctrl + O', description: '打开文件', group: 'file', order: 14 },
            { id: 'zen-mode', keys: 'F11', description: '沉浸模式', group: 'view', order: 50 },
            { id: 'exit-zen', keys: 'Escape', description: '退出沉浸模式', group: 'view', order: 51 },
            { id: 'multi-select', keys: 'Ctrl + Click', description: '多选文件', group: 'explorer', order: 60 },
            { id: 'range-select', keys: 'Shift + Click', description: '范围选择', group: 'explorer', order: 61 },
            { id: 'delete-file', keys: 'Delete', description: '删除选中文件', group: 'explorer', order: 62 },
            { id: 'rename-file', keys: 'Enter', description: '重命名选中文件', group: 'explorer', order: 63 },
            { id: 'copy-file', keys: 'Ctrl + C', description: '复制文件', group: 'explorer', order: 64 },
            { id: 'cut-file', keys: 'Ctrl + X', description: '剪切文件', group: 'explorer', order: 65 },
            { id: 'paste-file', keys: 'Ctrl + V', description: '粘贴文件', group: 'explorer', order: 66 },
            { id: 'close-dialog', keys: 'Escape', description: '取消操作/关闭弹窗', group: 'other', order: 90 },
        ]);

        // 保存清理函数
        this.cleanup = () => {
            window.removeEventListener('keydown', handleKeyDown, { capture: true });
        };

        this.logger?.info('KeymapPlugin activated successfully');
    }

    deactivate() {
        this.cleanup?.();
        this.cleanup = null;
        this.logger?.info('KeymapPlugin deactivated');
    }
}

