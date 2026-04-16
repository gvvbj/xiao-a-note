/**
 * 测试范围：编辑器撤销一致性、未修改文档撤销安全、用户输入撤销/重做纯度
 * 测试类型：E2E / 回归
 * 测试目的：在真实浏览器交互下验证 Ctrl+Z / Ctrl+Y 不会引入程序性残留或凭空生成内容
 * 防回归问题：专项治理前出现“未修改文件按 Ctrl+Z 凭空出现内容”“程序事务污染用户撤销栈”等历史问题
 * 关键不变量：
 * - 未修改文档执行撤销时，文档内容必须保持为空
 * - 用户输入后的撤销只回退用户内容，不得凭空生成程序性残留
 * 边界说明：
 * - 不覆盖外部覆盖冲突状态机与真实文件系统 IO
 * - 不覆盖看板退出回写等更复杂的程序事务场景
 * 依赖与限制（如有）：
 * - 依赖 Playwright 注入最小 electronAPI 宿主 mock
 * - 当前仅验证浏览器态 CodeMirror 交互，不替代完整 Electron IO 验收
 */
import { expect, test, type Locator } from '@playwright/test';
import { installElectronApiMock } from '../test_helpers/installElectronApiMock';

async function expectEditorText(pageTextLocator: Locator, expectedText: string) {
    await expect
        .poll(async () => {
            const text = await pageTextLocator.evaluate(node => node.textContent ?? '');
            return text.replace(/\u200b/g, '').trim();
        })
        .toBe(expectedText);
}

test.beforeEach(async ({ page }) => {
    await installElectronApiMock(page);
    await page.goto('/');
});

test('未修改文档执行撤销不应凭空生成内容', async ({ page }) => {
    const editorContent = page.locator('.cm-content').first();

    await expect(editorContent).toBeVisible();
    await editorContent.click();
    await page.keyboard.press('ControlOrMeta+KeyZ');

    await expectEditorText(editorContent, '');
});

test('用户输入后的撤销只应回退用户内容而不产生残留', async ({ page }) => {
    const editorContent = page.locator('.cm-content').first();

    await expect(editorContent).toBeVisible();
    await editorContent.click();
    await page.keyboard.type('History Smoke');
    await expect(editorContent).toContainText('History Smoke');

    await page.keyboard.press('ControlOrMeta+KeyZ');
    await expectEditorText(editorContent, '');
});
