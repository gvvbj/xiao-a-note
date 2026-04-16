import { EventEmitter } from 'eventemitter3';
import { CoreEvents } from '../core/Events';

/**
 * 菜单项定义
 * 所有菜单必须通过注册接口添加，严禁硬编码
 */
export interface IMenuItem {
    id: string;
    label: string;
    action?: () => void;
    shortcut?: string;
    divider?: boolean;
    order?: number;
}

/**
 * 顶级菜单定义
 */
export interface IMenuGroup {
    id: string;
    label: string;
    order?: number;
    items: IMenuItem[];
}

/**
 * MenuService - 动态菜单管理服务
 * 
 * 遵循 Plugin-First 原则：
 * - 所有菜单项通过 registerMenuItem 动态注册
 * - 0 硬编码：服务本身不包含任何菜单定义
 */
export class MenuService extends EventEmitter {
    private menuGroups = new Map<string, IMenuGroup>();

    /**
     * 注册一个顶级菜单组
     */
    registerMenuGroup(group: Omit<IMenuGroup, 'items'> & { items?: IMenuItem[] }): () => void {
        const existing = this.menuGroups.get(group.id);
        this.menuGroups.set(group.id, {
            ...group,
            items: existing?.items || group.items || [],
            order: group.order ?? 100
        });
        this.emit(CoreEvents.MENU_UPDATED);
        return () => this.unregisterMenuGroup(group.id);
    }

    /**
     * 注册菜单项到指定菜单组
     */
    registerMenuItem(groupId: string, item: IMenuItem): () => void {
        const group = this.menuGroups.get(groupId);
        if (!group) {
            // 如果组不存在，自动创建
            this.menuGroups.set(groupId, {
                id: groupId,
                label: groupId,
                items: [{ order: 100, ...item }]
            });
        } else {
            const existingIndex = group.items.findIndex(i => i.id === item.id);
            const newItem = { order: 100, ...item };
            if (existingIndex >= 0) {
                group.items[existingIndex] = newItem;
            } else {
                group.items.push(newItem);
            }
            group.items.sort((a, b) => (a.order || 100) - (b.order || 100));
        }
        this.emit(CoreEvents.MENU_UPDATED);
        return () => this.unregisterMenuItem(groupId, item.id);
    }

    /**
     * 获取所有菜单组（已排序）
     */
    getMenuGroups(): IMenuGroup[] {
        return Array.from(this.menuGroups.values())
            .sort((a, b) => (a.order || 100) - (b.order || 100));
    }

    /**
     * 注销菜单组
     */
    unregisterMenuGroup(groupId: string): void {
        if (this.menuGroups.delete(groupId)) {
            this.emit(CoreEvents.MENU_UPDATED);
        }
    }

    /**
     * 注销菜单项
     */
    unregisterMenuItem(groupId: string, itemId: string): void {
        const group = this.menuGroups.get(groupId);
        if (group) {
            group.items = group.items.filter(i => i.id !== itemId);
            this.emit(CoreEvents.MENU_UPDATED);
        }
    }
}
