import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

import type { ElectronApplication, Page } from 'playwright';
import { _electron as electron } from 'playwright';

import { CoreEvents } from '../../../src/kernel/core/Events';
import { ServiceId } from '../../../src/kernel/core/ServiceId';

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(CURRENT_DIR, '../../..');
const FIXTURE_ROOT = path.resolve(REPO_ROOT, 'tests/fixtures/editor-governance');

export interface IElectronTestSession {
    electronApp: ElectronApplication;
    page: Page;
    close(): Promise<void>;
}

export interface IEditorGovernanceWorkspace {
    rootDir: string;
    notePath: string;
    cleanup(): Promise<void>;
    replaceCurrentFileFromOutside(): Promise<void>;
}

export interface IWebPageWorkspace {
    rootDir: string;
    notePath: string;
    cleanup(): Promise<void>;
}

export async function launchElectronApp(): Promise<IElectronTestSession> {
    const launchEnv: NodeJS.ProcessEnv = {
        ...process.env,
        NODE_ENV: 'development',
    };
    delete launchEnv.ELECTRON_RUN_AS_NODE;

    const electronApp = await electron.launch({
        args: ['.', '--test-mode'],
        cwd: REPO_ROOT,
        env: launchEnv,
    });

    const page = await waitForMainWindow(electronApp);
    await page.waitForFunction(() => Boolean((window as any).Kernel && (window as any).electronAPI));

    return {
        electronApp,
        page,
        close: async () => {
            await electronApp.close();
        },
    };
}

async function waitForMainWindow(electronApp: ElectronApplication): Promise<Page> {
    const deadline = Date.now() + 15000;

    while (Date.now() < deadline) {
        const existingWindow = electronApp
            .windows()
            .find(window => !window.url().startsWith('devtools://'));

        if (existingWindow) {
            await existingWindow.waitForLoadState('domcontentloaded');
            return existingWindow;
        }

        await new Promise(resolve => setTimeout(resolve, 200));
    }

    throw new Error('Timed out waiting for Electron main window');
}

export async function prepareElectronWorkspace(page: Page, rootDir: string, filePath: string): Promise<void> {
    await page.evaluate(
        async ({ nextRootDir, nextFilePath, workspaceServiceId, explorerServiceId, openFileEvent }) => {
            const kernel = (window as any).Kernel;
            const workspaceService = kernel.getService(workspaceServiceId);
            const explorerService = kernel.getService(explorerServiceId);

            workspaceService.setProjectRoot(nextRootDir);
            const tree = await (window as any).electronAPI.readDirectoryTree(nextRootDir);
            explorerService.setFileTree(tree);
            kernel.emit(openFileEvent, nextFilePath);
        },
        {
            nextRootDir: rootDir,
            nextFilePath: filePath,
            workspaceServiceId: ServiceId.WORKSPACE,
            explorerServiceId: ServiceId.EXPLORER,
            openFileEvent: CoreEvents.OPEN_FILE,
        },
    );
}

export async function createEditorGovernanceWorkspace(): Promise<IEditorGovernanceWorkspace> {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xiao-a-note-governance-'));
    const externalDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xiao-a-note-governance-external-'));
    const notePath = path.join(rootDir, 'note.md');
    const originalFixture = path.join(FIXTURE_ROOT, 'original.md');
    const overwriteFixture = path.join(FIXTURE_ROOT, 'overwrite.md');

    await fs.copyFile(originalFixture, notePath);

    let replacementCounter = 0;

    return {
        rootDir,
        notePath,
        cleanup: async () => {
            await fs.rm(rootDir, { recursive: true, force: true });
            await fs.rm(externalDir, { recursive: true, force: true });
        },
        replaceCurrentFileFromOutside: async () => {
            replacementCounter += 1;
            const replacementPath = path.join(externalDir, `overwrite-${replacementCounter}.md`);
            await fs.copyFile(overwriteFixture, replacementPath);
            await fs.rm(notePath, { force: true });
            await fs.rename(replacementPath, notePath);
        },
    };
}

export async function createWebPageWorkspace(): Promise<IWebPageWorkspace> {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xiao-a-note-web-page-'));
    const notePath = path.join(rootDir, 'landing.md');
    const fixturePath = path.join(FIXTURE_ROOT, 'web-page-demo.md');

    await fs.copyFile(fixturePath, notePath);

    return {
        rootDir,
        notePath,
        cleanup: async () => {
            await fs.rm(rootDir, { recursive: true, force: true });
        },
    };
}
