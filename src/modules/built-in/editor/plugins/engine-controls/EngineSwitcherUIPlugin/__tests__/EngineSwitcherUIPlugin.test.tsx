/**
 * 测试范围：EngineSwitcherUIPlugin 图标入口与切换菜单交互
 * 测试类型：集成/回归
 * 测试目的：防止“图标按钮触发菜单”交互回归，并验证切换动作与反馈事件
 * 防回归问题：Q2（图标按钮替代常驻下拉）与 C1/C2/C3 交互约束
 * 关键不变量：
 * - 入口是图标按钮（无常驻“引擎”文案）
 * - 点击按钮后出现引擎菜单，Esc 可关闭
 * - 触发切换后会调用 switchEngine 并发出反馈事件
 * 边界说明：
 * - 不覆盖真实插件管理器与真实引擎切换事务（由服务层测试覆盖）
 * 依赖与限制（如有）：
 * - 通过 mock useKernel/useService 聚焦 UI 交互行为
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import { useKernel, useService } from '@/kernel/core/KernelContext';
import { EDITOR_ENGINE_SWITCH_SERVICE_ID } from '@/modules/built-in/editor/services/EditorEngineSwitchService';
import { EngineSwitcherControl } from '@/modules/built-in/editor/plugins/engine-controls/EngineSwitcherUIPlugin';

vi.mock('@/kernel/core/KernelContext', () => ({
    useKernel: vi.fn(),
    useService: vi.fn(),
}));

interface IPluginLike {
    id: string;
    name?: string;
    conflictGroup?: string;
}

interface ISetupResult {
    kernelEmit: ReturnType<typeof vi.fn>;
    switchEngine: ReturnType<typeof vi.fn>;
}

function setup(plugins: IPluginLike[], configuredEngineId = 'codemirror'): ISetupResult {
    const kernelEmit = vi.fn();
    const switchEngine = vi.fn().mockResolvedValue(undefined);
    const pluginManager = {
        getPlugins: () => plugins,
        subscribe: () => () => undefined,
    };
    const switchService = {
        getConfiguredEngineId: vi.fn(() => configuredEngineId),
        switchEngine,
    };

    vi.mocked(useKernel).mockReturnValue({ emit: kernelEmit } as never);
    vi.mocked(useService).mockImplementation((id: string) => {
        if (id === ServiceId.PLUGIN_MANAGER) {
            return pluginManager as never;
        }
        if (id === EDITOR_ENGINE_SWITCH_SERVICE_ID) {
            return switchService as never;
        }
        return null as never;
    });

    render(<EngineSwitcherControl />);
    return { kernelEmit, switchEngine };
}

describe('EngineSwitcherUIPlugin', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('应使用图标按钮作为入口，并可打开/关闭引擎菜单', () => {
        setup([
            { id: 'engine-codemirror', name: 'CodeMirror Engine', conflictGroup: 'editor-engine' },
            { id: 'engine-prosemirror', name: 'ProseMirror Engine', conflictGroup: 'editor-engine' },
        ]);

        expect(screen.queryByText('引擎')).not.toBeInTheDocument();

        const trigger = screen.getByRole('button', { name: '切换编辑器引擎' });
        fireEvent.click(trigger);

        expect(screen.getByRole('menu')).toBeInTheDocument();
        expect(screen.getByText('CodeMirror Engine')).toBeInTheDocument();
        expect(screen.getByText('ProseMirror Engine')).toBeInTheDocument();

        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('仅有一个引擎时应禁用图标按钮', () => {
        setup([
            { id: 'engine-codemirror', name: 'CodeMirror Engine', conflictGroup: 'editor-engine' },
        ]);

        const trigger = screen.getByRole('button', { name: '切换编辑器引擎' });
        expect(trigger).toBeDisabled();
        fireEvent.click(trigger);
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('选择新引擎后应触发切换并发射成功反馈', async () => {
        const { kernelEmit, switchEngine } = setup([
            { id: 'engine-codemirror', name: 'CodeMirror Engine', conflictGroup: 'editor-engine' },
            { id: 'engine-prosemirror', name: 'ProseMirror Engine', conflictGroup: 'editor-engine' },
        ]);

        fireEvent.click(screen.getByRole('button', { name: '切换编辑器引擎' }));
        fireEvent.click(screen.getByRole('menuitem', { name: 'ProseMirror Engine' }));

        await waitFor(() => {
            expect(switchEngine).toHaveBeenCalledWith('prosemirror');
        });
        expect(kernelEmit).toHaveBeenCalledWith(
            CoreEvents.APP_SHOW_MESSAGE_DIALOG,
            expect.objectContaining({ title: '引擎切换成功', type: 'info' })
        );
    });
});
