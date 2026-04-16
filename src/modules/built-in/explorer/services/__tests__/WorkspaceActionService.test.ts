/**
 * 测试范围：WorkspaceActionService 工作区读取与变更计划能力
 * 测试类型：单元 / 回归
 * 测试目的：守护 AI 工作区动作层的读写边界，确保变更计划在工作区根目录内受控执行，并与已打开标签/当前编辑器保持一致。
 * 防回归问题：越界路径被误放行、脏文档被工作区计划覆盖、计划应用后标签内容未同步、打开文件动作未走统一事件链。
 * 关键不变量：
 * - 读取与变更计划必须限制在 projectRoot 内
 * - 当前活动脏文档不能被工作区变更计划直接覆盖
 * - 计划应用后已打开标签与当前活动文档状态保持同步
 * - openFile() 通过 CoreEvents.OPEN_FILE 触发，而不是直接操作 UI/DOM
 * 边界说明：
 * - 不覆盖真实 Electron IPC 和主进程文件系统
 * - 不覆盖 UI 动作总线与后续 AI 任务层
 * 依赖与限制（如有）：
 * - 使用轻量 fileSystem/tab/lifecycle stub，验证动作层语义
 */

import { describe, expect, it } from 'vitest';
import { EventEmitter } from 'events';
import { Kernel } from '@/kernel/core/Kernel';
import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import { EditorService } from '@/kernel/services/EditorService';
import type { IEditorTab, IFileSystem, ITabService } from '@/kernel/interfaces';
import { WorkspaceService } from '@/kernel/services/WorkspaceService';
import { EDITOR_CONSTANTS } from '@/modules/built-in/editor/constants/EditorConstants';
import { EditorEvents } from '@/modules/built-in/editor/constants/EditorEvents';
import type { ILifecycleService } from '@/modules/interfaces';
import { WorkspaceActionService } from '../WorkspaceActionService';

class TabServiceStub extends EventEmitter implements ITabService {
    private tabs: IEditorTab[] = [];
    private activeTabId: string | null = null;

    getTabs(): IEditorTab[] {
        return [...this.tabs];
    }

    getActiveTabId(): string | null {
        return this.activeTabId;
    }

    setActiveTab(id: string | null): void {
        this.activeTabId = id;
    }

    openTab(path: string, name: string): void {
        const existing = this.tabs.find((tab) => tab.id === path);
        if (existing) {
            this.activeTabId = existing.id;
            return;
        }

        const tab: IEditorTab = { id: path, path, name, isDirty: false };
        this.tabs.push(tab);
        this.activeTabId = path;
    }

    closeTab(id: string): void {
        this.tabs = this.tabs.filter((tab) => tab.id !== id);
        if (this.activeTabId === id) {
            this.activeTabId = this.tabs[0]?.id ?? null;
        }
    }

    closeAllTabs(): void {
        this.tabs = [];
        this.activeTabId = null;
    }

    setTabDirty(id: string, isDirty: boolean): void {
        this.tabs = this.tabs.map((tab) => (tab.id === id ? { ...tab, isDirty } : tab));
    }

    updateTabContent(id: string, content: string, isDirty?: boolean): void {
        this.tabs = this.tabs.map((tab) => (
            tab.id === id
                ? { ...tab, content, isDirty: isDirty ?? tab.isDirty }
                : tab
        ));
    }

    reorderTabs(): void {}

    updateTabPath(oldPath: string, newPath: string): void {
        this.tabs = this.tabs.map((tab) => (
            tab.id === oldPath
                ? { ...tab, id: newPath, path: newPath, name: newPath.split(/[\\/]/).pop() || tab.name }
                : tab
        ));
        if (this.activeTabId === oldPath) {
            this.activeTabId = newPath;
        }
    }

    setTabCursor(id: string, cursorPosition: number, scrollTop: number, topLineNumber?: number, topOffset?: number): void {
        this.tabs = this.tabs.map((tab) => (
            tab.id === id ? { ...tab, cursorPosition, scrollTop, topLineNumber, topOffset } : tab
        ));
    }

    getTab(id: string): IEditorTab | undefined {
        return this.tabs.find((tab) => tab.id === id);
    }

    getTabContent(id: string): string | undefined {
        return this.getTab(id)?.content;
    }

    clearTabContent(id: string): void {
        this.tabs = this.tabs.map((tab) => (tab.id === id ? { ...tab, content: undefined, isDirty: false } : tab));
    }
}

class LifecycleServiceStub implements ILifecycleService {
    constructor(private state: ReturnType<ILifecycleService['getState']>) {}

    getState() {
        return this.state;
    }

    async switchFile(): Promise<void> {}

