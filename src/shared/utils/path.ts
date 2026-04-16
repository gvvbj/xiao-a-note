/**
 * path.ts
 * 
 * 客户端同步路径处理工具，避免 IPC 异步调用导致的 UI 闪烁。
 */

/**
 * 获取文件路径的目录名 (同步版)
 */
export function getDirnameSync(filePath: string): string {
    if (!filePath) return '';

    // 处理 Windows 和 Unix 路径
    const normalized = filePath.replace(/\\/g, '/');
    const parts = normalized.split('/');

    // 如果是根目录或者一个独立文件名
    if (parts.length <= 1) return normalized;

    // 移除最后一项 (文件名)
    parts.pop();

    // 重新连接，注意如果是 Windows 盘符开头的情况
    let dirname = parts.join('/') || '/';

    // 还原 Windows 风格（如果输入是 Windows 风格）
    if (filePath.includes('\\')) {
        return dirname.replace(/\//g, '\\');
    }

    return dirname;
}

/**
 * 路径规范化：统一使用正斜杠并转为小写 (针对 Windows 盘符一致性)
 */
export function normalizePath(path: string): string {
    return path.replace(/\\/g, '/').toLowerCase();
}
