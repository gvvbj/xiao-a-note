/**
 * AuthDialog — 插件授权弹窗组件
 *
 * 当第三方插件请求权限提升时显示。
 * 三按钮设计：拒绝 / 允许(本次) / 始终允许
 */

import React, { useEffect, useRef } from 'react';
import { ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';
import { cn } from '@/shared/utils';
import { createPortal } from 'react-dom';

export interface AuthDialogProps {
    isOpen: boolean;
    pluginId: string;
    pluginName: string;
    pluginVersion: string;
    reason?: string;
    onDecision: (decision: 'allow' | 'deny' | 'always-allow') => void;
}

export function AuthDialog({
    isOpen,
    pluginId,
    pluginName,
    pluginVersion,
    reason,
    onDecision
}: AuthDialogProps) {
    const denyRef = useRef<HTMLButtonElement>(null);

    // 自动聚焦到"拒绝"按钮（安全默认值）
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => denyRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Escape 键 = 拒绝
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onDecision('deny');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onDecision]);

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => onDecision('deny')}
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
                <div className="px-6 py-4 border-b border-border/50 dark:border-white/5 flex items-center gap-3">
                    <ShieldAlert className="w-6 h-6 text-amber-500 flex-shrink-0" />
                    <div>
                        <h3 className="font-semibold text-foreground text-base">
                            插件权限请求
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            安全审核 — 需要您的授权
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div className="px-6 py-4 space-y-3">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 dark:bg-white/5">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                                {pluginName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {pluginId} · v{pluginVersion}
                            </p>
                        </div>
                    </div>

                    <p className="text-sm text-foreground/80 dark:text-zinc-300 leading-relaxed">
                        此插件请求 <strong className="text-amber-600 dark:text-amber-400">完整系统权限</strong>，
                        包括访问文件系统、编辑器核心 API 和内部服务。
                    </p>

                    {reason && (
                        <p className="text-xs text-muted-foreground italic border-l-2 border-amber-500/50 pl-3">
                            请求原因：{reason}
                        </p>
                    )}

                    <div className="text-xs text-muted-foreground/70 p-2 rounded bg-red-500/5 dark:bg-red-500/10 border border-red-500/10">
                        ⚠️ 仅对您信任的插件授予完整权限。恶意插件可能修改或删除文件。
                    </div>
                </div>

                {/* Actions */}
                <div className="px-6 py-4 bg-muted/20 dark:bg-black/20 flex items-center justify-end gap-2">
                    <button
                        ref={denyRef}
                        onClick={() => onDecision('deny')}
                        className={cn(
                            "px-4 py-2 text-sm font-medium rounded-lg transition-all active:scale-95 outline-none",
                            "text-foreground bg-muted/50 hover:bg-muted border border-border",
                            "focus:ring-2 focus:ring-border/50"
                        )}
                    >
                        <span className="flex items-center gap-1.5">
                            <ShieldX className="w-3.5 h-3.5" />
                            拒绝
                        </span>
                    </button>
                    <button
                        onClick={() => onDecision('allow')}
                        className={cn(
                            "px-4 py-2 text-sm font-medium rounded-lg transition-all active:scale-95 outline-none",
                            "text-white bg-amber-600 hover:bg-amber-500 shadow-sm",
                            "focus:ring-2 focus:ring-amber-500/50"
                        )}
                    >
                        <span className="flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            允许（本次）
                        </span>
                    </button>
                    <button
                        onClick={() => onDecision('always-allow')}
                        className={cn(
                            "px-4 py-2 text-sm font-medium rounded-lg transition-all active:scale-95 outline-none",
                            "text-white bg-primary hover:bg-primary/90 shadow-sm",
                            "focus:ring-2 focus:ring-primary/50"
                        )}
                    >
                        <span className="flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            始终允许
                        </span>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
