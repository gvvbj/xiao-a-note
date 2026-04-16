import React, { useState, useEffect, useRef } from 'react';
import { FileText, Download, X, AlertCircle } from 'lucide-react';
import { UI_CONSTANTS } from '@/shared/constants/UIConstants';
import { cn } from '@/shared/utils';

interface SaveAsDialogProps {
    isOpen: boolean;
    defaultFileName: string;
    onConfirm: (fileName: string, format: 'md' | 'pdf' | 'mht') => void;
    onCancel: () => void;
}

export function SaveAsDialog({ isOpen, defaultFileName, onConfirm, onCancel }: SaveAsDialogProps) {
    const [fileName, setFileName] = useState(defaultFileName);
    const [format, setFormat] = useState<'md' | 'pdf' | 'mht'>('md');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            // 去掉原扩展名
            const baseName = defaultFileName.replace(/\.(md|pdf|mht|doc|docx)$/i, '');
            setFileName(baseName);
            setFormat('md');
            setTimeout(() => inputRef.current?.focus(), UI_CONSTANTS.INPUT_FOCUS_DELAY_MS);
        }
    }, [isOpen, defaultFileName]);

    const handleConfirm = () => {
        if (fileName.trim()) {
            onConfirm(fileName.trim(), format);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleConfirm();
        } else if (e.key === 'Escape') {
            onCancel();
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={(e) => {
                if (e.target === e.currentTarget) onCancel();
            }}
        >
            <div
                className="bg-background border border-border/60 rounded-xl shadow-2xl p-6 w-[420px] max-w-[90vw]"
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-lg font-semibold mb-4">另存为</h2>

                {/* 文件名输入 */}
                <div className="mb-4">
                    <label className="text-sm text-muted-foreground block mb-2">文件名</label>
                    <input
                        ref={inputRef}
                        type="text"
                        value={fileName}
                        onChange={(e) => setFileName(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="输入文件名"
                    />
                </div>

                {/* 格式选择 */}
                <div className="mb-6">
                    <label className="text-sm text-muted-foreground block mb-2">保存格式</label>
                    <div className="flex gap-2">
                        {[
                            { value: 'md', label: 'Markdown (.md)' },
                            { value: 'pdf', label: 'PDF (.pdf)' },
                            { value: 'mht', label: 'Word (.mht)' },
                        ].map((option) => (
                            <button
                                key={option.value}
                                onClick={() => setFormat(option.value as 'md' | 'pdf' | 'mht')}
                                className={cn(
                                    'flex-1 px-3 py-2 text-sm rounded-md border transition-all',
                                    format === option.value
                                        ? 'border-primary bg-primary/10 text-primary font-medium'
                                        : 'border-border text-muted-foreground hover:bg-muted'
                                )}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 按钮 */}
                <div className="flex gap-2 justify-end">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted transition-colors"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        保存
                    </button>
                </div>
            </div>
        </div>
    );
}
