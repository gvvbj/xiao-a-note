const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const srcExtensionsDir = path.join(rootDir, 'src', 'modules', 'extensions');
const outPluginsDir = path.join(rootDir, 'plugins');

console.log('🚀 Starting extension compilation...');

// 1. 确保目标目录存在
if (!fs.existsSync(outPluginsDir)) {
    fs.mkdirSync(outPluginsDir, { recursive: true });
}

// --- 智能合体 (Smart Bundling) 配置 ---
// 这些库由内核统一提供，不应打包进插件，以减小体积并确保单例运行
const EXTERNAL_MODULES = [
    // --- 必须单例的库（多实例会导致运行时冲突） ---
    'react',
    'react-dom',
    'react/jsx-runtime',
    'lucide-react',
    '@codemirror/state',
    '@codemirror/view',
    '@codemirror/language',
    // --- 必须与宿主共享的内核模块（事件单例 + 上下文引用） ---
    '@/kernel/core/KernelContext',
    '@/kernel/core/Events',
    '@/kernel/system/plugin/types'
];

/**
 * 智能构建插件
 * 对每个具有 index.ts/tsx 的插件执行 Bundling
 */
async function buildExtensions() {
    const extensions = fs.readdirSync(srcExtensionsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory());

    for (const ext of extensions) {
        const extSrcDir = path.join(srcExtensionsDir, ext.name);
        const extDestDir = path.join(outPluginsDir, ext.name);

        // 查找入口文件
        const entryFile = ['index.ts', 'index.tsx'].find(f => fs.existsSync(path.join(extSrcDir, f)));

        if (!entryFile) {
            console.warn(`⚠️  Skipping ${ext.name}: No index.ts/tsx found.`);
            continue;
        }

        const srcPath = path.join(extSrcDir, entryFile);
        const destPath = path.join(extDestDir, 'index.js');

        if (!fs.existsSync(extDestDir)) fs.mkdirSync(extDestDir, { recursive: true });

        try {
            // 使用 esbuild --bundle 模式
            // --bundle: 将非 external 的依赖全部合体
            // --external: 排除内核基座库
            const externals = EXTERNAL_MODULES.map(m => `--external:${m}`).join(' ');
            const esbuildCmd = `npx esbuild "${srcPath}" --outfile="${destPath}" --bundle ${externals} --format=cjs --platform=browser --target=esnext`;

            execSync(esbuildCmd, { stdio: 'pipe' });
            console.log(`⚡ Bundled: ${ext.name} -> index.js (Smart Bundling active)`);

            // 拷贝 manifest.json
            const manifestPath = path.join(extSrcDir, 'manifest.json');
            if (fs.existsSync(manifestPath)) {
                fs.copyFileSync(manifestPath, path.join(extDestDir, 'manifest.json'));
                console.log(`📄 Copied manifest for ${ext.name}`);
            }

            // 拷贝其它非代码资源 (可选，如 CSS, 图片)
            // 这里暂不实现递归拷贝，保持轻量
        } catch (e) {
            console.error(`❌ Failed to bundle ${ext.name}:`, e.message);
        }
    }
}

console.log('📦 Executing Smart Bundling...');
buildExtensions().then(() => {
    console.log('✅ All done! Plugins are self-contained and ready in /plugins.');
    process.exit(0);
});
