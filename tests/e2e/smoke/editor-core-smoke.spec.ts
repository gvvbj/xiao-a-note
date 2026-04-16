/**
 * 测试范围：编辑器主界面启动、标题栏菜单、主编辑区输入与基础未保存状态
 * 测试类型：冒烟 / E2E / 回归
 * 测试目的：确认浏览器态 Playwright 宿主注入后，应用能够稳定启动并完成最基础的主链路交互
 * 防回归问题：F 阶段浏览器态测试环境缺少 electronAPI 导致启动失败；核心 UI 或主编辑区无法完成基础输入
 * 关键不变量：
 * - 应用启动后必须渲染标题栏菜单、主编辑区、引擎切换入口
 * - 用户在主编辑区输入内容后，文本应可见且未保存状态应出现
 * 边界说明：
 * - 不覆盖真实 Electron 文件对话框、真实文件系统 watch、真实外部覆盖链路
 * - 不覆盖保存保护与外部冲突状态机的完整真实 IO 行为
 * 依赖与限制（如有）：
 * - 依赖 Playwright 注入最小 electronAPI 宿主 mock
 * - 依赖浏览器态 Vite 运行环境，不等同于完整 Electron 打包环境
 */
import { expect, test } from '@playwright/test';
import { installElectronApiMock } from '../test_helpers/installElectronApiMock';

test.beforeEach(async ({ page }) => {
    await installElectronApiMock(page);
    await page.goto('/');
});

test('应渲染核心应用骨架与标题栏菜单', async ({ page }) => {
    await expect(page.getByRole('button', { name: '文件' })).toBeVisible();
    await expect(page.getByRole('button', { name: '语法格式' })).toBeVisible();
    await expect(page.getByRole('button', { name: '快捷键' })).toBeVisible();
    await expect(page.getByRole('button', { name: '主题', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '切换编辑器引擎' })).toBeVisible();
    await expect(page.locator('.cm-editor').first()).toBeVisible();
});

test('应允许用户在主编辑区输入内容', async ({ page }) => {
    const editorContent = page.locator('.cm-content').first();

    await expect(editorContent).toBeVisible();
    await editorContent.click();
    await page.keyboard.type('Smoke Test');

    await expect(editorContent).toContainText('Smoke Test');
});
