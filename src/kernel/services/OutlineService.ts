import { EventEmitter } from 'events';
import { Kernel } from '../core/Kernel';
import { CoreEvents } from '../core/Events';

export interface OutlineItem {
    id: string;
    text: string;
    level: number;
    line: number;
}

export class OutlineService extends EventEmitter {
    private kernel: Kernel | null = null;
    private headers: OutlineItem[] = [];
    private collapsedIds: Set<string> = new Set();

    init(kernel: Kernel) {
        this.kernel = kernel;
    }

    getHeaders(): OutlineItem[] {
        return [...this.headers];
    }

    getCollapsedIds(): Set<string> {
        return new Set(this.collapsedIds);
    }

    setHeaders(headers: OutlineItem[]) {
        this.headers = headers;
        this.emit(CoreEvents.OUTLINE_CHANGED, { headers: this.getHeaders(), collapsedIds: this.getCollapsedIds() });
    }

    toggleCollapse(id: string) {
        const newSet = new Set(this.collapsedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        this.collapsedIds = newSet;
        this.emit(CoreEvents.OUTLINE_CHANGED, { headers: this.getHeaders(), collapsedIds: this.getCollapsedIds() });
    }

    collapseAll() {
        this.collapsedIds = new Set(this.headers.map(h => h.id));
        this.emit(CoreEvents.OUTLINE_CHANGED, { headers: this.getHeaders(), collapsedIds: this.getCollapsedIds() });
    }

    expandAll() {
        this.collapsedIds = new Set();
        this.emit(CoreEvents.OUTLINE_CHANGED, { headers: this.getHeaders(), collapsedIds: this.getCollapsedIds() });
    }
}
