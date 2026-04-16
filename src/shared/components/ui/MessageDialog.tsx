import React, { useEffect, useRef } from 'react';
import { X, Info, AlertTriangle, AlertCircle } from 'lucide-react';
import { cn } from '@/shared/utils';
import { createPortal } from 'react-dom';

export type MessageType = 'info' | 'warning' | 'error';

interface MessageDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  type?: MessageType;
  onClose: () => void;
}

const iconMap = {
  info: { icon: Info, color: 'text-blue-500' },
  warning: { icon: AlertTriangle, color: 'text-amber-500' },
  error: { icon: AlertCircle, color: 'text-red-500' }
};

export function MessageDialog({
  isOpen,
  title,
  message,
  type = 'info',
  onClose
}: MessageDialogProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { icon: Icon, color } = iconMap[type];

  // 自动聚焦确定按钮
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => buttonRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // 键盘事件处理
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

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className={cn(
          "w-full max-w-sm rounded-xl shadow-2xl overflow-hidden transition-all duration-200 transform",
          "bg-background dark:bg-zinc-900 border border-border dark:border-zinc-700 ring-1 dark:ring-white/10",
          "scale-100 translate-y-0"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/50 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <Icon className={cn("w-5 h-5", color)} />
            {title}
          </div>
          <button 
            onClick={onClose} 
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 text-sm text-foreground/80 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
          {message}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-muted/20 dark:bg-black/20 flex justify-end">
          <button 
            ref={buttonRef}
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg shadow-sm hover:bg-primary/90 transition-all active:scale-95 focus:ring-2 focus:ring-primary/50 outline-none"
          >
            确定
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
