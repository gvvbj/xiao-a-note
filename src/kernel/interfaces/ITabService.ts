/**
 * ITabService - 标签页管理服务接口
 * 
 * 核心契约
 * 用于解耦 TabManagerPlugin 与其他消费者 (如 LifecycleService, useEditorLogic)。
 * 
 * 消费者:
 * 1. LifecycleService: 切换文件时更新 Tab 状态
 * 2. PersistenceService: 保存时更新 Tab 内容
 * 3. useEditorLogic: 获取 Tab 内容缓存
 * 4. EditorKernelIntegration: 同步工作区状态
 */

import { CoreEvents } from '../core/Events';

/**
 * EditorTab 类型定义
 */
export interface IEditorTab {
    id: string;         // 唯一标识 (通常是文件路径)
    path: string;       // 文件路径
    name: string;       // 文件名
    isDirty: boolean;   // 是否有未保存的修改
    content?: string;   // 缓存的内容
    cursorPosition?: number;
    scrollTop?: number;
    topLineNumber?: number;
    topOffset?: number;
}

export interface ITabService {
    /**
     * 获取所有标签页
     */
    getTabs(): IEditorTab[];

    /**
     * 获取当前激活的标签页 ID
     */
    getActiveTabId(): string | null;

    /**
     * 设置激活标签页
     */
    setActiveTab(id: string | null): void;

    /**
     * 打开标签页
     */
    openTab(path: string, name: string): void;

    /**
     * 关闭标签页
     */
    closeTab(id: string): void;

    /**
     * 关闭所有标签页
     */
    closeAllTabs(): void;

    /**
     * 设置标签页脏状态
     */
    setTabDirty(id: string, isDirty: boolean): void;

    /**
     * 更新标签页内容
     */
    updateTabContent(id: string, content: string, isDirty?: boolean): void;

    /**
     * 重新排序标签页
     */
    reorderTabs(fromIndex: number, toIndex: number): void;

    /**
     * 更新标签页路径 (重命名/移动文件时)
     */
    updateTabPath(oldPath: string, newPath: string): void;

    /**
     * 设置光标位置和滚动信息
     */
    setTabCursor(id: string, cursorPosition: number, scrollTop: number, topLineNumber?: number, topOffset?: number): void;

    /**
     * 获取单个标签页
     */
    getTab(id: string): IEditorTab | undefined;

    /**
     * 获取标签页内容
     */
    getTabContent(id: string): string | undefined;

    /**
     * 清除标签页内容缓存
     */
    clearTabContent(id: string): void;

    /**
     * 订阅标签页变更事件
     */
    on(event: typeof CoreEvents.TABS_CHANGED, callback: () => void): this;

    /**
     * 取消订阅
     */
    off(event: typeof CoreEvents.TABS_CHANGED, callback: () => void): this;
}
