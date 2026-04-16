/**
 * 测试范围：UIActionService 与第一批动作注册
 * 测试类型：单元 / 集成回归
 * 测试目的：验证 UI 动作总线的注册、执行、失败返回，以及 editor / explorer / split-view / settings / layout 的第一批动作桥接
 * 防回归问题：动作缺失、动作异常直接抛出、视图切换在分栏态失控、设置仍依赖局部按钮状态无法程序打开
 * 关键不变量：
 * - 动作执行必须返回 ok/reason，而不是直接抛到调用方
 * - 编辑器命令与系统动作职责分离
 * - 高频 UI 动作通过正式 action id 可执行
 * 依赖与限制：
 * - 使用内核级轻量 stub，不覆盖真实 Electron / React 渲染
 */

import { describe, expect, it, vi } from 'vitest';

import { UIActionId } from '@/kernel/constants/UIActionIds';
import { CoreEvents } from '@/kernel/core/Events';
import { Kernel } from '@/kernel/core/Kernel';
import { ServiceId } from '@/kernel/core/ServiceId';
import type { IFileSystem, IWorkspaceActionService } from '@/kernel/interfaces';
import { EditorService } from '@/kernel/services/EditorService';
import { LayoutService } from '@/kernel/services/LayoutService';
import { UIActionService } from '@/kernel/services/UIActionService';
import { registerCoreUIActions } from '@/kernel/services/registerCoreUIActions';
import { registerEditorUIActions } from '@/modules/built-in/editor/services/registerEditorUIActions';
import { registerExplorerUIActions } from '@/modules/built-in/explorer/services/registerExplorerUIActions';
import { registerSettingsUIActions } from '@/modules/built-in/settings/services/registerSettingsUIActions';
import { registerSplitViewUIActions } from '@/modules/built-in/split-view/services/registerSplitViewUIActions';

class SplitViewServiceStub {
    isSplitView = false;

    setSplitView(value: boolean) {
        this.isSplitView = value;
    }
}

function createFileSystemStub(): IFileSystem {
    return {
        openDirectory: vi.fn(),
        openFile: vi.fn(),
        readFile: vi.fn(),
        saveFile: vi.fn(),
        readDirectoryTree: vi.fn(),
        showSaveDialog: vi.fn(),
        saveImage: vi.fn(),
        saveTempImage: vi.fn(),
        getFilePath: vi.fn(),
        createFile: vi.fn(),
        createDirectory: vi.fn(),
        rename: vi.fn(),
        delete: vi.fn(),
        move: vi.fn(),
        copy: vi.fn(),
        checkExists: vi.fn(),
        showItemInFolder: vi.fn(async () => undefined),
        getUserDataPath: vi.fn(async () => 'C:/Users/test/AppData/Roaming/xiao-a-note'),
        exportToPDF: vi.fn(),
        exportToWord: vi.fn(),
        exportToZip: vi.fn(),
        getAllMarkdownFiles: vi.fn(),
        getDirname: vi.fn(),
        pathJoin: vi.fn(),
        openExternal: vi.fn(),
        getThemeList: vi.fn(),
        readThemeFile: vi.fn(),
        watch: vi.fn(),
        onWatchEvent: vi.fn(() => () => undefined),
        getExternalPluginList: vi.fn(),
        readPluginCode: vi.fn(),
        readPluginDirectory: vi.fn(),
        loadWasm: vi.fn(),
    };
}

function createWorkspaceActionServiceStub(): IWorkspaceActionService {
    return {
        getProjectRoot: vi.fn(() => 'C:/workspace'),
        readDirectoryTree: vi.fn(),
        readFile: vi.fn(),
        openFile: vi.fn(async () => undefined),
        stageChangePlan: vi.fn(),
        previewChangePlan: vi.fn(),
        applyChangePlan: vi.fn(),
        discardChangePlan: vi.fn(),
    };
}

function createHarness() {
    const kernel = new Kernel();
    const uiActionService = new UIActionService();
    const layoutService = new LayoutService();
    const editorService = new EditorService();
    const workspaceActionService = createWorkspaceActionServiceStub();
    const fileSystem = createFileSystemStub();
    const splitViewService = new SplitViewServiceStub();

    kernel.registerService(ServiceId.UI_ACTIONS, uiActionService, true);
    kernel.registerService(ServiceId.LAYOUT, layoutService, true);
    kernel.registerService(ServiceId.EDITOR, editorService, true);
    kernel.registerService(ServiceId.WORKSPACE_ACTIONS, workspaceActionService, true);
    kernel.registerService(ServiceId.FILE_SYSTEM, fileSystem, true);
    kernel.registerService(ServiceId.SPLIT_VIEW, splitViewService, true);

    const disposers = [
        ...registerCoreUIActions(kernel),
        ...registerEditorUIActions(kernel),
        ...registerExplorerUIActions(kernel),
        ...registerSplitViewUIActions(kernel, splitViewService as never),
        ...registerSettingsUIActions(kernel),
    ];

    return {
        kernel,
        uiActionService,
        layoutService,
        editorService,
        workspaceActionService,
        fileSystem,
        splitViewService,
        dispose: () => disposers.forEach((dispose) => dispose()),
    };
}

