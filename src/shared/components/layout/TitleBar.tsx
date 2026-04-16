import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useKernel, useService } from '@/kernel/core/KernelContext';
import { useTheme } from '@/kernel/hooks/useTheme';
import { useLayout } from '@/kernel/hooks/useLayout';
import { useWorkspace } from '@/kernel/hooks/useWorkspace';
import { useMenu } from '@/kernel/hooks/useMenu';
import { IWindowService } from '@/kernel/interfaces/IWindowService';
import { IFileSystem } from '@/kernel/interfaces/IFileSystem';
import { Minus, Square, X, Sun, Moon } from 'lucide-react';
import { cn } from '@/shared/utils';
import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import { InputDialog } from '@/shared/components/ui/InputDialog';
import { MessageDialog } from '@/shared/components/ui/MessageDialog';
import { SaveConfirmDialog } from '@/shared/components/ui/SaveConfirmDialog';
import { ShortcutListDialog } from '@/shared/components/ui/ShortcutListDialog';
import { SettingsService } from '@/kernel/services/SettingsService';
import logo from '@/assets/logo.svg';

interface ISaveConfirmDialogPayload {
    title: string;
    description: string;
    saveText?: string;
    discardText?: string;
    cancelText?: string;
    onSave: () => void | Promise<void>;
    onDontSave: () => void | Promise<void>;
    onCancel: () => void | Promise<void>;
}

const MenuDropdown = ({ label, items }: { label: string, items: any[] }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const close = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    return (
        <div className="relative no-drag" ref={ref}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "px-2 py-1 text-xs hover:bg-accent/50 rounded transition-colors select-none text-header-foreground",
                    isOpen && "bg-accent/50"
                )}
            >
                {label}
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 w-56 bg-popover backdrop-blur-md border border-border shadow-2xl rounded-md py-1 z-[100] text-xs text-popover-foreground">
                    {items.map((item) => (
                        item.divider ? (
                            <div key={`divider-${item.id}`} className="h-[1px] bg-border/50 my-1" />
                        ) : (
                            <button
                                key={item.id}
                                onClick={() => { item.action?.(); setIsOpen(false); }}
                                className="w-full text-left px-4 py-1.5 hover:bg-primary/10 hover:text-primary flex justify-between items-center transition-colors"
                            >
                                <span>{item.label}</span>
                                {item.shortcut && <span className="text-muted-foreground/50 text-[10px]">{item.shortcut}</span>}
                            </button>
                        )
                    ))}
                </div>
            )}
        </div>
    );
};

