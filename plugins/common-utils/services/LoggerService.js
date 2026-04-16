"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var LoggerService_exports = {};
__export(LoggerService_exports, {
  LoggerService: () => LoggerService
});
module.exports = __toCommonJS(LoggerService_exports);
class LogContext {
  buffer = [];
  flushTimer = null;
  fileSystem;
  logFilePath = null;
  FLUSH_INTERVAL = 3e3;
  // 3秒刷盘一次
  MAX_BUFFER_SIZE = 50;
  // 50条日志触发刷盘
  MAX_FILE_SIZE = 5 * 1024 * 1024;
  // 5MB
  async init(fileSystem, rootPath) {
    this.fileSystem = fileSystem;
    const cleanRoot = rootPath.replace(/\\/g, "/");
    const logDir = `${cleanRoot}/.logs`;
    this.logFilePath = `${logDir}/app.log`;
    try {
      const dirExists = await this.fileSystem.checkExists(logDir);
      if (!dirExists) {
        const res = await this.fileSystem.createDirectory(logDir);
        if (!res.success) {
          throw new Error(`Failed to create log dir: ${res.error}`);
        }
      }
      await this.rotateLogIfNeeded();
      console.log("[Logger] Initialized file logging to:", this.logFilePath);
      this.log("INFO", "Logger", "Logging system initialized.");
      this.flush();
    } catch (e) {
      console.error("[Logger] Failed to initialize file logging:", e);
    }
  }
  log(level, namespace, message, ...args) {
    const prefix = `[${namespace}]`;
    if (level === "ERROR") console.error(prefix, message, ...args);
    else if (level === "WARN") console.warn(prefix, message, ...args);
    else console.log(prefix, message, ...args);
    try {
      const now = /* @__PURE__ */ new Date();
      const timestamp = now.toLocaleString("zh-CN", {
        timeZone: "Asia/Shanghai",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        fractionalSecondDigits: 3,
        hour12: false
      }).replace(/\//g, "-");
      const argsStr = args.map((a) => {
        try {
          if (a instanceof Error) {
            return `${a.name}: ${a.message}
Stack: ${a.stack}`;
          }
          return typeof a === "object" ? JSON.stringify(a) : String(a);
        } catch {
          return "[Circular/Obj]";
        }
      }).join(" ");
      const line = `[${timestamp}] [${level}] [${namespace}] ${message} ${argsStr}`;
      this.buffer.push(line);
      if (this.logFilePath) {
        this.checkFlush();
      }
    } catch (e) {
      console.error("[Logger] Buffer error:", e);
    }
  }
  checkFlush() {
    if (this.buffer.length >= this.MAX_BUFFER_SIZE) {
      this.flush();
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), this.FLUSH_INTERVAL);
    }
  }
  async flush() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.buffer.length === 0 || !this.fileSystem || !this.logFilePath) return;
    const linesToWrite = [...this.buffer];
    this.buffer = [];
    try {
      const exists = await this.fileSystem.checkExists(this.logFilePath);
      let content = "";
      if (exists) {
        const res = await this.fileSystem.readFile(this.logFilePath);
        content = res.content || "";
      }
      const newContent = content + (content ? "\n" : "") + linesToWrite.join("\n");
      await this.fileSystem.saveFile(this.logFilePath, newContent);
    } catch (e) {
      console.error("[Logger] Flush failed:", e);
    }
  }
  async rotateLogIfNeeded() {
    if (!this.fileSystem || !this.logFilePath) return;
    try {
      const exists = await this.fileSystem.checkExists(this.logFilePath);
      if (!exists) return;
      const res = await this.fileSystem.readFile(this.logFilePath);
      if (res.content && res.content.length > this.MAX_FILE_SIZE) {
        const backupPath = `${this.logFilePath}.old`;
        console.log("[Logger] Rotating log file...");
        if (await this.fileSystem.checkExists(backupPath)) {
          await this.fileSystem.delete(backupPath, false);
        }
        await this.fileSystem.rename(this.logFilePath, backupPath);
      }
    } catch (e) {
      console.error("[Logger] Rotation failed:", e);
    }
  }
  async forceFlush() {
    await this.flush();
  }
}
class LoggerService {
  namespace;
  context;
  constructor(namespace = "App", context) {
    this.namespace = namespace;
    this.context = context || new LogContext();
  }
  /**
   * 初始化文件日志与轮转
   */
  async init(fileSystem, rootPath) {
    await this.context.init(fileSystem, rootPath);
  }
  create(namespace) {
    return new LoggerService(namespace, this.context);
  }
  /**
   * 创建根日志服务并自动初始化
   */
  static createRoot(kernel) {
    const logger = new LoggerService("Kernel");
    logger.startFilePersistence(kernel).catch((err) => {
      logger.error("Failed to init file logging", err);
    });
    logger.enableGlobalErrorMonitoring();
    return logger;
  }
  /**
   * [Phase 10] 创建独立日志服务（无 Kernel 依赖）
   * 用于 RestrictedPluginContext 环境，仅控制台输出
   */
  static createStandalone(namespace = "App") {
    const logger = new LoggerService(namespace);
    logger.info("Logger initialized in standalone mode (no file persistence)");
    return logger;
  }
  info(message, ...args) {
    this.context.log("INFO", this.namespace, message, ...args);
  }
  warn(message, ...args) {
    this.context.log("WARN", this.namespace, message, ...args);
  }
  error(message, ...args) {
    this.context.log("ERROR", this.namespace, message, ...args);
  }
  /**
   * 强制刷盘 (用于在插件关闭或应用退出时确保日志写入)
   */
  async flush() {
    await this.context.forceFlush();
  }
  /**
   * 开启全局错误监控
   */
  enableGlobalErrorMonitoring() {
    const errorHandler = (event) => {
      this.error("Uncaught Exception", event.error || event.message);
    };
    const rejectionHandler = (event) => {
      this.error("Unhandled Rejection", event.reason);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("error", errorHandler);
      window.addEventListener("unhandledrejection", rejectionHandler);
      this._cleanupGlobalErrors = () => {
        window.removeEventListener("error", errorHandler);
        window.removeEventListener("unhandledrejection", rejectionHandler);
      };
    }
  }
  /**
   * 关闭全局错误监控
   */
  disableGlobalErrorMonitoring() {
    if (this._cleanupGlobalErrors) {
      this._cleanupGlobalErrors();
      this._cleanupGlobalErrors = void 0;
    }
  }
  /**
   * 释放资源 (关闭监控，刷盘，清理)
   */
  async dispose() {
    this.disableGlobalErrorMonitoring();
    this.info("Logger disposed.");
    await this.flush();
  }
  /**
   * 自动启动文件持久化 (包含根目录查找和 Workspace 监听)
   * @param kernel Kernel 实例，用于获取 FileSystem 和 WorkspaceService
   */
  async startFilePersistence(kernel) {
    const fileSystem = kernel.getService("fileSystem", false);
    const workspaceService = kernel.getService("workspaceService", false);
    if (fileSystem && workspaceService) {
      const findRealProjectRoot = async (startPath) => {
        let currentPath = startPath;
        const MAX_LEVELS = 3;
        for (let i = 0; i < MAX_LEVELS; i++) {
          try {
            const packageJsonPath = await fileSystem.pathJoin(currentPath, "package.json");
            const hasPackageJson = await fileSystem.checkExists(packageJsonPath);
            if (hasPackageJson) {
              return currentPath;
            }
            const parentPath = await fileSystem.getDirname(currentPath);
            if (!parentPath || parentPath === currentPath) break;
            currentPath = parentPath;
          } catch (e) {
            break;
          }
        }
        return startPath;
      };
      const init = async (provisionalRoot) => {
        if (provisionalRoot) {
          const realRoot = await findRealProjectRoot(provisionalRoot);
          await this.init(fileSystem, realRoot);
        }
      };
      const currentRoot = workspaceService.getProjectRoot();
      await init(currentRoot);
      workspaceService.on("WORKSPACE_PROJECT_ROOT_CHANGED", (newPath) => {
        init(newPath);
      });
    }
  }
}