    setUnsaved(dirty: boolean): void {
        this.state = {
            ...this.state,
            isUnsaved: dirty,
        };
    }

    skipNextLoadOnce(): void {}

    setState(state: ReturnType<ILifecycleService['getState']>): void {
        this.state = state;
    }
}

function createFileSystemStub(): IFileSystem & {
    calls: Array<{ method: string; args: unknown[] }>;
    files: Map<string, string>;
    directories: Set<string>;
} {
    const files = new Map<string, string>();
    const directories = new Set<string>();
    const calls: Array<{ method: string; args: unknown[] }> = [];

    return {
        calls,
        files,
        directories,
        async readFile(path: string) {
            calls.push({ method: 'readFile', args: [path] });
            if (!files.has(path)) return { success: false, error: 'missing' };
            return { success: true, content: files.get(path) };
        },
        async saveFile(path: string, content: string) {
            calls.push({ method: 'saveFile', args: [path, content] });
            files.set(path, content);
            return { success: true };
        },
        async openDirectory() { return null; },
        async openFile() { return null; },
        async readDirectoryTree(path: string) {
            calls.push({ method: 'readDirectoryTree', args: [path] });
            return [{ path, isDirectory: true }];
        },
        async showSaveDialog() { return null; },
        async saveImage() { return { success: false, error: 'not-implemented' }; },
        async saveTempImage() { return { success: false, error: 'not-implemented' }; },
        getFilePath() { return ''; },
        async createFile(path: string, content = '') {
            calls.push({ method: 'createFile', args: [path, content] });
            files.set(path, content);
            return { success: true, path };
        },
        async createDirectory(path: string) {
            calls.push({ method: 'createDirectory', args: [path] });
            directories.add(path);
            return { success: true, path };
        },
        async rename(oldPath: string, newPath: string) {
            calls.push({ method: 'rename', args: [oldPath, newPath] });
            if (files.has(oldPath)) {
                files.set(newPath, files.get(oldPath)!);
                files.delete(oldPath);
            }
            if (directories.has(oldPath)) {
                directories.add(newPath);
                directories.delete(oldPath);
            }
            return { success: true };
        },
        async delete(path: string) {
            calls.push({ method: 'delete', args: [path] });
            files.delete(path);
            directories.delete(path);
            return { success: true };
        },
        async move(srcPath: string, destPath: string) {
            calls.push({ method: 'move', args: [srcPath, destPath] });
            return { success: true };
        },
        async copy(srcPath: string, destPath: string) {
            calls.push({ method: 'copy', args: [srcPath, destPath] });
            return { success: true };
        },
        async checkExists(path: string) {
            calls.push({ method: 'checkExists', args: [path] });
            return files.has(path) || directories.has(path);
        },
        async showItemInFolder() {},
        async getUserDataPath() { return 'C:\\Users\\test\\AppData\\Roaming\\xiao-a-note'; },
        async exportToPDF() { return { success: false, error: 'not-implemented' }; },
        async exportToWord() { return { success: false, error: 'not-implemented' }; },
        async exportToZip() { return { success: false, error: 'not-implemented' }; },
        async getAllMarkdownFiles() { return []; },
        async getDirname(path: string) { return path.split(/[\\/]/).slice(0, -1).join('\\'); },
        async pathJoin(...args: string[]) { return args.join('\\'); },
        async openExternal() {},
        async getThemeList() { return []; },
        async readThemeFile() { return ''; },
        async watch() {},
        onWatchEvent() { return () => {}; },
        async getExternalPluginList() { return []; },
        async readPluginCode() { return { success: false, error: 'not-implemented' }; },
        async readPluginDirectory() { return {}; },
        async loadWasm() { return null; },
    };
}

function setupWorkspaceActionService() {
    const kernel = new Kernel();
    const workspaceService = new WorkspaceService();
    workspaceService.setProjectRoot('C:\\workspace');
    kernel.registerService(ServiceId.WORKSPACE, workspaceService, true);

    const editorService = new EditorService();
    kernel.registerService(ServiceId.EDITOR, editorService, true);

    const tabService = new TabServiceStub();
    kernel.registerService(ServiceId.TAB, tabService, true);

    const lifecycleService = new LifecycleServiceStub({
        activePath: null,
        loadedPath: null,
        status: 'idle',
        initialContent: '',
        isUnsaved: false,
        lastError: null,
    });
    kernel.registerService(EDITOR_CONSTANTS.SERVICE_NAMES.LIFECYCLE, lifecycleService, true);

    const fileSystem = createFileSystemStub();
    kernel.registerService(ServiceId.FILE_SYSTEM, fileSystem, true);

    const workspaceActionService = new WorkspaceActionService(kernel);
    return { kernel, workspaceActionService, workspaceService, editorService, tabService, lifecycleService, fileSystem };
}

