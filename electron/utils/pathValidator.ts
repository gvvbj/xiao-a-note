/**
 * pathValidator.ts - IPC 路径验证工具
 * 
 * [Phase 8] IPC 安全
 * 
 * 验证所有通过 IPC 传递的文件路径，防止：
 * 1. 路径遍历攻击 (../)
 * 2. 访问系统敏感目录
 * 3. 无效或恶意格式的路径
 * 
 * 设计原则:
 * - 跨平台兼容 (Windows + Linux/Mac)
 * - 不限制用户打开任意合法路径
 * - 仅阻止已知危险路径
 */

import path from 'path';
import { MainLoggerHandler } from '../handlers/MainLoggerHandler';

const logger = MainLoggerHandler.initialize();
const NS = 'PathValidator';

/**
 * Windows 系统敏感目录
 */
const WINDOWS_FORBIDDEN_DIRS = [
    'windows',
    'program files',
    'program files (x86)',
    'programdata',
    'system32',
    'syswow64'
];

/**
 * Unix 系统敏感目录
 */
const UNIX_FORBIDDEN_DIRS = [
    '/bin',
    '/sbin',
    '/usr/bin',
    '/usr/sbin',
    '/etc',
    '/var',
    '/root'
];

/**
 * 验证文件路径是否安全
 * 
 * @param filePath - 要验证的路径
 * @returns 如果路径安全则返回 true
 * 
 * @example
 * ```typescript
 * validateFilePath('C:\\Users\\doc.md') // true
 * validateFilePath('/home/user/notes') // true
 * validateFilePath('C:\\Windows\\System32\\config') // false
 * validateFilePath('../../../etc/passwd') // false
 * ```
 */
export function validateFilePath(filePath: string): boolean {
    if (!filePath || typeof filePath !== 'string') {
        return false;
    }

    // 1. 检查路径遍历攻击
    if (containsPathTraversal(filePath)) {
        logger.warn(NS, 'Path traversal detected:', filePath);
        return false;
    }

    // 2. 必须是绝对路径
    if (!path.isAbsolute(filePath)) {
        logger.warn(NS, 'Relative path rejected:', filePath);
        return false;
    }

    // 3. 标准化路径
    const normalizedPath = path.normalize(filePath);

    // 4. 检查系统敏感目录
    if (isForbiddenPath(normalizedPath)) {
        logger.warn(NS, 'Forbidden system path rejected:', normalizedPath);
        return false;
    }

    return true;
}

/**
 * 检查是否包含路径遍历符
 */
function containsPathTraversal(filePath: string): boolean {
    // 检查各种形式的 ..
    const traversalPatterns = [
        /\.\./,           // 标准 ..
        /%2e%2e/i,        // URL 编码
        /%252e%252e/i,    // 双重 URL 编码
        /\.\.%2f/i,       // 混合编码
        /\.\.%5c/i        // 混合编码 (Windows)
    ];

    return traversalPatterns.some(pattern => pattern.test(filePath));
}

/**
 * 检查是否为系统敏感路径
 */
function isForbiddenPath(normalizedPath: string): boolean {
    const lowerPath = normalizedPath.toLowerCase();

    if (process.platform === 'win32') {
        // Windows: 检查是否访问系统目录
        // 提取盘符后的路径部分
        const pathWithoutDrive = lowerPath.replace(/^[a-z]:\\/, '');

        for (const forbidden of WINDOWS_FORBIDDEN_DIRS) {
            if (pathWithoutDrive.startsWith(forbidden + '\\') ||
                pathWithoutDrive.startsWith(forbidden + '/') ||
                pathWithoutDrive === forbidden) {
                return true;
            }
        }
    } else {
        // Unix/Mac: 检查是否访问系统目录
        for (const forbidden of UNIX_FORBIDDEN_DIRS) {
            if (lowerPath.startsWith(forbidden + '/') || lowerPath === forbidden) {
                return true;
            }
        }
    }

    return false;
}

/**
 * 清理路径，移除危险字符
 * 用于在验证失败时提供安全的替代方案
 */
export function sanitizePath(filePath: string): string {
    if (!filePath) return '';

    return path.normalize(filePath)
        .replace(/\.\./g, '')  // 移除 ..
        .replace(/\/+/g, '/')  // 规范化斜杠
        .replace(/\\+/g, '\\');
}
