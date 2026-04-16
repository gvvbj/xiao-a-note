/**
 * 测试范围：UISlot 扩展 UI 沙箱包装
 * 测试类型：集成/回归
 * 测试目的：守护扩展 UI 通过 useKernel() 获得的仍然是受限代理，而不是裸 Kernel
 * 防回归问题：扩展组件通过 UISlot 绕过沙箱直接读取受限服务或发射系统命令
 * 关键不变量：
 * - isExtension=true 的组件只能拿到受限 kernel
 * - 非扩展组件仍保留正常 kernel 访问能力
 * - 扩展组件发射未授权事件不会触发真实系统命令
 * 边界说明：
 * - 不覆盖真实插件加载器
 * - 不覆盖视觉布局与样式
 * 依赖与限制（如有）：
 * - 使用 testing-library 渲染最小 KernelProvider 场景
 */
import React, { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { KernelProvider, useKernel } from '@/kernel/core/KernelContext';
import { Kernel } from '@/kernel/core/Kernel';
import { UISlotId } from '@/kernel/core/Constants';
import { UISlot } from '../UISlot';
import { ServiceId } from '@/kernel/core/ServiceId';
import { CoreEvents } from '@/kernel/core/Events';

function ExtensionProbe() {
    const kernel = useKernel();
    const settings = kernel.getService(ServiceId.SETTINGS, false);

    return <div data-testid="ext-status">{settings ? 'allowed' : 'blocked'}</div>;
}

function InternalProbe() {
    const kernel = useKernel();
    const settings = kernel.getService(ServiceId.SETTINGS, false);

    return <div data-testid="internal-status">{settings ? 'allowed' : 'blocked'}</div>;
}

function EventProbe() {
    const kernel = useKernel();

    useEffect(() => {
        kernel.emit(CoreEvents.DOCUMENT_CHANGED, { content: 'ok' });
        kernel.emit(CoreEvents.APP_CMD_SAVE);
    }, [kernel]);

    return <div data-testid="event-probe">ready</div>;
}

describe('Phase 2 UISlot 安全包装', () => {
    it('扩展 UI 应拿到受限 kernel，非扩展 UI 保持正常访问', () => {
        const kernel = new Kernel();
        kernel.registerService(ServiceId.SETTINGS, { updateSettings: vi.fn() }, true);

        kernel.registerUI(UISlotId.LEFT_SIDEBAR, {
            id: 'extension-probe',
            component: ExtensionProbe,
            isExtension: true,
        });
        kernel.registerUI(UISlotId.RIGHT_SIDEBAR, {
            id: 'internal-probe',
            component: InternalProbe,
        });

        render(
            <KernelProvider kernel={kernel}>
                <UISlot id={UISlotId.LEFT_SIDEBAR} />
                <UISlot id={UISlotId.RIGHT_SIDEBAR} />
            </KernelProvider>
        );

        expect(screen.getByTestId('ext-status').textContent).toBe('blocked');
        expect(screen.getByTestId('internal-status').textContent).toBe('allowed');
    });

    it('扩展 UI 发射未授权事件时不应触发真实系统命令', () => {
        const kernel = new Kernel();
        const documentChanged = vi.fn();
        const saveHandler = vi.fn();

        kernel.registerUI(UISlotId.LEFT_SIDEBAR, {
            id: 'event-probe',
            component: EventProbe,
            isExtension: true,
        });

        kernel.on(CoreEvents.DOCUMENT_CHANGED, documentChanged);
        kernel.on(CoreEvents.APP_CMD_SAVE, saveHandler);

        render(
            <KernelProvider kernel={kernel}>
                <UISlot id={UISlotId.LEFT_SIDEBAR} />
            </KernelProvider>
        );

        expect(screen.getByTestId('event-probe').textContent).toBe('ready');
        expect(documentChanged).toHaveBeenCalledTimes(1);
        expect(saveHandler).not.toHaveBeenCalled();
    });
});
