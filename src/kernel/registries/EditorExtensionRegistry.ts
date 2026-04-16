import type { EditorEngineExtension } from '@/kernel/interfaces/IEditorEngine';

export class EditorExtensionRegistry {
    private extensions: Map<string, EditorEngineExtension> = new Map();
    private listeners: (() => void)[] = [];

    register(id: string, extension: EditorEngineExtension): () => void {
        this.extensions.set(id, extension);
        this.notify();

        return () => {
            if (this.extensions.get(id) === extension) {
                this.extensions.delete(id);
                this.notify();
            }
        };
    }

    getExtensions(): EditorEngineExtension[] {
        return Array.from(this.extensions.values());
    }

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
