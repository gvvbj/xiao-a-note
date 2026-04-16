import { history, historyKeymap } from '@codemirror/commands';
import { Compartment, EditorState, Prec, Transaction } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';

import { Kernel } from '@/kernel/core/Kernel';
import { ServiceId } from '@/kernel/core/ServiceId';
import { EditorExtensionRegistry } from '../../../../../registries/EditorExtensionRegistry';
import { EditorEvents } from '../../../../../constants/EditorEvents';
import {
    shouldKeepTransactionOutOfHistory,
    shouldResetHistoryOnSwitch,
} from './HistoryPolicies';

export class HistoryService {
    private kernel: Kernel;
    private editorView: EditorView | null = null;
    private cleanupHandlers: Array<() => void> = [];
    private historyCompartment = new Compartment();
    private isRegistered = false;

    constructor(kernel: Kernel) {
        this.kernel = kernel;
    }

    start(): void {
        this.setupHistoryIsolation();

        const handleViewReady = (view: EditorView) => {
            this.editorView = view;
            this.setupHistoryIsolation();
        };

        const handleSwitchingStart = (payload: { prevPath: string | null; nextPath: string | null }) => {
            if (!this.editorView) {
                return;
            }

            if (!shouldResetHistoryOnSwitch(payload.prevPath, payload.nextPath)) {
                return;
            }

            this.resetHistoryState();
        };

        this.kernel.on(EditorEvents.MAIN_VIEW_READY, handleViewReady);
        this.kernel.on(EditorEvents.LIFECYCLE_SWITCHING_START, handleSwitchingStart);

        this.cleanupHandlers.push(() => {
            this.kernel.off(EditorEvents.MAIN_VIEW_READY, handleViewReady);
            this.kernel.off(EditorEvents.LIFECYCLE_SWITCHING_START, handleSwitchingStart);
        });
    }

    private setupHistoryIsolation(): void {
        if (this.isRegistered) {
            return;
        }

        const extensionRegistry = this.kernel.getService<EditorExtensionRegistry>(
            ServiceId.EDITOR_EXTENSION_REGISTRY,
            false,
        );
        if (!extensionRegistry) {
            setTimeout(() => this.setupHistoryIsolation(), 50);
            return;
        }

        const unregisterHistory = extensionRegistry.register('history-manager-core', [
            this.historyCompartment.of(history()),
            Prec.highest(keymap.of(historyKeymap)),
        ]);

        const transactionFilter = EditorState.transactionFilter.of((tr: Transaction) => {
            if (!shouldKeepTransactionOutOfHistory(tr)) {
                return tr;
            }

            return [tr, { annotations: Transaction.addToHistory.of(false) }];
        });

        const unregisterFilter = extensionRegistry.register('history-silent-filter', transactionFilter);

        this.cleanupHandlers.push(unregisterHistory, unregisterFilter);
        this.isRegistered = true;
    }

    private resetHistoryState(): void {
        if (!this.editorView) {
            return;
        }

        this.editorView.dispatch({
            effects: this.historyCompartment.reconfigure([]),
        });
        this.editorView.dispatch({
            effects: this.historyCompartment.reconfigure(history()),
        });
    }

    dispose(): void {
        this.cleanupHandlers.forEach((cleanup) => cleanup());
        this.cleanupHandlers = [];
        this.editorView = null;
    }
}
