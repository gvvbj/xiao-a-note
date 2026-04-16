/**
 * 测试范围：真实 Electron 程序下的外部同名覆盖、覆盖解决提示、二次保存保护与重新加载链路
 * 测试类型：E2E / 回归
 * 测试目的：在真实程序、真实磁盘、真实 watch 回调下验证“只有外部覆盖才进入冲突链路”，并确认暂时保留后的保存保护仍然有效
 * 防回归问题：治理前出现过“保存/切换/重命名误报覆盖”，治理后仍需防止“真实外部覆盖检测不到”或“保留后继续保存会静默覆盖磁盘”
 * 关键不变量：
 * - 外部同名覆盖当前文件时必须弹出“文件已被外部覆盖”提示
 * - 用户选择“暂时保留”后，编辑区仍保留旧内容
 * - 保留冲突后继续手动保存，必须弹出二次保护，而不是直接写盘
 * - 用户选择“重新加载”后，编辑区必须回到磁盘最新内容
 * 边界说明：
 * - 不覆盖普通外部修改、重命名、移动等非覆盖场景
 * - 不覆盖多标签混合冲突与非当前标签覆盖
 * 依赖与限制（如有）：
 * - 依赖 Playwright 直接拉起 Electron 程序
 * - 依赖 Windows 下真实 fs.watch 时序；为稳定复现，测试使用“外部目录准备新文件 -> 删除目标 -> rename 到目标”模拟同名覆盖替换
 */
import { expect, test, type Locator } from '@playwright/test';

import {
    createEditorGovernanceWorkspace,
    launchElectronApp,
    prepareElectronWorkspace,
} from '../test_helpers/launchElectronApp';

async function waitForEditorReady(editorContent: Locator): Promise<void> {
    await expect(editorContent).toBeVisible({ timeout: 20000 });
}

async function expectEditorTextContains(editorContent: Locator, expectedText: string): Promise<void> {
    await expect
        .poll(async () => {
            const text = await editorContent.evaluate(node => node.textContent ?? '');
            return text.replace(/\u200b/g, ' ').replace(/\s+/g, ' ').trim();
        })
        .toContain(expectedText);
}

test('外部同名覆盖当前文件时应弹解决提示并允许暂时保留旧内容', async () => {
    const workspace = await createEditorGovernanceWorkspace();
    const session = await launchElectronApp();

    try {
        await prepareElectronWorkspace(session.page, workspace.rootDir, workspace.notePath);

        const editorContent = session.page.locator('.cm-content').first();
        await waitForEditorReady(editorContent);
        await expectEditorTextContains(editorContent, 'Original');

        await workspace.replaceCurrentFileFromOutside();

        const resolutionDialog = session.page.getByText('文件已被外部覆盖');
        await expect(resolutionDialog).toBeVisible({ timeout: 15000 });
        await session.page.getByRole('button', { name: '暂时保留' }).click();

        await expect(resolutionDialog).toBeHidden({ timeout: 10000 });
        await expectEditorTextContains(editorContent, 'Original');
        await expectEditorTextContains(editorContent, 'item one');
    } finally {
        await session.close();
        await workspace.cleanup();
    }
});

test('暂时保留外部覆盖冲突后手动保存应进入二次保护并允许重新加载最新内容', async () => {
    const workspace = await createEditorGovernanceWorkspace();
    const session = await launchElectronApp();

    try {
        await prepareElectronWorkspace(session.page, workspace.rootDir, workspace.notePath);

        const editorContent = session.page.locator('.cm-content').first();
        await waitForEditorReady(editorContent);
        await expectEditorTextContains(editorContent, 'Original');

        await workspace.replaceCurrentFileFromOutside();

        const resolutionDialog = session.page.getByText('文件已被外部覆盖');
        await expect(resolutionDialog).toBeVisible({ timeout: 15000 });
        await session.page.getByRole('button', { name: '暂时保留' }).click();
        await expect(resolutionDialog).toBeHidden({ timeout: 10000 });

        await editorContent.click();
        await session.page.keyboard.type('\nLocal delta');
        await expectEditorTextContains(editorContent, 'Local delta');

        await session.page.keyboard.press('ControlOrMeta+KeyS');

        const saveProtectionDialog = session.page.getByText('检测到外部覆盖冲突');
        await expect(saveProtectionDialog).toBeVisible({ timeout: 10000 });
        await session.page.getByRole('button', { name: '重新加载' }).click();

        await expect(saveProtectionDialog).toBeHidden({ timeout: 10000 });
        await expectEditorTextContains(editorContent, 'Overwrite');
        await expectEditorTextContains(editorContent, 'replacement one');
        await expect(editorContent).not.toContainText('Local delta');
    } finally {
        await session.close();
        await workspace.cleanup();
    }
});
