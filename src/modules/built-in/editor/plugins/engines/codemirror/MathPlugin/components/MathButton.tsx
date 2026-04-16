import React from 'react';
import { Sigma } from 'lucide-react';
import { createPortal } from 'react-dom';
import { MathPicker } from './MathPicker';
import { Kernel } from '@/kernel/core/Kernel';
import { CoreEvents } from '@/kernel/core/Events';

interface MathButtonProps {
    kernel: Kernel;
}

export const MathButton: React.FC<MathButtonProps> = ({ kernel }) => {
    const [showMath, setShowMath] = React.useState(false);
    const btnRef = React.useRef<HTMLButtonElement>(null);
    const [pos, setPos] = React.useState({ top: 0, left: 0 });

    const toggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setPos({ top: rect.bottom + 5, left: rect.left });
        }
        setShowMath(!showMath);
    };

    return (
        <div className="relative">
            <button
                ref={btnRef}
                onClick={toggle}
                className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors"
                title="插入公式"
            >
                <Sigma className="w-4 h-4" />
            </button>
            {showMath && createPortal(
                <div className="fixed z-[9999]" style={{ top: pos.top, left: pos.left }}>
                    <div className="fixed inset-0" onClick={() => setShowMath(false)} />
                    <div className="relative animate-in fade-in zoom-in-95 duration-200">
                        <MathPicker
                            onSelect={(latex) => {
                                kernel.emit(CoreEvents.EDITOR_INSERT_TEXT, `$ ${latex} $`);
                                setShowMath(false);
                            }}
                        />
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
