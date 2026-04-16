/**
 * 测试范围：web-page 文档的真实 Electron 源码视图 / 页面视图闭环
 * 测试类型：E2E / 冒烟 / 回归
 * 测试目的：验证页面文档在真实程序中可被识别、切换到页面视图、完成基础渲染，并可安全切回源码视图
 * 防回归问题：扩展插件被自动发现但不生效、页面按钮不出现、页面 iframe 不渲染、视图切换后内容丢失
 * 关键不变量：
 * - `type: web-page` 文档必须出现“切换到页面视图”入口
 * - 切换后必须渲染页面标题与按钮
 * - 页面脚本必须可执行
 * - 返回源码视图后原始文档内容仍存在
 */
import { expect, test } from '@playwright/test';

import {
    createWebPageWorkspace,
    launchElectronApp,
    prepareElectronWorkspace,
} from '../test_helpers/launchElectronApp';

test('web-page 文档应完成源码视图与页面视图最小闭环', async () => {
    const workspace = await createWebPageWorkspace();
    const session = await launchElectronApp();

    try {
        await prepareElectronWorkspace(session.page, workspace.rootDir, workspace.notePath);

        const editorContent = session.page.locator('.cm-content').first();
        await expect(editorContent).toBeVisible({ timeout: 20000 });
        await expect(editorContent).toContainText('type: web-page');
        await expect(editorContent).toContainText('<template>');

        const enterPageViewButton = session.page.locator('.web-page-toggle-btn');
        await expect(enterPageViewButton).toBeVisible({ timeout: 10000 });
        await enterPageViewButton.click();

        const pageViewTitle = session.page.getByText('Sunset Landing');
        await expect(pageViewTitle).toBeVisible({ timeout: 10000 });

        const frame = session.page.frameLocator('iframe[title="Sunset Landing"]');
        await expect(frame.getByText('Build warm, visual landing pages inside your notes.')).toBeVisible();
        await expect(frame.getByRole('button', { name: 'Launch Demo' })).toBeVisible();

        await frame.getByRole('button', { name: 'Launch Demo' }).click();
        await expect(frame.getByRole('button', { name: 'Demo Running' })).toBeVisible();
        await expect(session.page.getByText('当前节点: hero-primary')).toBeVisible({ timeout: 10000 });

        const exitButton = session.page.locator('.web-page-exit-btn');
        await expect(exitButton).toBeVisible();
        await exitButton.click();

        await expect(session.page.locator('.web-page-overlay')).toBeHidden({ timeout: 10000 });
        await expect(editorContent).toContainText('hero-primary');
        await expect(editorContent).toContainText('Launch Demo');
    } finally {
        await session.close();
        await workspace.cleanup();
    }
});
