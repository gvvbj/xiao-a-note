import { useState, useEffect } from 'react';
import { useKernel } from '../core/KernelContext';
import { ServiceId } from '../core/ServiceId';
import { LayoutService, LayoutState } from '../services/LayoutService';
import { CoreEvents } from '../core/Events';

/**
 * useLayout - 监听布局变化的 React Hook
 * 
 * 职责:
 * 1. 从内核获取 LayoutService
 * 2. 订阅 LAYOUT_CHANGED 事件
 * 3. 自动同步服务状态到 React 组件
 */
export function useLayout() {
    const kernel = useKernel();
    const layoutService = kernel.getService<LayoutService>(ServiceId.LAYOUT);
    const [state, setState] = useState<LayoutState>(() => layoutService.getState());

    useEffect(() => {
        const handler = (newState: LayoutState) => {
            setState({ ...newState });
        };
        layoutService.on(CoreEvents.LAYOUT_CHANGED, handler);
        return () => {
            layoutService.off(CoreEvents.LAYOUT_CHANGED, handler);
        };
    }, [layoutService]);

    return {
        ...state,
        toggleSidebar: () => layoutService.toggleSidebar(),
        setSidebarVisible: (v: boolean) => layoutService.setSidebarVisible(v),
        setSidebarWidth: (w: number) => layoutService.setSidebarWidth(w),
        setActiveActivity: (id: string) => layoutService.setActiveActivity(id),
        toggleZenMode: () => layoutService.toggleZenMode(),
        setZenMode: (e: boolean) => layoutService.setZenMode(e)
    };
}
