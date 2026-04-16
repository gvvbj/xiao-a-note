import React, { useState, useCallback } from 'react';
import { EditorView } from '@codemirror/view';
import { useKernelEvent } from '@/kernel/hooks/useKernelEvent';
import { CoreEvents } from '@/kernel/core/Events';
import { LinkInputDialog } from './LinkInputDialog';
import { handleLinkCommand } from '../services/LinkCommands';

/**
 * LinkModalContainer - 链接弹窗容器
 * 
 * 通过 registerUI 注册到 EDITOR_MODALS 插槽
 * 监听 TRIGGER_LINK_MODAL 事件控制弹窗显隐
 */
export function LinkModalContainer() {
    const [isOpen, setIsOpen] = useState(false);

    // 监听 TRIGGER_LINK_MODAL 事件
    useKernelEvent(CoreEvents.TRIGGER_LINK_MODAL, () => {
        setIsOpen(true);
    });

    const handleConfirm = useCallback((url: string, text?: string) => {
        // 从 DOM 获取当前活跃的 EditorView
        const cmDom = document.querySelector('.cm-editor');
        const view = cmDom ? EditorView.findFromDOM(cmDom as HTMLElement) : null;
        if (view) {
            handleLinkCommand(view, { url, text });
        }
        setIsOpen(false);
    }, []);

    const handleCancel = useCallback(() => {
        setIsOpen(false);
    }, []);

    return (
        <LinkInputDialog
            isOpen={isOpen}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
        />
    );
}

