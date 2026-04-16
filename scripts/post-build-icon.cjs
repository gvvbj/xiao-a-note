/**
 * Post-build script to embed custom icon and metadata into the built EXE
 * Run this AFTER npm run build:electron completes
 * 
 * Usage: node scripts/post-build-icon.cjs
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const projectRoot = path.resolve(__dirname, '..');
const exePath = path.join(projectRoot, 'dist_electron', 'win-unpacked', '小A笔记.exe');
const icoPath = path.join(projectRoot, 'resources', 'icons', 'app图标.ico');
const rceditPath = path.join(projectRoot, 'node_modules', 'rcedit', 'bin', 'rcedit-x64.exe');

// Check if files exist
if (!fs.existsSync(exePath)) {
    console.error(`❌ EXE not found: ${exePath}`);
    console.log('Please run "npm run build:electron" first.');
    process.exit(1);
}

if (!fs.existsSync(icoPath)) {
    console.error(`❌ ICO not found: ${icoPath}`);
    process.exit(1);
}

if (!fs.existsSync(rceditPath)) {
    console.error(`❌ rcedit not found: ${rceditPath}`);
    console.log('Please run: npm install -D rcedit');
    process.exit(1);
}

console.log('🎨 Embedding custom icon and metadata...\n');

try {
    // Step 1: Set icon
    console.log('   [1/2] Setting icon...');
    execSync(`"${rceditPath}" "${exePath}" --set-icon "${icoPath}"`, { stdio: 'inherit' });

    // Step 2: Set version strings
    console.log('   [2/2] Setting version strings...');
    const cmd = `"${rceditPath}" "${exePath}" ` +
        `--set-version-string "OriginalFilename" "XiaoANote.exe" ` +
        `--set-version-string "FileDescription" "XiaoA Note" ` +
        `--set-version-string "ProductName" "XiaoA Note" ` +
        `--set-version-string "LegalCopyright" "Copyright 2024 XiaoANote"`;
    execSync(cmd, { stdio: 'inherit' });

    console.log('\n✅ Icon and metadata embedded successfully!');
    console.log('\n⚠️  Note: The Setup.exe installer still contains the old EXE.');
    console.log('   To update the installer, you need to repackage with electron-builder.');
} catch (error) {
    console.error('\n❌ Failed to embed icon:', error.message);
    process.exit(1);
}
