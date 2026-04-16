import { Transaction } from '@codemirror/state';

import { EDITOR_CONSTANTS } from '../../../../../constants/EditorConstants';
import { isProgrammaticTransaction } from '../../../../../utils/InternalSyncTransaction';

export function shouldResetHistoryOnSwitch(
    prevPath: string | null,
    nextPath: string | null,
): boolean {
    if (prevPath === nextPath || nextPath === null) {
        return false;
    }

    const isUntitledMigration =
        prevPath?.startsWith(EDITOR_CONSTANTS.UNTITLED_PREFIX) === true &&
        !nextPath.startsWith(EDITOR_CONSTANTS.UNTITLED_PREFIX);

    return !isUntitledMigration;
}

export function shouldKeepTransactionOutOfHistory(tr: Transaction): boolean {
    if (tr.annotation(Transaction.addToHistory) === false) {
        return true;
    }

    return isProgrammaticTransaction(tr);
}
