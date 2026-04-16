/**
 * 从 PNG 源文件生成包含所有标准尺寸的 ICO 文件
 * 使用 Electron 的 nativeImage 来调整大小
 * 
 * 运行方式: npx electron scripts/generate-ico.cjs
 */

const fs = require('fs');
const path = require('path');

const SOURCE_ICO = path.join(__dirname, '..', 'resources', 'icons', 'app图标.ico');
const OUTPUT_ICO = path.join(__dirname, '..', 'resources', 'icons', 'app图标.ico');

// 读取现有 ICO 并解析
const buf = fs.readFileSync(SOURCE_ICO);
const iconCount = buf.readUInt16LE(4);

console.log(`当前 ICO: ${iconCount} 个图标`);

const entries = [];
for (let i = 0; i < iconCount; i++) {
    const off = 6 + i * 16;
    const w = buf[off] || 256;
    const h = buf[off + 1] || 256;
    const bpp = buf.readUInt16LE(off + 6);
    const dataSize = buf.readUInt32LE(off + 8);
    const dataOffset = buf.readUInt32LE(off + 12);

    entries.push({ w, h, bpp, dataSize, dataOffset });
    console.log(`  ${w}x${h} bpp=${bpp} size=${dataSize}`);
}

// 检查是否已经有 16x16
const has16 = entries.some(e => e.w === 16);
if (has16) {
    console.log('ICO 已包含 16x16 图标，无需修改');
    process.exit(0);
}

// 从 32x32 的 BMP 数据创建 16x16 版本
// 找到 32x32 的入口
const src32 = entries.find(e => e.w === 32);
if (!src32) {
    console.error('找不到 32x32 源图标');
    process.exit(1);
}

// 读取 32x32 的 BMP 数据
const bmpData = buf.slice(src32.dataOffset, src32.dataOffset + src32.dataSize);

// 检查是否是 PNG 格式（如果 dataSize 开头是 \x89PNG）
const isPng = bmpData[0] === 0x89 && bmpData[1] === 0x50;

if (isPng) {
    console.log('32x32 图标是 PNG 格式，简单缩放不可行，使用最近邻采样');
}

// 对于 BMP 格式的 ICO 条目：
// 结构: BITMAPINFOHEADER (40 bytes) + pixel data + mask data
// 我们需要创建一个 16x16 的 BMP 条目

// 简单方案：使用 PNG 子图（如果是 PNG）直接嵌入
// 如果是 BMP 格式，用简单的缩放

