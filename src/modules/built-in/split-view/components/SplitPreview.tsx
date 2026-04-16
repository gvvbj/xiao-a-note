import React, { useCallback } from 'react';
import { useKernel } from '@/kernel/core/KernelContext';
import { ServiceId } from '@/kernel/core/ServiceId';
import { SplitViewService } from '../services/SplitViewService';
import { useEditor } from '@/kernel/hooks/useEditor';
import { EditorView } from '@codemirror/view';
import { CoreEvents } from '@/kernel/core/Events';
import { ISplitPreviewHost, SPLIT_PREVIEW_HOST_SERVICE_ID } from '@/modules/interfaces';

export const SplitPreview: React.FC = () => {
    const kernel = useKernel();
    const splitViewService = kernel.getService<SplitViewService>(ServiceId.SPLIT_VIEW);
    const splitPreviewHost = kernel.getService<ISplitPreviewHost>(SPLIT_PREVIEW_HOST_SERVICE_ID, false);
    const { headingNumbering, currentFileId } = useEditor();
    const PreviewEditorComponent = splitPreviewHost?.PreviewEditorComponent;

    /**
     * [关键修复] 通过 onViewReady 回调正确注册 previewView
     *
     * 旧逻辑使用 useEffect([splitViewService])，在 CM view 尚未挂载时执行（拿到 null）。
     * 新逻辑在 editor 宿主组件内部 view 创建完成后触发回调，
     * 确保 SplitViewService 拿到真实的 EditorView 实例。
     */
    const handleViewReady = useCallback((view: EditorView, currentContent: string) => {
        if (!splitViewService) return;

        // 1. 注册 previewView 到 SplitViewService
        splitViewService.setPreviewView(view);

        // 2. 发射事件，通知潜在的监听者（Plugin-First 原则）
        kernel.emit(CoreEvents.PREVIEW_VIEW_READY, view);

        // 3. 首次同步：把主编辑器的当前内容同步到右侧
        if (currentContent) {
            splitViewService.syncContent(currentContent, true);
        }
    }, [splitViewService, kernel]);

    if (!splitViewService || !PreviewEditorComponent) return null;

    return (
        <div className={`flex flex-col flex-1 min-h-0 border-l border-border/30 overflow-hidden relative ${headingNumbering ? 'show-heading-numbering' : ''}`}>
            <PreviewEditorComponent
                headingNumbering={!!headingNumbering}
                currentFileId={currentFileId}
                onViewReady={handleViewReady}
            />
        </div>
    );
};
