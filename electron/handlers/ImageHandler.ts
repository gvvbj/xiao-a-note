/**
 * ImageHandler - 图片处理器
 * 
 * [Phase 9] 后端架构重构
 * 
 * 职责:
 * - 图片保存 (fs:saveImage)
 * - 临时图片保存 (fs:saveTempImage)
 * 
 * 设计原则:
 * - 单一职责: 仅处理图片相关操作
 * - 无硬编码: 使用 channels.ts 常量
 */

import { ipcMain, app } from 'electron';
import fs from 'fs';
import path from 'path';
import { IMAGE_CHANNELS } from '../constants/channels';
import { MainLoggerHandler } from './MainLoggerHandler';

export class ImageHandler {
    private static instance: ImageHandler | null = null;
    private static isRegistered = false;

    private tempDir: string;
    private logger = MainLoggerHandler.initialize();
    private ns = 'ImageHandler';

    /**
     * 初始化图片处理器（单例）
     */
    static initialize(): ImageHandler {
        if (ImageHandler.isRegistered) {
            return ImageHandler.instance!;
        }

        ImageHandler.instance = new ImageHandler();
        ImageHandler.isRegistered = true;
        return ImageHandler.instance;
    }

    private constructor() {
        const basePath = path.dirname(app.getPath('exe'));
        this.tempDir = process.env.NODE_ENV === 'development'
            ? path.resolve('.', 'temp_images')
            : path.join(basePath, 'temp_images');

        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }

        this.registerHandlers();
    }

    private registerHandlers() {
        this.logger.info(this.ns, 'Registering handlers...');

        // 保存图片到指定目录
        ipcMain.handle(IMAGE_CHANNELS.FS_SAVE_IMAGE, async (_event, targetDir, buffer, fileName) => {
            try {
                if (!fs.existsSync(targetDir)) {
                    await fs.promises.mkdir(targetDir, { recursive: true });
                }
                const fullPath = path.join(targetDir, fileName);
                await fs.promises.writeFile(fullPath, Buffer.from(buffer));
                return { success: true, path: fullPath };
            } catch (err: unknown) {
                const error = err as Error;
                return { success: false, error: error.message };
            }
        });

        // 保存临时图片
        ipcMain.handle(IMAGE_CHANNELS.FS_SAVE_TEMP_IMAGE, async (_event, buffer, fileName) => {
            try {
                if (!fs.existsSync(this.tempDir)) {
                    fs.mkdirSync(this.tempDir, { recursive: true });
                }
                const fullPath = path.join(this.tempDir, fileName);
                await fs.promises.writeFile(fullPath, Buffer.from(buffer));
                return { success: true, path: fullPath };
            } catch (err: unknown) {
                const error = err as Error;
                return { success: false, error: error.message };
            }
        });

        this.logger.info(this.ns, 'Handlers registered successfully.');
    }
}
