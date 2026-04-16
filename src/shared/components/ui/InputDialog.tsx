import React, { useEffect, useState, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/shared/utils';
import { createPortal } from 'react-dom';
import { UI_CONSTANTS } from '@/shared/constants/UIConstants';

interface InputDialogProps {
  isOpen: boolean;
  title: string;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function InputDialog({
  isOpen,
  title,
  defaultValue = "",
  placeholder = "",
  confirmText = "确认",
  onConfirm,
  onCancel
}: InputDialogProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      setTimeout(() => inputRef.current?.focus(), UI_CONSTANTS.INPUT_FOCUS_DELAY_MS);
    }
  }, [isOpen, defaultValue]);

  // 全局键盘事件 - Escape 取消
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

  // 处理输入框键盘事件
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (value.trim()) onConfirm(value);
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
          <div className="font-semibold text-foreground">{title}</div>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleInputKeyDown}
            className="w-full px-3 py-2 bg-muted/30 dark:bg-black/40 border border-border dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm text-foreground placeholder:text-muted-foreground/50"
            placeholder={placeholder}
          />
        </div>

        <div className="px-6 py-4 bg-muted/20 dark:bg-black/20 flex justify-end gap-3">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-border dark:border-zinc-700 dark:bg-zinc-800 rounded-lg hover:bg-accent transition-colors focus:ring-2 focus:ring-primary/50 outline-none"
          >
            取消
          </button>
          <button
            ref={confirmRef}
            onClick={() => onConfirm(value)}
            disabled={!value.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg shadow-sm hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-primary/50 outline-none"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

