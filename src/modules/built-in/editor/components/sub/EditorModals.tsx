import React from 'react';
import { UISlot } from '@/shared/components/ui/UISlot';
import { UISlotId } from '@/kernel/core/Constants';

/**
 * EditorModals - 核心弹窗插槽容器
 * 彻底净化，不再包含任何具体业务弹窗
 */
export const EditorModals: React.FC = () => {
    return <UISlot id={UISlotId.EDITOR_MODALS} />;
};
