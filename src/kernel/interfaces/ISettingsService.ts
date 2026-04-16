/**
 * ISettingsService - 配置管理服务接口
 * 
 * 核心接口定义
 * 
 * 职责:
 * 1. 提供类型安全的配置读写
 * 2. 支持命名空间隔离
 * 3. 提供原子性合并更新
 */

/**
 * 配置服务接口
 */
export interface ISettingsService {
    /**
     * 获取指定命名空间下的完整配置
     * @param namespace 命名空间 (如 'plugin-states', 'editor')
     * @returns 配置对象
     */
    getSettings<T extends object>(namespace: string): T;

    /**
     * 获取单个配置项
     * @param key 配置键 (格式: 'namespace.property')
     * @param defaultValue 默认值
     * @returns 配置值或默认值
     */
    getSetting<T>(key: string, defaultValue: T): T;

    /**
     * 更新指定命名空间下的配置 (增量合并)
     * @param namespace 命名空间
     * @param updates 要更新的配置项
     */
    updateSettings<T extends object>(namespace: string, updates: Partial<T>): void;

    /**
     * 设置完整的配置对象 (覆盖)
     * @param namespace 命名空间
     * @param settings 完整配置对象
     */
    setSettings<T extends object>(namespace: string, settings: T): void;
}
