/**
 * 测试范围：文件系统原始变化归类服务
 * 测试类型：单元 / 回归
 * 测试目的：验证内部写盘回流、普通外部修改、外部覆盖候选、路径迁移忽略窗口的分类规则稳定
 * 防回归问题：保存误报覆盖、普通修改误判覆盖、重命名/移动误入冲突链路
 * 关键不变量：
 * - 内部写盘回流必须被忽略
 * - 普通 change 事件不能被归类成覆盖候选
 * - rename 事件只能进入覆盖候选语义，不直接等于冲突
 * 边界说明：
 * - 不覆盖真实文件系统 watch 时序
 * - 不覆盖外部冲突状态机与保存保护
 * 依赖与限制：
 * - 使用 fake timers 验证忽略窗口
 * - 使用 FakeKernel 验证事件发射
 */
import EventEmitter from 'eventemitter3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CoreEvents } from '@/kernel/core/Events';
import { FILE_CHANGE_CLASSIFICATION_EVENTS } from '../../constants/FileChangeClassificationEvents';
import { FileChangeClassificationService } from '../FileChangeClassificationService';

class FakeKernel extends EventEmitter {}

describe('FileChangeClassificationService', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('应在内部写盘忽略窗口内忽略同路径变更', () => {
        const kernel = new FakeKernel();
        const service = new FileChangeClassificationService(kernel as any);

        service.markInternalWrite('docs/test.md');

        expect(service.consumeWatchChange({
            changedPath: 'docs/test.md',
            eventType: 'change',
            exists: true,
        })).toMatchObject({
            path: 'docs/test.md',
            kind: 'ignored_internal_write',
        });

        vi.advanceTimersByTime(1600);

        expect(service.consumeWatchChange({
            changedPath: 'docs/test.md',
            eventType: 'change',
            exists: true,
        })).toMatchObject({
            path: 'docs/test.md',
            kind: 'external_change_observed',
        });
    });

    it('应将 rename 归类为外部覆盖候选并发出事件', () => {
        const kernel = new FakeKernel();
        const service = new FileChangeClassificationService(kernel as any);
        const candidateHandler = vi.fn();

        kernel.on(FILE_CHANGE_CLASSIFICATION_EVENTS.EXTERNAL_OVERWRITE_CANDIDATE, candidateHandler);

        const result = service.consumeWatchChange({
            changedPath: 'docs/test.md',
            eventType: 'rename',
            exists: true,
        });

        expect(result).toMatchObject({
            path: 'docs/test.md',
            kind: 'external_overwrite_candidate',
            sourceEventType: 'rename',
        });
        expect(candidateHandler).toHaveBeenCalledTimes(1);
        expect(candidateHandler).toHaveBeenCalledWith(expect.objectContaining({
            path: 'docs/test.md',
            kind: 'external_overwrite_candidate',
        }));
    });

    it('应将普通 change 事件归类为外部修改观察事件而不是覆盖候选', () => {
        const kernel = new FakeKernel();
        const service = new FileChangeClassificationService(kernel as any);
        const changeHandler = vi.fn();
        const candidateHandler = vi.fn();

        kernel.on(FILE_CHANGE_CLASSIFICATION_EVENTS.EXTERNAL_CHANGE_OBSERVED, changeHandler);
        kernel.on(FILE_CHANGE_CLASSIFICATION_EVENTS.EXTERNAL_OVERWRITE_CANDIDATE, candidateHandler);

        const result = service.consumeWatchChange({
            changedPath: 'docs/test.md',
            eventType: 'change',
            exists: true,
        });

        expect(result).toMatchObject({
            path: 'docs/test.md',
            kind: 'external_change_observed',
            sourceEventType: 'change',
        });
        expect(changeHandler).toHaveBeenCalledTimes(1);
        expect(candidateHandler).not.toHaveBeenCalled();
    });

    it('应在同一路径的 rename 加 change 事件批次中仍归类为覆盖候选', () => {
        const kernel = new FakeKernel();
        const service = new FileChangeClassificationService(kernel as any);
        const candidateHandler = vi.fn();

        kernel.on(FILE_CHANGE_CLASSIFICATION_EVENTS.EXTERNAL_OVERWRITE_CANDIDATE, candidateHandler);

        const results = service.consumeWatchChanges([
            {
                changedPath: 'docs/test.md',
                eventType: 'rename',
                exists: true,
            },
            {
                changedPath: 'docs/test.md',
                eventType: 'change',
                exists: true,
            },
        ]);

        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
            path: 'docs/test.md',
            kind: 'external_overwrite_candidate',
            sourceEventType: 'rename',
        });
        expect(candidateHandler).toHaveBeenCalledTimes(1);
    });

    it('应在文件移动和覆盖事件后临时忽略旧路径与新路径变化', () => {
        const kernel = new FakeKernel();
        const service = new FileChangeClassificationService(kernel as any);
        service.start();

        kernel.emit(CoreEvents.FILE_MOVED, { oldPath: 'docs/a.md', newPath: 'docs/b.md' });
        kernel.emit(CoreEvents.FILE_OVERWRITTEN, 'docs/c.md');

        expect(service.consumeWatchChange({
            changedPath: 'docs/a.md',
            eventType: 'rename',
            exists: true,
        })?.kind).toBe('ignored_internal_write');

        expect(service.consumeWatchChange({
            changedPath: 'docs/b.md',
            eventType: 'rename',
            exists: true,
        })?.kind).toBe('ignored_internal_write');

        expect(service.consumeWatchChange({
            changedPath: 'docs/c.md',
            eventType: 'rename',
            exists: true,
        })?.kind).toBe('ignored_internal_write');
    });
});