if (!isPng) {
    // BMP 格式: 创建 16x16 缩放版本
    // BITMAPINFOHEADER 结构
    const biSize = bmpData.readUInt32LE(0);          // 40
    const biWidth = bmpData.readInt32LE(4);           // 32
    const biHeight = bmpData.readInt32LE(8);          // 64 (height * 2 for XOR + AND mask)
    const biBitCount = bmpData.readUInt16LE(14);      // 32

    console.log(`BMP header: size=${biSize} width=${biWidth} height=${biHeight} bpp=${biBitCount}`);

    const srcWidth = 32;
    const srcHeight = 32;
    const dstWidth = 16;
    const dstHeight = 16;

    // 像素数据从 header (40 bytes) 后开始  
    const headerSize = 40;
    const srcRowBytes = srcWidth * 4; // BGRA
    const dstRowBytes = dstWidth * 4;

    // 创建 16x16 的缩放像素数据（2x2 averaging）
    const dstPixels = Buffer.alloc(dstHeight * dstRowBytes);

    for (let y = 0; y < dstHeight; y++) {
        for (let x = 0; x < dstWidth; x++) {
            // 2x2 box 采样
            let r = 0, g = 0, b = 0, a = 0;
            for (let dy = 0; dy < 2; dy++) {
                for (let dx = 0; dx < 2; dx++) {
                    const sy = y * 2 + dy;
                    const sx = x * 2 + dx;
                    const srcOff = headerSize + sy * srcRowBytes + sx * 4;
                    b += bmpData[srcOff];
                    g += bmpData[srcOff + 1];
                    r += bmpData[srcOff + 2];
                    a += bmpData[srcOff + 3];
                }
            }
            const dstOff = y * dstRowBytes + x * 4;
            dstPixels[dstOff] = (b / 4) | 0;
            dstPixels[dstOff + 1] = (g / 4) | 0;
            dstPixels[dstOff + 2] = (r / 4) | 0;
            dstPixels[dstOff + 3] = (a / 4) | 0;
        }
    }

    // AND mask: 每行 ceil(width/32)*4 字节
    const andMaskRowBytes = Math.ceil(dstWidth / 32) * 4; // = 4 for 16px
    const andMask = Buffer.alloc(dstHeight * andMaskRowBytes, 0); // 全 0 = 全不透明

    // 构建 16x16 BMP 数据
    const newHeader = Buffer.alloc(40);
    newHeader.writeUInt32LE(40, 0);              // biSize
    newHeader.writeInt32LE(dstWidth, 4);          // biWidth
    newHeader.writeInt32LE(dstHeight * 2, 8);     // biHeight (XOR + AND)
    newHeader.writeUInt16LE(1, 12);               // biPlanes
    newHeader.writeUInt16LE(32, 14);              // biBitCount
    newHeader.writeUInt32LE(0, 16);               // biCompression (BI_RGB)
    newHeader.writeUInt32LE(dstPixels.length + andMask.length, 20); // biSizeImage
    // rest are 0 (biXPels, biYPels, biClrUsed, biClrImportant)

    const newBmpData = Buffer.concat([newHeader, dstPixels, andMask]);

    // 构建新 ICO 文件: 原有 5 个 + 新 16x16 = 6 个
    const newCount = iconCount + 1;
    const newDirSize = 6 + newCount * 16; // header + directory
    const newBuf = Buffer.alloc(newDirSize + newBmpData.length + buf.length - (6 + iconCount * 16));

    // ICO header
    newBuf.writeUInt16LE(0, 0);     // reserved
    newBuf.writeUInt16LE(1, 2);     // type (1=ICO)
    newBuf.writeUInt16LE(newCount, 4); // count

    // 16x16 新条目 (放在第一个)
    const dirOff = 6;
    newBuf[dirOff] = 16;              // width
    newBuf[dirOff + 1] = 16;          // height
    newBuf[dirOff + 2] = 0;           // color palette
    newBuf[dirOff + 3] = 0;           // reserved
    newBuf.writeUInt16LE(1, dirOff + 4);    // color planes
    newBuf.writeUInt16LE(32, dirOff + 6);   // bpp
    newBuf.writeUInt32LE(newBmpData.length, dirOff + 8);  // data size

    // 数据偏移量: 目录之后就是 16x16 数据
    const newDataStartOffset = newDirSize;
    newBuf.writeUInt32LE(newDataStartOffset, dirOff + 12);

    // 旧条目 (偏移量需要重算)
    const oldDirStart = 6; // in old file
    const shiftAmount = 16 + newBmpData.length; // 多了一个目录条目(16) + 新 BMP 数据
    for (let i = 0; i < iconCount; i++) {
        const oldOff = oldDirStart + i * 16;
        const newOff = 6 + (i + 1) * 16; // shift by 1 (new entry is first)
        buf.copy(newBuf, newOff, oldOff, oldOff + 12); // copy first 12 bytes
        const oldDataOffset = buf.readUInt32LE(oldOff + 12);
        newBuf.writeUInt32LE(oldDataOffset + shiftAmount, newOff + 12); // adjusted offset
    }

    // 写入 16x16 数据
    newBmpData.copy(newBuf, newDataStartOffset);

    // 写入旧数据（从旧的目录结束位置开始）
    const oldDataStart = 6 + iconCount * 16;
    buf.copy(newBuf, newDataStartOffset + newBmpData.length, oldDataStart);

    // 备份原文件
    fs.copyFileSync(SOURCE_ICO, SOURCE_ICO + '.bak');
    // 写入新文件
    fs.writeFileSync(OUTPUT_ICO, newBuf);
    console.log(`\n新 ICO 已生成: ${newBuf.length} bytes, ${newCount} 个图标`);

    // 验证
    const verify = fs.readFileSync(OUTPUT_ICO);
    const vc = verify.readUInt16LE(4);
    console.log(`验证: ${vc} 个图标`);
    for (let i = 0; i < vc; i++) {
        const o = 6 + i * 16;
        const w = verify[o] || 256;
        const h = verify[o + 1] || 256;
        console.log(`  ${w}x${h} bpp=${verify.readUInt16LE(o + 6)} size=${verify.readUInt32LE(o + 8)}`);
    }
} else {
    console.error('32x32 是 PNG 格式，需要使用图像处理库。请手动添加 16x16 图标。');
    process.exit(1);
}
