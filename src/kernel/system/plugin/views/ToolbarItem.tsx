import React from 'react';
import { cn } from '@/shared/utils';

export interface ToolbarItemProps {
    id: string;
    label: string;
    icon: React.ElementType;
    onClick?: (ref: React.MutableRefObject<any>) => void;
    editorRef: React.MutableRefObject<any>;
    activeStates: Record<string, boolean>;
}

export const ToolbarItem: React.FC<ToolbarItemProps> = ({
    id,
    label,
    icon: Icon,
    onClick,
    editorRef,
    activeStates
}) => {
    const isActive = activeStates[id] || activeStates[label];

    return (
        <button
            onMouseDown={(e) => {
                e.preventDefault();
            }}
            onClick={() => onClick?.(editorRef)}
            className={cn(
                'p-1.5 rounded transition-colors',
                isActive ? 'bg-primary/10 text-primary' : 'hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground'
            )}
            title={label}
        >
            <Icon className="w-4 h-4" />
        </button>
    );
};