describe('UIActionService', () => {
    it('应支持动作注册、执行、错误返回与清理', async () => {
        const service = new UIActionService();
        const success = vi.fn();
        const dispose = service.registerAction({
            id: 'test.action',
            title: 'test',
            run: success,
        });

        expect(service.has('test.action')).toBe(true);
        expect((await service.execute('test.action')).ok).toBe(true);
        expect(success).toHaveBeenCalledTimes(1);

        const failureDispose = service.registerAction({
            id: 'test.failure',
            title: 'failure',
            run: () => {
                throw new Error('boom');
            },
        });

        expect(await service.execute('missing.action')).toEqual({
            ok: false,
            reason: 'UI action not found: missing.action',
        });
        expect(await service.execute('test.failure')).toEqual({
            ok: false,
            reason: 'boom',
        });

        dispose();
        failureDispose();
        expect(service.has('test.action')).toBe(false);
    });

    it('应执行第一批正式 UI 动作并维持模块职责边界', async () => {
        const {
            kernel,
            uiActionService,
            layoutService,
            editorService,
            workspaceActionService,
            fileSystem,
            splitViewService,
            dispose,
        } = createHarness();

        const focusSpy = vi.fn();
        const saveAsSpy = vi.fn();
        const settingsSpy = vi.fn();
        const explorerSelectSpy = vi.fn();
        kernel.on(CoreEvents.EDITOR_FOCUS, focusSpy);
        kernel.on(CoreEvents.APP_CMD_SAVE_AS, saveAsSpy);
        kernel.on(CoreEvents.APP_SHOW_SETTINGS_DIALOG, settingsSpy);
        kernel.on(CoreEvents.EXPLORER_SELECT_PATH, explorerSelectSpy);

        expect(await uiActionService.execute(UIActionId.FOCUS_EDITOR)).toEqual({ ok: true });
        expect(focusSpy).toHaveBeenCalledTimes(1);

        expect(await uiActionService.execute(UIActionId.SHOW_SAVE_AS_DIALOG)).toEqual({ ok: true });
        expect(saveAsSpy).toHaveBeenCalledTimes(1);

        expect(await uiActionService.execute(UIActionId.OPEN_SETTINGS)).toEqual({ ok: true });
        expect(settingsSpy).toHaveBeenCalledTimes(1);

        expect(layoutService.getState().sidebarVisible).toBe(true);
        expect(await uiActionService.execute(UIActionId.TOGGLE_LEFT_SIDEBAR)).toEqual({ ok: true });
        expect(layoutService.getState().sidebarVisible).toBe(false);
        expect(await uiActionService.execute(UIActionId.TOGGLE_LEFT_SIDEBAR, { visible: true })).toEqual({ ok: true });
        expect(layoutService.getState().sidebarVisible).toBe(true);

        expect(await uiActionService.execute(UIActionId.SET_VIEW_MODE, { mode: 'source' })).toEqual({ ok: true });
        expect(editorService.getState().viewMode).toBe('source');

        splitViewService.setSplitView(true);
        expect(await uiActionService.execute(UIActionId.SET_VIEW_MODE, { mode: 'preview' })).toEqual({
            ok: false,
            reason: 'Preview view mode is unavailable while split view is active.',
        });

        expect(await uiActionService.execute(UIActionId.TOGGLE_SPLIT_VIEW, { value: false })).toEqual({ ok: true });
        expect(splitViewService.isSplitView).toBe(false);

        expect(await uiActionService.execute(UIActionId.OPEN_FILE, { path: 'C:/workspace/docs/a.md' })).toEqual({ ok: true });
        expect(workspaceActionService.openFile).toHaveBeenCalledWith('C:/workspace/docs/a.md');

        expect(await uiActionService.execute(UIActionId.REVEAL_IN_EXPLORER, { path: 'C:/workspace/docs/a.md' })).toEqual({ ok: true });
        expect(explorerSelectSpy).toHaveBeenCalledWith('C:/workspace/docs/a.md');
        expect(fileSystem.showItemInFolder).toHaveBeenCalledWith('C:/workspace/docs/a.md');

        dispose();
    });
});
