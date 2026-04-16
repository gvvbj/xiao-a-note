import React from 'react';
import { ImagePreview } from '@/shared/components/ui/ImagePreview';
import { useKernelEvent } from '@/kernel/hooks/useKernelEvent';
import { CoreEvents } from '@/kernel/core/Events';

/**
 * ImagePreviewModal - 图片预览弹窗组件
 * 由 ImagePlugin 注册到 EDITOR_MODALS 插槽
 */
export const ImagePreviewModal: React.FC = () => {
    const [previewSrc, setPreviewSrc] = React.useState<string | null>(null);

    useKernelEvent(CoreEvents.PREVIEW_IMAGE, (payload: { src: string }) => {
        if (payload?.src) {
            setPreviewSrc(payload.src);
        }
    });

    if (!previewSrc) return null;

    return <ImagePreview src={previewSrc} onClose={() => setPreviewSrc(null)} />;
};
