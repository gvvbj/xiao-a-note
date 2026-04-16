/**
 * 测试范围：PluginSidebarView 插件中心兼容状态展示与禁用提示
 * 测试类型：集成/回归
 * 测试目的：防止插件中心在多引擎场景下丢失“兼容/不兼容”可视化与禁用约束
 * 防回归问题：D5（兼容状态展示）
 * 关键不变量：
 * - 插件中心展示“兼容当前引擎 / 不兼容当前引擎”状态
 * - 不兼容当前引擎的插件在插件中心不可手动启用
 * - 兼容插件可正常触发启用/禁用切换
 * 边界说明：
 * - 不覆盖引擎切换事务与插件实际激活编排（由 D4 服务层测试覆盖）
 * 依赖与限制（如有）：
 * - 通过 mock useService 聚焦插件中心 UI 行为
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useService } from '@/kernel/core/KernelContext';
import { ServiceId } from '@/kernel/core/ServiceId';
import { PluginCategory, type IPlugin } from '@/kernel/system/plugin/types';
import { PluginSidebarView } from '@/kernel/system/plugin/views/PluginSidebarView';

vi.mock('@/kernel/core/KernelContext', () => ({
    useService: vi.fn(),
}));

interface IPluginManagerLike {
    getPlugins: () => IPlugin[];
    isPluginActive: (id: string) => boolean;
    checkDependencies: (_plugin: IPlugin) => string[];
    togglePlugin: ReturnType<typeof vi.fn>;
    subscribe: (_listener: () => void) => () => void;
    isPluginCompatibleWithEngine: (_plugin: IPlugin, _engineId: string) => boolean;
}

function setup(options: {
    plugins: IPlugin[];
    currentEngineId: string;
    compatibility: Record<string, boolean>;
    activeIds?: string[];
}) {
    const active = new Set(options.activeIds || []);
    const togglePlugin = vi.fn();
    const pluginManager: IPluginManagerLike = {
        getPlugins: () => options.plugins,
        isPluginActive: (id: string) => active.has(id),
        checkDependencies: () => [],
        togglePlugin,
        subscribe: () => () => undefined,
        isPluginCompatibleWithEngine: (plugin: IPlugin) => options.compatibility[plugin.id] !== false,
    };

    const settingsService = {
        getSetting: vi.fn((_key: string, fallback: string) => options.currentEngineId || fallback),
    };

    vi.mocked(useService).mockImplementation((id: string) => {
        if (id === ServiceId.PLUGIN_MANAGER) {
            return pluginManager as never;
        }
        if (id === ServiceId.SETTINGS) {
            return settingsService as never;
        }
        return null as never;
    });

    render(<PluginSidebarView />);
    return { togglePlugin };
}

function createPlugin(id: string, name: string): IPlugin {
    return {
        id,
        name,
        version: '1.0.0',
        category: PluginCategory.EDITOR,
        activate: () => undefined,
    };
}

describe('PluginSidebarView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('应展示兼容状态并禁用不兼容插件的启用按钮', () => {
        setup({
            plugins: [
                createPlugin('editor-compatible', 'Editor Compatible'),
                createPlugin('editor-incompatible', 'Editor Incompatible'),
            ],
            currentEngineId: 'prosemirror',
            compatibility: {
                'editor-compatible': true,
                'editor-incompatible': false,
            },
        });

        expect(screen.getByText('兼容当前引擎 (prosemirror)')).toBeInTheDocument();
        expect(screen.getByText('不兼容当前引擎 (prosemirror)')).toBeInTheDocument();

        const disabledButton = screen.getByTitle('当前引擎(prosemirror)不兼容');
        expect(disabledButton).toBeDisabled();
    });

    it('兼容插件应允许手动切换启用状态', () => {
        const { togglePlugin } = setup({
            plugins: [createPlugin('editor-compatible', 'Editor Compatible')],
            currentEngineId: 'codemirror',
            compatibility: { 'editor-compatible': true },
        });

        fireEvent.click(screen.getByRole('button', { name: '已禁用' }));
        expect(togglePlugin).toHaveBeenCalledWith('editor-compatible');
    });
});

