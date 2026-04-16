import React, { useState, useEffect, useRef } from 'react';
import { Save, LogOut, X, AlertTriangle } from 'lucide-react';
import { UI_CONSTANTS } from '@/shared/constants/UIConstants';
import { cn } from '@/shared/utils';
import { createPortal } from 'react-dom';

interface SaveConfirmDialogProps {
    isOpen: boolean;
    title: string;
    description: string;
    saveText?: string;
    discardText?: string;
    cancelText?: string;
    onSave: () => void;
    onDontSave: () => void;
    onCancel: () => void;
}

/**
 * 三按钮确认对话框：保存并退出、不保存并退出、取消
 * 支持键盘操作：Enter确认当前焦点，Escape取消，左右键切换焦点
 */
export function SaveConfirmDialog({
    isOpen,
    title,
    description,
    saveText = "保存并退出",
    discardText = "不保存",
    cancelText = "取消",
    onSave,
    onDontSave,
    onCancel
}: SaveConfirmDialogProps) {
    const [visible, setVisible] = useState(false);
    const [focusedButton, setFocusedButton] = useState<'save' | 'discard' | 'cancel'>('save');
    const saveRef = useRef<HTMLButtonElement>(null);
    const discardRef = useRef<HTMLButtonElement>(null);
    const cancelRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (isOpen) {
            setVisible(true);
            setFocusedButton('save');
            setTimeout(() => saveRef.current?.focus(), UI_CONSTANTS.FOCUS_RESTORE_DELAY_MS);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    setFocusedButton(prev => {
                        if (prev === 'save') return 'cancel';
                        if (prev === 'discard') return 'save';
                        return 'discard';
                    });
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    setFocusedButton(prev => {
                        if (prev === 'cancel') return 'save';
                        if (prev === 'save') return 'discard';
                        return 'cancel';
                    });
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (focusedButton === 'save') onSave();
                    else if (focusedButton === 'discard') onDontSave();
                    else onCancel();
                    break;
                case 'Escape':
                    e.preventDefault();
                    onCancel();
                    break;
                case 'Tab':
                    e.preventDefault();
                    setFocusedButton(prev => {
                        if (prev === 'save') return 'discard';
                        if (prev === 'discard') return 'cancel';
                        return 'save';
                    });
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, focusedButton, onSave, onDontSave, onCancel]);

    useEffect(() => {
        if (!isOpen) return;
        if (focusedButton === 'save') saveRef.current?.focus();
        else if (focusedButton === 'discard') discardRef.current?.focus();
        else cancelRef.current?.focus();
    }, [focusedButton, isOpen]);

    if (!visible) return null;

    return createPortal(
        <div className={cn(
            "fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-200",
            isOpen ? "bg-black/60 backdrop-blur-sm opacity-100" : "bg-black/0 opacity-0"
        )}>
            <div
                className={cn(
                    "w-full max-w-md rounded-xl shadow-2xl overflow-hidden transition-all duration-200 transform",
                    "bg-background dark:bg-zinc-900 border border-border dark:border-zinc-700 ring-1 dark:ring-white/10",
                    isOpen ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
                )}
            >
                <div className="px-6 py-4 border-b border-border/50 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold text-foreground">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        {title}
                    </div>
                    <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="px-6 py-4 text-sm text-foreground/80 dark:text-zinc-300 leading-relaxed">
                    {description}
                </div>

                <div className="px-6 py-4 bg-muted/20 dark:bg-black/20 flex justify-end gap-3">
                    <button
                        ref={cancelRef}
                        onClick={onCancel}
                        className={cn(
                            "px-4 py-2 text-sm font-medium text-foreground bg-background border border-border dark:border-zinc-700 dark:bg-zinc-800 rounded-lg hover:bg-accent transition-colors outline-none",
                            focusedButton === 'cancel' && "ring-2 ring-primary/50"
                        )}
                    >
                        {cancelText}
                    </button>
                    <button
                        ref={discardRef}
                        onClick={onDontSave}
                        className={cn(
                            "px-4 py-2 text-sm font-medium text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors outline-none",
                            focusedButton === 'discard' && "ring-2 ring-red-500/50"
                        )}
                    >
                        {discardText}
                    </button>
                    <button
                        ref={saveRef}
                        onClick={onSave}
                        className={cn(
                            "px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-all active:scale-95 outline-none flex items-center gap-2",
                            "bg-primary hover:bg-primary/90 shadow-primary/20",
                            focusedButton === 'save' && "ring-2 ring-offset-2 ring-offset-background ring-primary/50"
                        )}
                    >
                        <Save className="w-4 h-4" />
                        {saveText}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
