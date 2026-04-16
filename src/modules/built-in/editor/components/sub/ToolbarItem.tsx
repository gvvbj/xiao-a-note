import React from 'react';
import { cn } from '@/shared/utils';
import { IEditorRef } from '@/modules/built-in/editor/framework/types';

export interface ToolbarItemProps {
    id: string;
    label: string;
    icon: React.ElementType;
    onClick?: (ref: React.MutableRefObject<IEditorRef | null>) => void;
    editorRef: React.MutableRefObject<IEditorRef | null>;
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
                // Prevent focus loss from editor
                e.preventDefault();
            }}
            onClick={() => onClick?.(editorRef)}
            className={cn(
                "p-1.5 rounded transition-colors",
                isActive ? "bg-primary/10 text-primary" : "hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground"
            )}
            title={label}
        >
            <Icon className="w-4 h-4" />
        </button>
    );
};
