import React from 'react';
import { UISlot } from '@/shared/components/ui/UISlot';
import { UISlotId } from '@/kernel/core/Constants';

interface EditorHeaderProps {
    isUnsaved: boolean;
}

/**
 * 编辑器顶部状态栏
 * 展示文件保存状态及插件扩展的操作按钮
 */
export const EditorHeader: React.FC<EditorHeaderProps> = ({
    isUnsaved
}) => {
    return (
        <div className="h-10 border-b border-glass-border flex items-center justify-between px-4 flex-shrink-0 bg-glass-bg/60 backdrop-blur-md z-10">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {isUnsaved && (
                    <span className="text-orange-500 text-[10px] border border-orange-500/30 bg-orange-500/10 px-1.5 py-0.5 rounded">
                        未保存
                    </span>
                )}
            </div>

            <div className="flex items-center gap-1">
                {/* 插件扩展插槽 (包含视图切换、全屏、另存为等按钮) */}
                <UISlot
                    id={UISlotId.EDITOR_HEADER_RIGHT}
                    className="flex items-center gap-1"
                />
            </div>
        </div>
    );
};
