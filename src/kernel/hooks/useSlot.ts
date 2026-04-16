import { useState } from 'react';
import { useKernel } from '../core/KernelContext';
import { useKernelEvent } from './useKernelEvent';
import { IUIComponent } from '../core/Kernel';
import { CoreEvents } from '../core/Events';
import { UISlotId } from '../core/Constants';

/**
 * useSlot Hook
 * 
 * 监听指定 UI Slot 的变化，并返回当前注册在该 Slot 的组件列表。
 * 替代原 KernelContext 中的简易实现。
 */
export function useSlot(slotId: UISlotId) {
    const kernel = useKernel();
    const [components, setComponents] = useState<IUIComponent[]>(() => kernel.getUI(slotId));

    useKernelEvent(CoreEvents.UI_UPDATED, (updatedSlot: UISlotId) => {
        if (updatedSlot === slotId) {
            setComponents([...kernel.getUI(slotId)]);
        }
    });

    return components;
}
