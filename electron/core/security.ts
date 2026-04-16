import path from 'path';

export class SecurityManager {
  private static instance: SecurityManager;
  private allowedDirs: Set<string> = new Set();

  private constructor() {}

  public static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  public addAllowedDir(dirPath: string) {
    // 关键优化：存入前强制规范化 (resolve/normalize)
    this.allowedDirs.add(this.normalizeForCompare(dirPath));
  }

  /**
   * 检查路径是否安全 (防止路径遍历攻击)
   */
  public validatePath(targetPath: string): boolean {
    // 开发环境放行 (可根据需要调整)
    if (process.env.NODE_ENV === 'development') return true;
    if (this.allowedDirs.size === 0) return true; // 暂无白名单时，视策略而定，此处暂放行以便初始化

    // 关键优化：比对前先规范化，消除 '..' 等相对路径
    const normalizedTarget = this.normalizeForCompare(targetPath);
    
    for (const dir of this.allowedDirs) {
      // 检查 targetPath 是否以 dir 开头
      // 且确保是目录层级的包含 (防止 /data 匹配 /data-backup)
      if (normalizedTarget.startsWith(dir + path.sep) || normalizedTarget === dir) {
        return true;
      }
    }
    
    console.warn(`[Security] 🚨 Access Denied: ${normalizedTarget}`);
    return false;
  }

  private normalizeForCompare(targetPath: string): string {
    const resolved = path.resolve(targetPath);
    // Windows 文件系统默认大小写不敏感；比较时统一小写，避免 E:\ 与 e:\ 误判。
    return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
  }
}
