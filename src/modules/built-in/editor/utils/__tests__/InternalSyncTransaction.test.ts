/**
 * 测试范围：程序事务统一构造 helper
 * 测试类型：单元 / 回归
 * 测试目的：验证内部同步事务统一附加内部标记、来源标记和 addToHistory=false
 * 防回归问题：程序性整篇替换漏打标、撤销栈再次被程序事务污染
 * 关键不变量：
 * - InternalSyncAnnotation 必须存在
 * - ProgrammaticTransactionSourceAnnotation 必须存在
 * - Transaction.addToHistory=false 必须存在
 * 边界说明：
 * - 不覆盖各入口是否正确调用该 helper
 * 依赖与限制：
 * - 只验证事务规格对象，不验证视图执行
 */
import { describe, expect, it } from 'vitest';
import { Transaction } from '@codemirror/state';

import {
    InternalSyncAnnotation,
    ProgrammaticTransactionSourceAnnotation,
} from '../../constants/Annotations';
import { PROGRAMMATIC_TRANSACTION_SOURCES } from '../../constants/ProgrammaticTransactionSources';
import { createInternalSyncTransaction } from '../InternalSyncTransaction';

describe('createInternalSyncTransaction', () => {
    it('应统一附带内部同步标记并禁止写入撤销栈', () => {
        const spec = createInternalSyncTransaction(
            {
                changes: { from: 0, to: 0, insert: 'hello' },
            },
            { source: PROGRAMMATIC_TRANSACTION_SOURCES.SYNC_PROTOCOL },
        );

        const rawAnnotations = spec.annotations;
        expect(Array.isArray(rawAnnotations)).toBe(true);

        const annotations = Array.isArray(rawAnnotations)
            ? Array.from(rawAnnotations)
            : rawAnnotations
                ? [rawAnnotations]
                : [];

        expect(annotations).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ type: InternalSyncAnnotation, value: true }),
                expect.objectContaining({
                    type: ProgrammaticTransactionSourceAnnotation,
                    value: PROGRAMMATIC_TRANSACTION_SOURCES.SYNC_PROTOCOL,
                }),
                expect.objectContaining({ type: Transaction.addToHistory, value: false }),
            ]),
        );
    });
});
