/**
 * ImageController - 图片控制器
 * 
 * 从 index.ts 剥离的业务逻辑
 * 
 * 职责:
 * 1. 处理图片插入（按来源分流）
 * 2. 处理图片上传和路径解析
 * 
 * 分流策略:
 * - 磁盘文件（file.path 有值）: 不复制，直接引用 local-resource:///原路径
 * - 粘贴 + 已保存文件: 直接存到文件旁的 assets/ 目录，插入相对路径
 * - 粘贴 + 未保存文件: 存到 temp_images，保存时由 AssetTransformer 迁移
 */

import { EditorView } from '@codemirror/view';
import { Transaction } from '@codemirror/state';
import { IFileSystem } from '@/kernel/interfaces/IFileSystem';
import { Kernel } from '@/kernel/core/Kernel';
import { ServiceId } from '@/kernel/core/ServiceId';
import { EditorService } from '@/kernel/services/EditorService';
import { EDITOR_CONSTANTS } from '../../../../../constants/EditorConstants';

export class ImageController {
    private kernel: Kernel;

    constructor(kernel: Kernel) {
        this.kernel = kernel;
    }

    /**
     * 插入图片到编辑器（按来源分流）
     */
    async insertImage(view: EditorView, file: File): Promise<void> {
        const fileSystem = this.kernel.getService<IFileSystem>(ServiceId.FILE_SYSTEM);
        if (!fileSystem) return;

        let insertPath = '';

        // 通过 IFileSystem API 获取文件磁盘路径（Electron 环境）
        const filePath = fileSystem.getFilePath(file);

        if (filePath) {
            // === 场景 1: 磁盘文件（按钮选择/拖拽）===
            // 不复制，直接引用原始绝对路径
            insertPath = `local-resource:///${filePath.replace(/\\/g, '/')}`;
        } else {
            // === 场景 2/3: 粘贴的图片（无 file.path）===
            insertPath = await this.handlePastedImage(fileSystem, file);
        }

        if (insertPath) {
            this.insertMarkdownImage(view, insertPath);
        }
    }

    /**
     * 处理粘贴的图片
     * - 已保存文件: 直接存到 assets/ 目录，返回相对路径
     * - 未保存文件: 存到 temp_images，返回 local-resource:/// 路径
     */
    private async handlePastedImage(fileSystem: IFileSystem, file: File): Promise<string> {
        const buffer = await file.arrayBuffer();
        const fileName = `${EDITOR_CONSTANTS.DEFAULT_IMG_PREFIX}${Date.now()}.png`;

        // 获取当前文件路径
        const editorService = this.kernel.getService<EditorService>(ServiceId.EDITOR, false);
        const currentFileId = editorService?.getState().currentFileId;

        // 判断文件是否已保存（非 untitled）
        const isSaved = currentFileId && !currentFileId.startsWith(EDITOR_CONSTANTS.UNTITLED_PREFIX);

        if (isSaved) {
            // === 场景 2: 已保存文件 → 直接存到 assets/ ===
            const saveDir = await fileSystem.getDirname(currentFileId);
            const assetsDir = await fileSystem.pathJoin(saveDir, EDITOR_CONSTANTS.ASSETS_DIR);
            const res = await fileSystem.saveImage(assetsDir, buffer, fileName);
            if (res.success && res.path) {
                // 返回相对路径，不需要 local-resource:// 前缀
                return `${EDITOR_CONSTANTS.ASSETS_DIR}/${fileName}`;
            }
        } else {
            // === 场景 3: 未保存文件 → 存到 temp_images ===
            const res = await fileSystem.saveTempImage(buffer, fileName);
            if (res.success && res.path) {
                return `local-resource:///${res.path.replace(/\\/g, '/')}`;
            }
        }

        return '';
    }

    /**
     * 插入 URL 形式的图片
     */
    insertImageUrl(view: EditorView, url: string): void {
        this.insertMarkdownImage(view, url);
    }

    /**
     * 插入 Markdown 图片语法
     */
    private insertMarkdownImage(view: EditorView, path: string): void {
        const { from } = view.state.selection.main;
        const insertText = `![image](${path})`;
        view.dispatch({
            changes: { from, insert: insertText },
            selection: { anchor: from + insertText.length },
            annotations: Transaction.userEvent.of('input')
        });
        view.focus();
    }

    /**
     * 处理粘贴事件中的图片
     */
    handlePaste(event: ClipboardEvent, view: EditorView): boolean {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                event.preventDefault();
                const file = item.getAsFile();
                if (file) {
                    this.insertImage(view, file);
                    return true;
                }
            }
        }
        return false;
    }
}

