# 文件日志系统设计 (File-Based Logger Design)

## 1. 目标 (Goal)
实现将所有插件及 Kernel 的日志持久化存储到本地文件，以便在无控制台环境下排查问题。

## 2. 挑战与约束 (Challenges)
*   **API 限制**: 当前 `IFileSystem` 接口**没有** `appendFile` (追加写入) 方法，只有 `saveFile` (全量覆盖)。
*   **性能隐患**: 如果每条日志都触发一次全量文件写入，会导致极严重的 I/O 性能问题。

## 3. 解决方案 (Solution)
采用 **"内存缓冲 + 定时刷盘" (Memory Buffer + Flush)** 策略。

### 3.1 核心机制
1.  **内存队列**: `LoggerService` 内部维护一个字符串数组 `private buffer: string[] = []`。
2.  **写入策略**:
    *   **触发条件**: 每收到一条日志，推入 `buffer`。
    *   **刷盘时机**: 满足以下任一条件时触发写入:
        *   缓冲区大小超过阈值 (例如 50 条)。
        *   定时器触发 (例如每 5 秒)。
        *   页面关闭/卸载前 (尝试触发，但不保证)。
3.  **文件路径**: 默认存储在当前工作区根目录下的 `.logs/app.log`。

### 3.2 类设计增强

修改 `src/modules/extensions/common-utils/services/LoggerService.ts`:

```typescript
export class LoggerService {
    // ...
    private buffer: string[] = [];
    private flushTimer: any = null;
    private fileSystem?: IFileSystem;
    private logFilePath: string | null = null;

    // 初始化时注入 FileSystem 和路径
    init(fileSystem: IFileSystem, rootPath: string) {
        this.fileSystem = fileSystem;
        this.logFilePath = `${rootPath}/.logs/app.log`;
        // 尝试创建日志目录
    }

    private log(level: string, message: string) {
        // 1. 控制台输出
        console.log(...) 

        // 2. 也是格式化后推入 Buffer
        const line = `[${new Date().toISOString()}] [${level}] [${this.namespace}] ${message}`;
        this.buffer.push(line);

        // 3. 检查是否需要刷盘
        this.checkFlush();
    }

    private async flush() {
        if (!this.fileSystem || !this.logFilePath) return;
        
        // 读取现有内容 (因为没有 append API，只能 Read-Modify-Write)
        // 注意：随着文件变大，这会越来越慢。
        // [优化]: 鉴于 API 限制，建议仅保留最近 N 条，或者按日期轮转文件。
        // 目前 MVP: 简单追加。
        
        const existing = await this.fileSystem.readFile(this.logFilePath);
        const content = (existing.content || '') + '\n' + this.buffer.join('\n');
        
        await this.fileSystem.saveFile(this.logFilePath, content);
        this.buffer = []; // 清空
    }
}
```

## 4. 风险与规避 (Risks)
*   **并发写入**: 如果多个插件同时触发 flush，可能会有竞态条件。
    *   *规避*: `LoggerService` 是单例，所有写入通过单一通道排队。
*   **文件过大**: `readFile` -> `saveFile` 模式在文件达到 MB 级别时会卡顿。
    *   *规避*: 
        1.  **启动检查**: 每次 App 启动时，检查 `.logs/app.log` 大小。
        2.  **轮转策略**: 如果文件超过 **5MB**：
            *   将其重命名为 `app.log.old` (覆盖旧备份)。
            *   创建一个新的空 `app.log`。
        3.  这样既保留了最近的历史，又防止文件无限膨胀导致性能崩溃。
 
## 5. 执行计划
1.  修改 `LoggerService`，实现 buffer 逻辑。
2.  实现 `rotateLogFile` 方法，在 `init` 时调用。
3.  在 `CommonUtilsPlugin` 的 `activate` 中初始化 Logger，注入 `WorkspaceService` 获取根路径。
3.  更新 `task.md`。