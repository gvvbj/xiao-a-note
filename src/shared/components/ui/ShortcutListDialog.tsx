import React, { useEffect, useRef, useSyncExternalStore } from 'react';
import { X, Keyboard } from 'lucide-react';
import { UI_CONSTANTS } from '@/shared/constants/UIConstants';
import { cn } from '@/shared/utils';
import { createPortal } from 'react-dom';
import { useKernel } from '@/kernel/core/KernelContext';
import { ServiceId } from '@/kernel/core/ServiceId';
import { ShortcutRegistry, IShortcutItem, ShortcutGroup } from '@/modules/built-in/editor/registries/ShortcutRegistry';

interface ShortcutListDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

/**
 * 分组标题映射
 */
const GROUP_LABELS: Record<ShortcutGroup, string> = {
    file: '文件',
    edit: '编辑',
    view: '视图',
    explorer: '文件管理',
    table: '表格',
    other: '其他',
};

/**
 * 分组显示顺序
 */
const GROUP_ORDER: ShortcutGroup[] = ['file', 'edit', 'view', 'explorer', 'table', 'other'];

/**
 * 从 ShortcutRegistry 读取快捷键并按分组展示
 */
export function ShortcutListDialog({ isOpen, onClose }: ShortcutListDialogProps) {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const kernel = useKernel();
    const registry = kernel.getService<ShortcutRegistry>(ServiceId.SHORTCUT_REGISTRY, false);

    // 订阅 Registry 更新（响应式）
    const items = useSyncExternalStore(
        (cb) => registry?.subscribe(cb) ?? (() => { }),
        () => registry?.getItems() ?? []
    );

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => buttonRef.current?.focus(), UI_CONSTANTS.FOCUS_RESTORE_DELAY_MS);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // 按分组聚合
    const grouped = new Map<ShortcutGroup, IShortcutItem[]>();
    for (const item of items) {
        const group = item.group || 'other';
        if (!grouped.has(group)) grouped.set(group, []);
        grouped.get(group)!.push(item);
    }

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className={cn(
                    "w-full max-w-md rounded-xl shadow-2xl overflow-hidden transition-all duration-200 transform",
                    "bg-background dark:bg-zinc-900 border border-border dark:border-zinc-700 ring-1 dark:ring-white/10",
                    "scale-100 translate-y-0"
                )}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-border/50 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold text-foreground">
                        <Keyboard className="w-5 h-5 text-primary" />
                        快捷键列表
                    </div>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {GROUP_ORDER
                        .filter(g => grouped.has(g))
                        .map(group => (
                            <div key={group} className="mb-4 last:mb-0">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                    {GROUP_LABELS[group]}
                                </h3>
                                <table className="w-full text-sm">
                                    <tbody>
                                        {grouped.get(group)!.map((item) => (
                                            <tr key={item.id} className="border-b border-border/30 last:border-0">
                                                <td className="py-2 pr-4">
                                                    <kbd className="px-2 py-1 bg-muted dark:bg-zinc-800 rounded text-xs font-mono text-foreground border border-border/50">
                                                        {item.keys}
                                                    </kbd>
                                                </td>
                                                <td className="py-2 text-muted-foreground">
                                                    {item.description}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ))
                    }
                    {items.length === 0 && (
                        <p className="text-muted-foreground text-sm text-center py-4">暂无注册的快捷键</p>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-muted/20 dark:bg-black/20 flex justify-end">
                    <button
                        ref={buttonRef}
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg shadow-sm hover:bg-primary/90 transition-all active:scale-95 focus:ring-2 focus:ring-primary/50 outline-none"
                    >
                        关闭
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
