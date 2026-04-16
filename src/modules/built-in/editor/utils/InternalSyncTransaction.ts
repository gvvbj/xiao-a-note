import { Transaction, type TransactionSpec } from '@codemirror/state';

import {
    InternalSyncAnnotation,
    ProgrammaticTransactionSourceAnnotation,
} from '../constants/Annotations';
import type { ProgrammaticTransactionSource } from '../constants/ProgrammaticTransactionSources';

type InternalSyncTransactionSpec = Pick<
    TransactionSpec,
    'changes' | 'selection' | 'effects' | 'scrollIntoView'
>;

interface InternalSyncTransactionOptions {
    source: ProgrammaticTransactionSource;
}

export function createInternalSyncTransaction(
    spec: InternalSyncTransactionSpec,
    options: InternalSyncTransactionOptions,
): TransactionSpec {
    return {
        ...spec,
        annotations: [
            InternalSyncAnnotation.of(true),
            ProgrammaticTransactionSourceAnnotation.of(options.source),
            Transaction.addToHistory.of(false),
        ],
    };
}

export function isProgrammaticTransaction(tr: Transaction): boolean {
    return (
        tr.annotation(InternalSyncAnnotation) === true ||
        tr.annotation(ProgrammaticTransactionSourceAnnotation) !== undefined
    );
}
