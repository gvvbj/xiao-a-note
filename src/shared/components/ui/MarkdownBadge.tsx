import React from 'react';
import { ArrowDown } from 'lucide-react';
import { cn } from '@/shared/utils';

interface MarkdownBadgeProps {
    className?: string;
}

export const MarkdownBadge = ({ className }: MarkdownBadgeProps) => (
    <div className={cn("relative w-4 h-4 flex items-center justify-center shrink-0", className)}>
        <span className="text-[9px] font-black leading-none tracking-tighter text-blue-500/90 dark:text-blue-400">M</span>
        <ArrowDown className="absolute -right-0.5 -bottom-0.5 w-2 h-2 text-blue-500 dark:text-blue-400 stroke-[3]" />
    </div>
);
