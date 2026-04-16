import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/shared/utils';
import { createPortal } from 'react-dom';
import { UI_CONSTANTS } from '@/shared/constants/UIConstants';

interface LinkInputDialogProps {
    isOpen: boolean;
    onConfirm: (url: string, text?: string) => void;
    onCancel: () => void;
}

/**
 * 链接输入对话框
 * 
 * 提供 URL 和链接文字两个输入框
 * 按 Enter 确认，Escape 取消
 */
export function LinkInputDialog({
    isOpen,
    onConfirm,
    onCancel
}: LinkInputDialogProps) {
    const [url, setUrl] = useState('https://');
    const [text, setText] = useState('');
    const urlInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setUrl('https://');
            setText('');
            setTimeout(() => urlInputRef.current?.focus(), UI_CONSTANTS.INPUT_FOCUS_DELAY_MS);
        }
    }, [isOpen]);

    // Escape 关闭
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onCancel();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onCancel]);

    const handleConfirm = () => {
        const trimmedUrl = url.trim();
        if (trimmedUrl && trimmedUrl !== 'https://') {
            onConfirm(trimmedUrl, text.trim() || undefined);
            onCancel();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleConfirm();
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={cn(
                "w-full max-w-sm rounded-xl shadow-2xl overflow-hidden transition-all duration-200 transform",
                "bg-background dark:bg-zinc-900 border border-border dark:border-zinc-700 ring-1 dark:ring-white/10",
                isOpen ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
            )}>

                <div className="px-6 py-4 border-b border-border/50 dark:border-white/5 flex items-center justify-between">
                    <div className="font-semibold text-foreground">插入链接</div>
                    <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs text-muted-foreground mb-1.5">链接地址</label>
                        <input
                            ref={urlInputRef}
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="w-full px-3 py-2 bg-muted/30 dark:bg-black/40 border border-border dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm text-foreground placeholder:text-muted-foreground/50"
                            placeholder="https://example.com"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-muted-foreground mb-1.5">显示文字（可选）</label>
                        <input
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="w-full px-3 py-2 bg-muted/30 dark:bg-black/40 border border-border dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm text-foreground placeholder:text-muted-foreground/50"
                            placeholder="留空则使用选中文字或 URL"
                        />
                    </div>
                </div>

                <div className="px-6 py-4 bg-muted/20 dark:bg-black/20 flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-border dark:border-zinc-700 dark:bg-zinc-800 rounded-lg hover:bg-accent transition-colors focus:ring-2 focus:ring-primary/50 outline-none"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!url.trim() || url.trim() === 'https://'}
                        className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg shadow-sm hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-primary/50 outline-none"
                    >
                        插入
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
