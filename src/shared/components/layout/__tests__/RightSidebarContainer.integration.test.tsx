/**
 * 测试范围：RightSidebarContainer 右侧边栏宿主与标准插槽装配链路
 * 测试类型：集成 / 回归
 * 测试目的：守住“RIGHT_SIDEBAR 插槽可挂载、可按设置显隐、宽度变更可被约束”的宿主边界
 * 防回归问题：右侧面板无法显示、设置切换后不响应、宽度约束失效导致布局溢出
 * 关键不变量：
 * - RIGHT_SIDEBAR 已注册内容且可见时应渲染面板
 * - layout.rightSidebarVisible 变更应立即驱动显隐
 * - layout.rightSidebarWidth 应被最小/最大宽度约束
 * 边界说明：
 * - 不覆盖 ResizeHandle 的真实拖拽过程
 * - 不覆盖具体面板内部业务逻辑
 * 依赖与限制：
 * - 使用真实 Kernel 与 SettingsService
 * - 依赖 jsdom localStorage
 */
import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { Kernel } from '@/kernel/core/Kernel';
import { KernelProvider } from '@/kernel/core/KernelContext';
import { UISlotId } from '@/kernel/core/Constants';
import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import { SettingsService } from '@/kernel/services/SettingsService';
import { LayoutSettingKey } from '@/shared/constants/LayoutSettings';
import { RightSidebarContainer } from '../RightSidebarContainer';

const RightPanel: React.FC = () => <div data-testid="right-panel">AI Right Panel</div>;

function createKernel(settings?: SettingsService) {
    const kernel = new Kernel();
    kernel.registerService(ServiceId.SETTINGS, settings ?? new SettingsService(), true);
    return kernel;
}

describe('RightSidebarContainer integration', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('应在右侧面板可见且已注册时渲染 RIGHT_SIDEBAR 内容', async () => {
        const settings = new SettingsService();
        settings.updateSettings('layout', { rightSidebarVisible: true });

        const kernel = createKernel(settings);
        kernel.registerUI(UISlotId.RIGHT_SIDEBAR, {
            id: 'ai-panel',
            component: RightPanel,
            order: 10,
        });

        render(
            <KernelProvider kernel={kernel}>
                <RightSidebarContainer />
            </KernelProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('right-panel').textContent).toBe('AI Right Panel');
        });
    });

    it('应响应 layout.rightSidebarVisible 变更切换显隐', async () => {
        const kernel = createKernel();
        kernel.registerUI(UISlotId.RIGHT_SIDEBAR, {
            id: 'ai-panel',
            component: RightPanel,
            order: 10,
        });

        render(
            <KernelProvider kernel={kernel}>
                <RightSidebarContainer />
            </KernelProvider>
        );

        expect(screen.queryByTestId('right-panel')).toBeNull();

        await act(async () => {
            kernel.emit(CoreEvents.SETTING_CHANGED, {
                id: LayoutSettingKey.RIGHT_SIDEBAR_VISIBLE,
                value: true,
            });
        });

        await waitFor(() => {
            expect(screen.getByTestId('right-panel')).toBeTruthy();
        });

        await act(async () => {
            kernel.emit(CoreEvents.SETTING_CHANGED, {
                id: LayoutSettingKey.RIGHT_SIDEBAR_VISIBLE,
                value: false,
            });
        });

        await waitFor(() => {
            expect(screen.queryByTestId('right-panel')).toBeNull();
        });
    });

    it('应对右侧边栏宽度应用约束', async () => {
        const kernel = createKernel();
        kernel.registerUI(UISlotId.RIGHT_SIDEBAR, {
            id: 'ai-panel',
            component: RightPanel,
            order: 10,
        });

        render(
            <KernelProvider kernel={kernel}>
                <RightSidebarContainer />
            </KernelProvider>
        );

        await act(async () => {
            kernel.emit(CoreEvents.SETTING_CHANGED, {
                id: LayoutSettingKey.RIGHT_SIDEBAR_VISIBLE,
                value: true,
            });
            kernel.emit(CoreEvents.SETTING_CHANGED, {
                id: LayoutSettingKey.RIGHT_SIDEBAR_WIDTH,
                value: 1200,
            });
        });

        await waitFor(() => {
            const panel = screen.getByTestId('right-panel').closest('aside');
            expect(panel?.getAttribute('style')).toContain('width: 640px');
        });
    });
});
