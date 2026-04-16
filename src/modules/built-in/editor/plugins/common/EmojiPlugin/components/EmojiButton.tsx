import React from 'react';
import { Smile } from 'lucide-react';
import { createPortal } from 'react-dom';
import EmojiPicker, { EmojiStyle, Theme } from 'emoji-picker-react';
import { Kernel } from '@/kernel/core/Kernel';
import { CoreEvents } from '@/kernel/core/Events';

interface EmojiButtonProps {
    kernel: Kernel;
}

export const EmojiButton: React.FC<EmojiButtonProps> = ({ kernel }) => {
    const [showEmoji, setShowEmoji] = React.useState(false);
    const btnRef = React.useRef<HTMLButtonElement>(null);
    const [pos, setPos] = React.useState({ top: 0, left: 0 });

    const toggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setPos({ top: rect.bottom + 5, left: rect.left });
        }
        setShowEmoji(!showEmoji);
    };

    return (
        <div className="relative">
            <button
                ref={btnRef}
                onClick={toggle}
                className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors"
                title="插入表情"
            >
                <Smile className="w-4 h-4" />
            </button>
            {showEmoji && createPortal(
                <div className="fixed z-[9999]" style={{ top: pos.top, left: pos.left }}>
                    <div className="fixed inset-0" onClick={() => setShowEmoji(false)} />
                    <div className="relative shadow-2xl border border-border rounded-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <EmojiPicker
                            onEmojiClick={(emojiData) => {
                                kernel.emit(CoreEvents.EDITOR_INSERT_TEXT, emojiData.emoji);
                                setShowEmoji(false);
                            }}
                            autoFocusSearch={false}
                            theme={Theme.AUTO}
                            emojiStyle={EmojiStyle.NATIVE}
                        />
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
