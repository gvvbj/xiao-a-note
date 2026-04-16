/**
 * INoteService - 笔记核心业务服务接口
 * 
 * 核心接口定义
 * 
 * 职责:
 * 1. 文件读写操作
 * 2. 资产迁移 (临时图片 → assets/)
 * 3. 另存为功能
 */

/**
 * 资产替换记录
 */
export interface IReplacement {
    oldText: string;
    newText: string;
}

/**
 * 保存结果
 */
export interface ISaveResult {
    savedContent: string;
    replacements: IReplacement[];
}

/**
 * 笔记服务接口
 */
export interface INoteService {
    /**
     * 读取文件内容
     * @param path 文件路径
     * @returns 文件内容
     */
    readFile(path: string): Promise<string>;

    /**
     * 保存文件 (包含资产处理)
     * @param targetPath 目标路径
     * @param content 文件内容
     * @returns 保存结果 (包含处理后内容和替换记录)
     */
    saveFile(targetPath: string, content: string): Promise<ISaveResult>;

    /**
     * 另存为
     * @param currentPath 当前路径 (可为 null)
     * @param content 文件内容
     * @returns 新保存的路径或 null (用户取消)
     */
    saveAs(currentPath: string | null, content: string): Promise<string | null>;
}
