import React from 'react';
import type { EditorEngineView } from '@/kernel/interfaces/IEditorEngine';

export interface IEditorPanel<P = unknown> {
    id: string;
    component: React.ComponentType<P & { getView: () => EditorEngineView | null; isVisible: boolean }>;
    props?: P;
    position: 'top' | 'bottom' | 'side';
}

export class EditorPanelRegistry {
    private panels: Map<string, IEditorPanel<any>> = new Map();
    private activePanelIds: Set<string> = new Set();
    private listeners: (() => void)[] = [];

    registerPanel<P>(panel: IEditorPanel<P>): () => void {
        this.panels.set(panel.id, panel);
        this.notify();
        return () => {
            this.panels.delete(panel.id);
            this.activePanelIds.delete(panel.id);
            this.notify();
        };
    }

    togglePanel(id: string) {
        if (this.activePanelIds.has(id)) {
            this.activePanelIds.delete(id);
        } else {
            this.activePanelIds.add(id);
        }
        this.notify();
    }

    openPanel(id: string) {
        if (this.panels.has(id)) {
            this.activePanelIds.add(id);
            this.notify();
        }
    }

    closePanel(id: string) {
        if (this.activePanelIds.has(id)) {
            this.activePanelIds.delete(id);
            this.notify();
        }
    }

    isPanelVisible(id: string): boolean {
        return this.activePanelIds.has(id);
    }

    getVisiblePanels(): IEditorPanel[] {
        return Array.from(this.activePanelIds)
            .map(id => this.panels.get(id))
            .filter((p): p is IEditorPanel => !!p);
    }

    subscribe(listener: () => void) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notify() {
        this.listeners.forEach(l => l());
    }
}
