/**
 * 测试范围：HistoryPolicies 历史纯度策略
 * 测试类型：单元 / 回归
 * 测试目的：验证切文件历史重置规则与程序事务排除规则
 * 防回归问题：切文件后撤销串文件、程序事务进入 undo 栈、用户输入被错误排除
 * 关键不变量：
 * - 真正的文件切换才重置历史
 * - 程序事务与 addToHistory=false 事务必须排除在历史栈之外
 * - 用户输入事务必须保留在历史栈内
 * 边界说明：
 * - 不覆盖真实 EditorView undo 执行
 * - 不覆盖具体插件触发事务的场景
 * 依赖与限制：
 * - 依赖 CodeMirror state transaction 构造
 */
import { describe, expect, it } from 'vitest';
import { EditorState, Transaction } from '@codemirror/state';

import { EDITOR_CONSTANTS } from '@/modules/built-in/editor/constants/EditorConstants';
import { PROGRAMMATIC_TRANSACTION_SOURCES } from '@/modules/built-in/editor/constants/ProgrammaticTransactionSources';
import { createInternalSyncTransaction } from '@/modules/built-in/editor/utils/InternalSyncTransaction';

import {
    shouldKeepTransactionOutOfHistory,
    shouldResetHistoryOnSwitch,
} from '../HistoryPolicies';

describe('HistoryPolicies', () => {
    it('仅在真实文件切换时重置历史栈', () => {
        expect(shouldResetHistoryOnSwitch('a.md', 'a.md')).toBe(false);
        expect(shouldResetHistoryOnSwitch('a.md', null)).toBe(false);
        expect(
            shouldResetHistoryOnSwitch(`${EDITOR_CONSTANTS.UNTITLED_PREFIX}1`, 'E:/note/a.md'),
        ).toBe(false);
        expect(shouldResetHistoryOnSwitch('E:/note/a.md', 'E:/note/b.md')).toBe(true);
    });

    it('程序事务必须被排除在历史栈之外', () => {
        const state = EditorState.create({ doc: 'hello' });
        const tr = state.update(
            createInternalSyncTransaction(
                { changes: { from: 0, to: state.doc.length, insert: 'world' } },
                { source: PROGRAMMATIC_TRANSACTION_SOURCES.SYNC_PROTOCOL },
            ),
        );

        expect(shouldKeepTransactionOutOfHistory(tr)).toBe(true);
    });

    it('显式 addToHistory=false 的事务也必须被排除', () => {
        const state = EditorState.create({ doc: 'hello' });
        const tr = state.update({
            changes: { from: 0, to: 5, insert: 'world' },
            annotations: Transaction.addToHistory.of(false),
        });

        expect(shouldKeepTransactionOutOfHistory(tr)).toBe(true);
    });

    it('用户输入事务应继续保留历史记录', () => {
        const state = EditorState.create({ doc: 'hello' });
        const tr = state.update({
            changes: { from: 5, to: 5, insert: '!' },
            annotations: Transaction.userEvent.of('input'),
        });

        expect(shouldKeepTransactionOutOfHistory(tr)).toBe(false);
    });
});
