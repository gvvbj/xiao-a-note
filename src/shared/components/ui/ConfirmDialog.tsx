import React, { useEffect, useState, useRef } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { UI_CONSTANTS } from '@/shared/constants/UIConstants';
import { cn } from '@/shared/utils';
import { createPortal } from 'react-dom';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmText = "确认",
  cancelText = "取消",
  isDanger = false,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  const [visible, setVisible] = useState(false);
  const [focusedButton, setFocusedButton] = useState<'confirm' | 'cancel'>('confirm');
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      setFocusedButton('confirm');
      setTimeout(() => confirmRef.current?.focus(), UI_CONSTANTS.FOCUS_RESTORE_DELAY_MS);
    } else {
      const timer = setTimeout(() => setVisible(false), UI_CONSTANTS.DIALOG_CLOSE_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // 键盘事件处理
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowRight':
          e.preventDefault();
          setFocusedButton(prev => prev === 'confirm' ? 'cancel' : 'confirm');
          break;
        case 'Enter':
          e.preventDefault();
          if (focusedButton === 'confirm') onConfirm();
          else onCancel();
          break;
        case 'Escape':
          e.preventDefault();
          onCancel();
          break;
        case 'Tab':
          e.preventDefault();
          setFocusedButton(prev => prev === 'confirm' ? 'cancel' : 'confirm');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, focusedButton, onConfirm, onCancel]);

  // 焦点跟随
  useEffect(() => {
    if (!isOpen) return;
    if (focusedButton === 'confirm') confirmRef.current?.focus();
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
          "w-full max-w-sm rounded-xl shadow-2xl overflow-hidden transition-all duration-200 transform",
          "bg-background dark:bg-zinc-900 border border-border dark:border-zinc-700 ring-1 dark:ring-white/10",
          isOpen ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        )}
      >
        <div className="px-6 py-4 border-b border-border/50 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            {isDanger && <AlertTriangle className="w-5 h-5 text-red-500" />}
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
            ref={confirmRef}
            onClick={onConfirm}
            className={cn(
              "px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-all active:scale-95 outline-none",
              isDanger
                ? "bg-red-500 hover:bg-red-600 shadow-red-500/20"
                : "bg-primary hover:bg-primary/90 shadow-primary/20",
              focusedButton === 'confirm' && "ring-2 ring-offset-2 ring-offset-background ring-primary/50"
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

