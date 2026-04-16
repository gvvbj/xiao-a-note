import { Kernel } from "@/kernel/core/Kernel";
import { EDITOR_CONSTANTS } from '../../../../constants/EditorConstants';
import { ServiceId } from '@/kernel/core/ServiceId';
import { IFileSystem } from "@/kernel/interfaces/IFileSystem";
import { INoteService, ISaveResult, IReplacement } from "@/modules/interfaces";
import { loggerService } from '@/kernel/services/LoggerService';

const logger = loggerService.createLogger('NoteService');

// Re-export types for backward compatibility
export type Replacement = IReplacement;
export type SaveResult = ISaveResult;

/**
 * NoteService - 笔记核心业务服务
 * 负责文件读写、资产迁移及持久化策略
 */
export class NoteService implements INoteService {
    private kernel: Kernel;
    // private fileSystem: IFileSystem | null; // Removed

    constructor(kernel: Kernel) {
        this.kernel = kernel;
        // Lazily fetched
    }

    private get fileSystem(): IFileSystem | undefined {
        return this.kernel.getService<IFileSystem>(ServiceId.FILE_SYSTEM, false);
    }

    /**
     * 读取文件内容
     */
    async readFile(path: string): Promise<string> {
        if (!this.fileSystem) throw new Error("FileSystem not available");
        const res = await this.fileSystem.readFile(path);
        if (res.success && typeof res.content === 'string') {
            return res.content;
        }
        throw new Error(res.error || "Failed to read file");
    }

    /**
     * 处理资产并保存文件
     * 
     * 资产迁移逻辑已移至 ImagePlugin/AssetTransformer
     * 本服务现只负责纯文件读写
     */
    async saveFile(targetPath: string, content: string): Promise<SaveResult> {
        if (!this.fileSystem) return { savedContent: content, replacements: [] };

        const result = await this.fileSystem.saveFile(targetPath, content);

        if (!result.success) {
            logger.error(`Disk write FAILED for ${targetPath}`, result.error);
            throw new Error(result.error || `Failed to save file to ${targetPath}`);
        }

        return { savedContent: content, replacements: [] };
    }

    /**
     * 另存为
     */
    async saveAs(currentPath: string | null, content: string): Promise<string | null> {
        if (!this.fileSystem) return null;

        let defaultName = EDITOR_CONSTANTS.DEFAULT_FILENAME;
        if (currentPath && !currentPath.startsWith(EDITOR_CONSTANTS.UNTITLED_PREFIX)) {
            defaultName = currentPath.split(/[/\\]/).pop() || EDITOR_CONSTANTS.DEFAULT_FILENAME;
        }

        const savePath = await this.fileSystem.showSaveDialog({ defaultPath: defaultName });
        if (savePath) {
            await this.saveFile(savePath, content);
            return savePath;
        }
        return null;
    }
}
