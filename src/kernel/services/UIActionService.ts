import type {
    IUIActionDefinition,
    IUIActionExecuteResult,
    IUIActionService,
} from '@/kernel/interfaces/IUIActionService';

export class UIActionService implements IUIActionService {
    private readonly actions = new Map<string, IUIActionDefinition>();

    registerAction<T = unknown>(def: IUIActionDefinition<T>): () => void {
        if (!def.id) {
            throw new Error('UI action id is required.');
        }

        this.actions.set(def.id, def as IUIActionDefinition);
        return () => {
            if (this.actions.get(def.id) === def) {
                this.actions.delete(def.id);
            }
        };
    }

    async execute<T = unknown>(id: string, payload?: T): Promise<IUIActionExecuteResult> {
        const action = this.actions.get(id);
        if (!action) {
            return { ok: false, reason: `UI action not found: ${id}` };
        }

        if (action.isEnabled && !action.isEnabled()) {
            return { ok: false, reason: `UI action is disabled: ${id}` };
        }

        try {
            await Promise.resolve(action.run(payload));
            return { ok: true };
        } catch (error) {
            return {
                ok: false,
                reason: error instanceof Error ? error.message : String(error),
            };
        }
    }

    has(id: string): boolean {
        return this.actions.has(id);
    }

    list(): IUIActionDefinition[] {
        return Array.from(this.actions.values());
    }
}
