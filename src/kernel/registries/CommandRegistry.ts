import { ICommandDefinition } from '@/kernel/system/plugin/types';
import { loggerService } from '@/kernel/services/LoggerService';
import type { EditorEngineView } from '@/kernel/interfaces/IEditorEngine';

export type CommandHandler = (view: EditorEngineView, ...args: any[]) => void;

const logger = loggerService.createLogger('CommandRegistry');

export class CommandRegistry {
    private commands = new Map<string, ICommandDefinition>();

    registerCommand(command: ICommandDefinition): () => void {
        const { id } = command;
        this.commands.set(id, command);
        return () => {
            if (this.commands.get(id) === command) {
                this.commands.delete(id);
            }
        };
    }

    executeCommand(id: string, view: EditorEngineView, ...args: any[]): boolean {
        const command = this.commands.get(id);
        if (command && command.handler) {
            try {
                command.handler(view, ...args);
                return true;
            } catch (e) {
                logger.error(`Error executing command ${id}`, e);
                return false;
            }
        }
        logger.warn(`Command ${id} not found.`);
        return false;
    }

    hasCommand(id: string): boolean {
        return this.commands.has(id);
    }

    getCommands(): ICommandDefinition[] {
        return Array.from(this.commands.values());
    }
}
