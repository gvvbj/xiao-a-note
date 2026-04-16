/**
 * Complete build script for Xiao A Note
 * This script:
 * 1. Builds TypeScript (electron:build)
 * 2. Builds frontend (vite build)
 * 3. Packages app without installer (electron-builder --dir)
 * 4. Embeds custom icon and metadata (rcedit)
 * 5. Creates installer (electron-builder --prepackaged)
 * 
 * Usage: node scripts/build-complete.cjs
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const projectRoot = path.resolve(__dirname, '..');
const exePath = path.join(projectRoot, 'dist_electron', 'win-unpacked', '小A笔记.exe');
const icoPath = path.join(projectRoot, 'resources', 'icons', 'app图标.ico');
const rceditPath = path.join(projectRoot, 'node_modules', 'rcedit', 'bin', 'rcedit-x64.exe');

function run(cmd, description) {
    console.log(`\n📦 ${description}...`);
    try {
        execSync(cmd, { stdio: 'inherit', cwd: projectRoot });
    } catch (error) {
        console.error(`❌ Failed: ${description}`);
        process.exit(1);
    }
}

console.log('🚀 Starting complete build process...\n');

// Step 1: Build TypeScript
run('npm run electron:build', 'Building Electron TypeScript');

// Step 2: Build frontend
run('npm run build', 'Building frontend with Vite');

// Step 3: Package app (without installer)
run('npx electron-builder --dir', 'Packaging application');

// Step 4: Embed icon and metadata
console.log('\n🎨 Embedding custom icon and metadata...');
if (!fs.existsSync(exePath)) {
    console.error(`❌ EXE not found: ${exePath}`);
    process.exit(1);
}

try {
    console.log('   Setting icon...');
    execSync(`"${rceditPath}" "${exePath}" --set-icon "${icoPath}"`, { stdio: 'pipe', cwd: projectRoot });

    console.log('   Setting version strings...');
    const cmd = `"${rceditPath}" "${exePath}" ` +
        `--set-version-string "OriginalFilename" "XiaoANote.exe" ` +
        `--set-version-string "FileDescription" "XiaoA Note" ` +
        `--set-version-string "ProductName" "XiaoA Note" ` +
        `--set-version-string "LegalCopyright" "Copyright 2024 XiaoANote"`;
    execSync(cmd, { stdio: 'pipe', cwd: projectRoot });
    console.log('   ✅ Icon and metadata embedded!');
} catch (error) {
    console.error('❌ Failed to embed icon:', error.message);
    process.exit(1);
}

// Step 5: Create installer from prepackaged directory
run('npx electron-builder --prepackaged dist_electron/win-unpacked', 'Creating installer');

console.log('\n✅ Build complete!');
console.log(`📁 Installer: dist_electron/小A笔记 Setup 0.0.0.exe`);
