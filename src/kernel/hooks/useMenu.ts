import { useState, useEffect } from 'react';
import { useKernel } from '../core/KernelContext';
import { ServiceId } from '../core/ServiceId';
import { MenuService, IMenuGroup } from '../services/MenuService';
import { CoreEvents } from '../core/Events';

/**
 * useMenu - 监听菜单变化的 React Hook
 * 
 * 职责:
 * 1. 从内核获取 MenuService
 * 2. 订阅 MENU_UPDATED 事件
 * 3. 自动同步菜单数据到 React 组件
 */
export function useMenu() {
    const kernel = useKernel();
    const menuService = kernel.getService<MenuService>(ServiceId.MENU, false);
    const [menuGroups, setMenuGroups] = useState<IMenuGroup[]>(() => menuService?.getMenuGroups() || []);

    useEffect(() => {
        if (!menuService) return;

        const handleUpdate = () => {
            setMenuGroups([...menuService.getMenuGroups()]);
        };

        menuService.on(CoreEvents.MENU_UPDATED, handleUpdate);
        return () => {
            menuService.off(CoreEvents.MENU_UPDATED, handleUpdate);
        };
    }, [menuService]);

    return {
        menuGroups
    };
}