export function TitleBar() {
    const kernel = useKernel();
    const windowControl = useService<IWindowService>(ServiceId.WINDOW);
    const settingsService = useService<SettingsService>(ServiceId.SETTINGS);

    const { themeId, themes, setCurrentTheme } = useTheme();
    const { isZenMode } = useLayout();
    const { menuGroups } = useMenu();

    const [autoSaveDialogOpen, setAutoSaveDialogOpen] = useState(false);
    const [shortcutDialogOpen, setShortcutDialogOpen] = useState(false);
    const [messageDialog, setMessageDialog] = useState<{ isOpen: boolean; title: string; message: string; type?: 'info' | 'warning' | 'error' } | null>(null);
    const [saveConfirmDialog, setSaveConfirmDialog] = useState<(ISaveConfirmDialogPayload & { isOpen: boolean }) | null>(null);

    // 监听特定对话框事件 (遵循零硬编码原则，由插件触发)
    useEffect(() => {
        const showAutoSave = () => setAutoSaveDialogOpen(true);
        const showShortcut = () => setShortcutDialogOpen(true);
        const showMessage = (data: any) => setMessageDialog({ isOpen: true, ...data });
        const showSaveConfirm = (data: ISaveConfirmDialogPayload) => setSaveConfirmDialog({ isOpen: true, ...data });

        kernel.on(CoreEvents.APP_SHOW_AUTO_SAVE_DIALOG, showAutoSave);
        kernel.on(CoreEvents.APP_SHOW_SHORTCUT_DIALOG, showShortcut);
        kernel.on(CoreEvents.APP_SHOW_MESSAGE_DIALOG, showMessage);
        kernel.on(CoreEvents.APP_SHOW_SAVE_CONFIRM_DIALOG, showSaveConfirm);

        return () => {
            kernel.off(CoreEvents.APP_SHOW_AUTO_SAVE_DIALOG, showAutoSave);
            kernel.off(CoreEvents.APP_SHOW_SHORTCUT_DIALOG, showShortcut);
            kernel.off(CoreEvents.APP_SHOW_MESSAGE_DIALOG, showMessage);
            kernel.off(CoreEvents.APP_SHOW_SAVE_CONFIRM_DIALOG, showSaveConfirm);
        };
    }, [kernel]);

    const handleToggleTheme = () => {
        kernel.emit(CoreEvents.APP_CMD_TOGGLE_THEME);
    };

    return (
        <>
            <div className="titlebar-drag-region h-8 bg-header text-header-foreground flex items-center justify-between select-none border-b border-border/40">
                <div className="flex items-center px-3 gap-4 h-full">
                    <div className="flex items-center gap-2 no-drag">
                        <img src={logo} alt="logo" className="w-5 h-5 dark:brightness-0 dark:invert" />
                    </div>

                    <div className="flex items-center h-full no-drag">
                        {menuGroups.map(group => (
                            <MenuDropdown key={group.id} label={group.label} items={group.items} />
                        ))}
                    </div>
                </div>

                <div className="flex h-full no-drag">
                    <button onClick={handleToggleTheme} className="w-10 h-full flex items-center justify-center hover:bg-header-foreground/10 transition-colors" title="切换主题">
                        {themes.find(t => t.id === themeId)?.type === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => windowControl?.minimize()} className="w-10 h-full flex items-center justify-center hover:bg-header-foreground/10 transition-colors">
                        <Minus className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => windowControl?.maximize()} className="w-10 h-full flex items-center justify-center hover:bg-header-foreground/10 transition-colors">
                        <Square className="w-3 h-3" />
                    </button>
                    <button onClick={() => windowControl?.close()} className="w-10 h-full flex items-center justify-center hover:bg-red-500 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <InputDialog
                isOpen={autoSaveDialogOpen}
                title="设置自动保存 (分钟)"
                placeholder="输入分钟数，0 为关闭"
                defaultValue={settingsService?.getSetting<number>('app.autoSaveIntervalMinutes', 1).toString() || "1"}
                onConfirm={(val) => {
                    const min = parseFloat(val);
                    if (!isNaN(min)) {
                        const settingId = 'app.autoSaveIntervalMinutes';
                        settingsService?.updateSettings('app', { autoSaveIntervalMinutes: min });
                        kernel.emit(CoreEvents.SETTING_CHANGED, { id: settingId, value: min });
                    }
                    setAutoSaveDialogOpen(false);
                }}
                onCancel={() => setAutoSaveDialogOpen(false)}
            />

            <ShortcutListDialog
                isOpen={shortcutDialogOpen}
                onClose={() => setShortcutDialogOpen(false)}
            />

            {messageDialog && (
                <MessageDialog
                    isOpen={messageDialog.isOpen}
                    title={messageDialog.title}
                    message={messageDialog.message}
                    type={messageDialog.type}
                    onClose={() => setMessageDialog(null)}
                />
            )}

            {saveConfirmDialog && (
                <SaveConfirmDialog
                    isOpen={saveConfirmDialog.isOpen}
                    title={saveConfirmDialog.title}
                    description={saveConfirmDialog.description}
                    saveText={saveConfirmDialog.saveText}
                    discardText={saveConfirmDialog.discardText}
                    cancelText={saveConfirmDialog.cancelText}
                    onSave={async () => {
                        const action = saveConfirmDialog.onSave;
                        setSaveConfirmDialog(null);
                        await action();
                    }}
                    onDontSave={async () => {
                        const action = saveConfirmDialog.onDontSave;
                        setSaveConfirmDialog(null);
                        await action();
                    }}
                    onCancel={async () => {
                        const action = saveConfirmDialog.onCancel;
                        setSaveConfirmDialog(null);
                        await action();
                    }}
                />
            )}

            {/* 标题栏拖拽区域样式 */}
            <style>{`
        .titlebar-drag-region { -webkit-app-region: drag; }
        .titlebar-drag-region .no-drag { -webkit-app-region: no-drag; }
      `}</style>
        </>
    );
}
