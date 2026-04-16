/**
 * 测试范围：SidebarContainer 宿主壳与标准侧边栏装配链路
 * 测试类型：集成 / 回归
 * 测试目的：守护“宿主壳稳定、侧边栏面板可装配”的平台边界，避免插件面板注册或切换逻辑回退
 * 防回归问题：LEFT_SIDEBAR 面板未渲染、SIDEBAR_BOTTOM 装配失效、点击活动项后面板不切换或无法折叠
 * 关键不变量：
 * - LEFT_SIDEBAR 注册项会出现在活动栏并驱动面板切换
 * - SIDEBAR_BOTTOM 注册项始终挂载在宿主壳底部区域
 * - 点击同一活动项时仅折叠面板，不破坏活动栏壳结构
 * 边界说明：
 * - 不覆盖 ResizeHandle 的拖拽行为
 * - 不覆盖视觉样式与动画表现
 * 依赖与限制（如有）：
 * - 使用真实 LayoutService 与最小 KernelProvider 场景
 * - 依赖 jsdom 的 localStorage 实现
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KernelProvider } from '@/kernel/core/KernelContext';
import { Kernel } from '@/kernel/core/Kernel';
import { UISlotId } from '@/kernel/core/Constants';
import { ServiceId } from '@/kernel/core/ServiceId';
import { LayoutService } from '@/kernel/services/LayoutService';
import { SidebarContainer } from '../SidebarContainer';

const ExplorerPanel: React.FC = () => <div data-testid="explorer-panel">Explorer Panel</div>;
const OutlinePanel: React.FC = () => <div data-testid="outline-panel">Outline Panel</div>;
const SettingsShortcut: React.FC = () => <div data-testid="sidebar-bottom-item">Settings Shortcut</div>;
const SquareIcon: React.FC = () => <span aria-hidden="true">I</span>;

function createKernelWithLayout() {
    const kernel = new Kernel();
    kernel.registerService(ServiceId.LAYOUT, new LayoutService(), true);
    return kernel;
}

describe('SidebarContainer integration', () => {
    it('应渲染标准侧边栏活动项、首个活动面板与底部插槽内容', async () => {
        const kernel = createKernelWithLayout();

        kernel.registerUI(UISlotId.LEFT_SIDEBAR, {
            id: 'explorer-panel',
            component: ExplorerPanel,
            label: 'Explorer',
            icon: SquareIcon,
            order: 10,
        });
        kernel.registerUI(UISlotId.LEFT_SIDEBAR, {
            id: 'outline-panel',
            component: OutlinePanel,
            label: 'Outline',
            icon: SquareIcon,
            order: 20,
        });
        kernel.registerUI(UISlotId.SIDEBAR_BOTTOM, {
            id: 'settings-shortcut',
            component: SettingsShortcut,
            order: 10,
        });

        render(
            <KernelProvider kernel={kernel}>
                <SidebarContainer />
            </KernelProvider>
        );

        expect(screen.getByTitle('Explorer')).toBeTruthy();
        expect(screen.getByTitle('Outline')).toBeTruthy();
        expect(screen.getByTestId('sidebar-bottom-item').textContent).toBe('Settings Shortcut');

        await waitFor(() => {
            expect(screen.getByTestId('explorer-panel').textContent).toBe('Explorer Panel');
        });
    });

    it('点击不同活动项应切换面板，再次点击当前活动项应折叠侧边栏面板', async () => {
        const kernel = createKernelWithLayout();

        kernel.registerUI(UISlotId.LEFT_SIDEBAR, {
            id: 'explorer-panel',
            component: ExplorerPanel,
            label: 'Explorer',
            icon: SquareIcon,
            order: 10,
        });
        kernel.registerUI(UISlotId.LEFT_SIDEBAR, {
            id: 'outline-panel',
            component: OutlinePanel,
            label: 'Outline',
            icon: SquareIcon,
            order: 20,
        });

        render(
            <KernelProvider kernel={kernel}>
                <SidebarContainer />
            </KernelProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('explorer-panel')).toBeTruthy();
        });

        fireEvent.click(screen.getByTitle('Outline'));

        await waitFor(() => {
            expect(screen.getByTestId('outline-panel').textContent).toBe('Outline Panel');
        });
        expect(screen.queryByTestId('explorer-panel')).toBeNull();

        fireEvent.click(screen.getByTitle('Outline'));

        await waitFor(() => {
            expect(screen.queryByTestId('outline-panel')).toBeNull();
        });

        expect(screen.getByTitle('Explorer')).toBeTruthy();
        expect(screen.getByTitle('Outline')).toBeTruthy();
    });
});
