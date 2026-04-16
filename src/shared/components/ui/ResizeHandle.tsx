import React, { useCallback, useRef, useState } from 'react';
import { cn } from '@/shared/utils';

interface ResizeHandleProps {
    onResize: (delta: number) => void;
    onResizeEnd?: () => void;
    position?: 'left' | 'right';
    className?: string;
}

export function ResizeHandle({
    onResize,
    onResizeEnd,
    position = 'right',
    className
}: ResizeHandleProps) {
    const [isDragging, setIsDragging] = useState(false);
    const startXRef = useRef(0);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        setIsDragging(true);
        startXRef.current = e.clientX;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const delta = position === 'right'
                ? moveEvent.clientX - startXRef.current
                : startXRef.current - moveEvent.clientX;
            startXRef.current = moveEvent.clientX;

            if (delta !== 0) {
                onResize(delta);
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            onResizeEnd?.();
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, [onResize, onResizeEnd, position]);

    return (
        <div
            onMouseDown={handleMouseDown}
            className={cn(
                "absolute top-0 bottom-0 w-2 cursor-col-resize z-30 group",
                "hover:bg-primary/20 transition-colors",
                isDragging && "bg-primary/30",
                position === 'right' ? '-right-1' : '-left-1',
                className
            )}
        >
            {/* 可视化拖拽指示条 */}
            <div className={cn(
                "absolute top-1/2 -translate-y-1/2 w-1 h-12 rounded-full transition-all",
                isDragging ? "bg-primary" : "bg-transparent group-hover:bg-primary/60",
                position === 'right' ? 'right-0.5' : 'left-0.5'
            )} />
        </div>
    );
}