describe('WorkspaceActionService', () => {
    it('应在 projectRoot 内读取目录树和文件内容', async () => {
        const { workspaceActionService, fileSystem } = setupWorkspaceActionService();
        fileSystem.files.set('C:\\workspace\\docs\\a.md', '# a');

        const tree = await workspaceActionService.readDirectoryTree();
        const content = await workspaceActionService.readFile('C:\\workspace\\docs\\a.md');

        expect(tree).toEqual([{ path: 'C:\\workspace', isDirectory: true }]);
        expect(content).toBe('# a');
    });

    it('应生成并预览工作区变更计划，且拒绝越界路径', async () => {
        const { workspaceActionService } = setupWorkspaceActionService();

        const plan = await workspaceActionService.stageChangePlan([
            { path: 'C:\\workspace\\docs\\new.md', kind: 'create', content: '# new' },
        ]);

        expect((await workspaceActionService.previewChangePlan(plan.id)).changes).toEqual([
            { path: 'C:\\workspace\\docs\\new.md', kind: 'create', content: '# new' },
        ]);
        await expect(workspaceActionService.stageChangePlan([
            { path: 'C:\\outside\\hack.md', kind: 'create', content: 'x' },
        ])).rejects.toThrow(/outside project root/i);
    });

    it('应用更新计划后应同步已打开标签和当前活动文档快照', async () => {
        const { kernel, workspaceActionService, tabService, lifecycleService, editorService, fileSystem } = setupWorkspaceActionService();
        const targetPath = 'C:\\workspace\\docs\\note.md';
        fileSystem.files.set(targetPath, 'old');
        tabService.openTab(targetPath, 'note.md');
        tabService.updateTabContent(targetPath, 'old', true);
        tabService.setTabCursor(targetPath, 4, 12, 2, 6);
        editorService.setCurrentFile(targetPath);
        lifecycleService.setUnsaved(false);
        lifecycleService.setState({
            activePath: targetPath,
            loadedPath: targetPath,
            status: 'idle',
            initialContent: 'old',
            isUnsaved: false,
            lastError: null,
        });

        const lifecyclePayloads: Array<{ path: string; content: string; isUnsaved: boolean }> = [];
        kernel.on(EditorEvents.LIFECYCLE_FILE_LOADED, (payload) => lifecyclePayloads.push(payload));

        const plan = await workspaceActionService.stageChangePlan([
            { path: targetPath, kind: 'update', content: 'new content' },
        ]);
        await workspaceActionService.applyChangePlan(plan.id);

        expect(fileSystem.files.get(targetPath)).toBe('new content');
        expect(tabService.getTabContent(targetPath)).toBe('new content');
        expect(tabService.getTab(targetPath)?.isDirty).toBe(false);
        expect(lifecyclePayloads).toHaveLength(1);
        expect(lifecyclePayloads[0]).toMatchObject({
            path: targetPath,
            content: 'new content',
            isUnsaved: false,
        });
    });

    it('活动脏文档受影响时应拒绝应用工作区变更计划', async () => {
        const { workspaceActionService, editorService, lifecycleService } = setupWorkspaceActionService();
        const targetPath = 'C:\\workspace\\docs\\dirty.md';
        editorService.setCurrentFile(targetPath);
        editorService.setUnsaved(true);
        lifecycleService.setState({
            activePath: targetPath,
            loadedPath: targetPath,
            status: 'idle',
            initialContent: 'dirty',
            isUnsaved: true,
            lastError: null,
        });

        const plan = await workspaceActionService.stageChangePlan([
            { path: targetPath, kind: 'update', content: 'overwrite' },
        ]);

        await expect(workspaceActionService.applyChangePlan(plan.id)).rejects.toThrow(/dirty document/i);
    });

    it('openFile 应走统一 OPEN_FILE 事件链，delete 计划应触发标签存在性复检', async () => {
        const { kernel, workspaceActionService, fileSystem } = setupWorkspaceActionService();
        const opened: Array<string | null> = [];
        let existenceCheckCount = 0;
        const targetPath = 'C:\\workspace\\docs\\open.md';
        fileSystem.files.set(targetPath, '# open');

        kernel.on(CoreEvents.OPEN_FILE, (path) => opened.push(path));
        kernel.on(CoreEvents.CHECK_TABS_EXISTENCE, () => {
            existenceCheckCount += 1;
        });

        await workspaceActionService.openFile(targetPath);
        const plan = await workspaceActionService.stageChangePlan([
            { path: targetPath, kind: 'delete' },
        ]);
        await workspaceActionService.applyChangePlan(plan.id);

        expect(opened).toEqual([targetPath]);
        expect(existenceCheckCount).toBe(1);
    });
});
