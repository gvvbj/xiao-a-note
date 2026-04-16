/**
 * 测试范围：Kernel UI Slot 契约与运行时校验
 * 测试类型：单元 / 回归
 * 测试目的：守住 Phase 8 对 UI Slot 宽口径的最终收口
 * 防回归问题：任意字符串继续注册为宿主插槽、UI_UPDATED 广播丢失或携带非法 slot id
 * 关键不变量：
 * - 非法 slot id 会被拒绝
 * - 合法 slot id 注册后会触发 UI_UPDATED
 * - getUI 只返回对应合法插槽内容
 * 边界说明：
 * - 不覆盖 UISlot React 渲染
 * - 不覆盖插件上下文包装逻辑
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Kernel } from '../Kernel';
import { CoreEvents } from '../Events';
import { UISlotId } from '../Constants';

const DummyComponent: React.FC = () => null;

describe('Phase 8 Kernel UI slot contract', () => {
    it('非法 slot id 注册时应抛错', () => {
        const kernel = new Kernel();

        expect(() => {
            kernel.registerUI('legacy-slot' as UISlotId, {
                id: 'bad-slot-item',
                component: DummyComponent,
            });
        }).toThrow('[Kernel] Invalid UI slot id: legacy-slot');
    });

    it('合法 slot id 注册后应触发 UI_UPDATED 并能正常读取', () => {
        const kernel = new Kernel();
        const onUiUpdated = vi.fn();

        kernel.on(CoreEvents.UI_UPDATED, onUiUpdated);
        kernel.registerUI(UISlotId.LEFT_SIDEBAR, {
            id: 'sidebar-item',
            component: DummyComponent,
            order: 10,
        });

        expect(onUiUpdated).toHaveBeenCalledWith(UISlotId.LEFT_SIDEBAR);
        expect(kernel.getUI(UISlotId.LEFT_SIDEBAR)).toEqual([
            expect.objectContaining({
                id: 'sidebar-item',
                component: DummyComponent,
                order: 10,
            }),
        ]);
    });
});
