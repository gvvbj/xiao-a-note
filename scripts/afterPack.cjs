/**
 * electron-builder afterPack 钩子
 * 在打包完成后，使用 rcedit 将自定义图标和版本信息嵌入到可执行文件中。
 * 
 * 当 signAndEditExecutable 为 false 时（因 winCodeSign 符号链接权限问题），
 * electron-builder 不会自动嵌入图标和版本字符串。此脚本作为后处理步骤完成嵌入。
 * 
 * 注意：rcedit-x64.exe CLI 工具在处理含中文字符的文件路径时可能静默失败。
 * 因此将 ICO 文件复制到临时 ASCII 路径后再调用 rcedit。
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { rcedit } = require('rcedit');

/** 最大重试次数 */
const MAX_RETRIES = 3;

/** 重试间隔（毫秒），依次递增 */
const RETRY_DELAYS = [500, 1000, 2000];

/**
 * 带重试的文件复制
 * 
 * electron-builder 在 afterPack 期间可能仍持有目标文件的句柄，
 * 导致 copyFileSync 因文件锁而失败。此函数通过延迟重试来解决。
 * 
 * @param {string} src - 源文件路径
 * @param {string} dest - 目标文件路径
 */
async function copyFileWithRetry(src, dest) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            fs.copyFileSync(src, dest);
            return; // 成功
        } catch (err) {
            if (attempt >= MAX_RETRIES) {
                throw err; // 超过最大重试次数
            }
            const delay = RETRY_DELAYS[attempt] || 1000;
            console.log(`  • [afterPack] 文件复制暂时失败，${delay}ms 后重试 (${attempt + 1}/${MAX_RETRIES})...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

exports.default = async function afterPack(context) {
    // 只在 Windows 平台处理
    if (context.electronPlatformName !== 'win32') {
        return;
    }

    const appInfo = context.packager.appInfo;
    const exePath = path.join(
        context.appOutDir,
        `${appInfo.productFilename}.exe`
    );

    const iconPath = path.join(
        context.appOutDir,
        '..', '..', 'resources', 'icons', 'app图标.ico'
    );

    console.log(`  • [afterPack] 正在嵌入图标和版本信息到: ${exePath}`);
    console.log(`  • [afterPack] 图标源文件: ${iconPath}`);

    // 将 ICO 文件和 EXE 复制到临时 ASCII 路径，避免 rcedit CLI 中文路径问题
    const tmpDir = path.join(os.tmpdir(), 'afterpack-rcedit-' + Date.now());
    fs.mkdirSync(tmpDir, { recursive: true });

    const tmpIco = path.join(tmpDir, 'app-icon.ico');
    const tmpExe = path.join(tmpDir, 'app.exe');

    try {
        // 复制 ICO 到临时 ASCII 路径
        if (fs.existsSync(iconPath)) {
            fs.copyFileSync(iconPath, tmpIco);
            console.log(`  • [afterPack] ICO 已复制到临时路径: ${tmpIco}`);
        } else {
            console.warn(`  • [afterPack] 警告: 图标文件不存在: ${iconPath}`);
        }

        // 复制 EXE 到临时 ASCII 路径（带重试，应对文件锁）
        await copyFileWithRetry(exePath, tmpExe);
        console.log(`  • [afterPack] EXE 已复制到临时路径: ${tmpExe}`);

        // 构建 rcedit 选项：图标 + 版本信息字符串
        const options = {
            'version-string': {
                ProductName: appInfo.productName || '小A笔记',
                FileDescription: appInfo.productName || '小A笔记',
                CompanyName: appInfo.companyName || 'Xiao A Note',
                LegalCopyright: appInfo.copyright || 'Copyright © 2024 Xiao A Note',
                OriginalFilename: `${appInfo.productFilename}.exe`,
                InternalName: appInfo.productName || '小A笔记',
            },
            'product-version': appInfo.version || '4.11.0',
            'file-version': appInfo.version || '4.11.0',
        };

        // 添加图标（使用临时 ASCII 路径）
        if (fs.existsSync(tmpIco)) {
            options.icon = tmpIco;
        }

        // 在临时路径上执行 rcedit
        await rcedit(tmpExe, options);
        console.log('  • [afterPack] rcedit 执行成功');

        // 将修改后的 EXE 复制回原路径（带重试，应对文件锁）
        await copyFileWithRetry(tmpExe, exePath);
        console.log('  • [afterPack] 修改后的 EXE 已复制回原路径');

    } catch (err) {
        console.error('  • [afterPack] 嵌入失败:', err.message);
        // 不抛出异常，允许构建继续
    } finally {
        // 清理临时文件
        try {
            if (fs.existsSync(tmpIco)) fs.unlinkSync(tmpIco);
            if (fs.existsSync(tmpExe)) fs.unlinkSync(tmpExe);
            fs.rmdirSync(tmpDir);
        } catch (e) {
            // 忽略清理错误
        }
    }
};

