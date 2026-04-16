import React from 'react';
import { IEditorRef } from '../framework/types';

/**
 * 工具栏项 definition
 */
export interface IEditorToolbarItem {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    /** 工具栏项的类型，可以是按钮或自定义组件 */
    type: 'button' | 'custom';
    /** 渲染函数（如果是 custom 类型） */
    render?: (props: { editorRef: React.MutableRefObject<IEditorRef | null>, activeStates: Record<string, boolean> }) => React.ReactNode;
    /** 点击回调（如果是 button 类型） */
    onClick?: (editorRef: React.MutableRefObject<IEditorRef | null>) => void;
    /** 快捷键（可选） */
    shortcut?: string;
    /** 排序权重，小的在前 */
    order?: number;
    /** 分组标识 */
    group?: 'basic' | 'insert' | 'history' | 'other';
}

/**
 * 编辑器工具栏注册表
 * 允许内置功能和第三方插件向工具栏添加按钮或组件
 */
export class EditorToolbarRegistry {
    private items: IEditorToolbarItem[] = [];
    private listeners: (() => void)[] = [];

    /**
     * 注册工具栏项
     * @returns 清理函数
     */
    registerItem(item: IEditorToolbarItem): () => void {
        const newItem: IEditorToolbarItem = {
            order: 100,
            group: 'other',
            ...item
        };

        this.items.push(newItem);
        this.items.sort((a, b) => (a.order || 0) - (b.order || 0));
        this.notify();

        return () => {
            this.items = this.items.filter(i => i.id !== item.id);
            this.notify();
        };
    }

    /**
     * 获取所有注册项
     */
    getItems(): IEditorToolbarItem[] {
        return [...this.items];
    }

    /**
     * 订阅更新
     */
    subscribe(listener: () => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notify() {
        this.listeners.forEach(l => l());
    }
}
