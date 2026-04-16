import { IShortcutItem, ShortcutGroup } from '@/kernel/interfaces/editor-types';

export type { IShortcutItem, ShortcutGroup };

export class ShortcutRegistry {
    private items: IShortcutItem[] = [];
    private listeners: (() => void)[] = [];
    private _snapshot: IShortcutItem[] = [];

    registerItem(item: IShortcutItem): () => void {
        const newItem: IShortcutItem = {
            order: 100,
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

    registerItems(items: IShortcutItem[]): () => void {
        const disposes = items.map(item => this.registerItem(item));
        return () => disposes.forEach(fn => fn());
    }

    getItems(): IShortcutItem[] {
        return this._snapshot;
    }

    getItemsByGroup(group: ShortcutGroup): IShortcutItem[] {
        return this.items.filter(i => i.group === group);
    }

    subscribe(listener: () => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notify() {
        this._snapshot = [...this.items];
        this.listeners.forEach(l => l());
    }
}
