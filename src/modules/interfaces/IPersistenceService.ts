/**
 * IPersistenceService - 持久化服务接口
 * 
 * 核心契约
 * 用于解耦 PersistencePlugin 与其他消费者 (如 useEditorLogic, LifecycleService)。
 * 
 * 消费者:
 * 1. useEditorLogic: 调用 saveFile, saveAs
 * 2. TabManagerPlugin: 关闭标签页时触发保存
 * 3. KeymapPlugin: Ctrl+S 快捷键触发
 */

export interface IPersistenceService {
    /**
     * 启动持久化服务监听
     */
    start(): void;

    /**
     * 保存文件
     * @param path 文件路径
     * @param content 文件内容
     * @param silent 是否静默 (不输出日志)
     */
    saveFile(path: string, content: string, silent?: boolean): Promise<boolean>;

    /**
     * 另存为
     * @param content 文件内容
     */
    saveAs(content: string): Promise<boolean>;

    /**
     * 停止并清理
     */
    dispose(): void;
}
