/**
 * SettingsService
 * 
 * 统一的配置管理服务。
 * 解决以下问题：
 * 1. 多个模块并发写入 localStorage 时的竞态条件（通过读取-合并-写入事务）。
 * 2. 提供类型安全的配置访问。
 * 3. 屏蔽底层存储细节。
 */
import { ISettingsService } from '../interfaces/ISettingsService';
import { loggerService } from './LoggerService';

const logger = loggerService.createLogger('SettingsService');

export class SettingsService implements ISettingsService {
    private readonly STORAGE_KEY_PREFIX = 'note-settings-';
    private _readOnly = false;

    /**
     * 设置只读模式（子窗口使用，防止覆盖主窗口的持久化数据）
     */
    setReadOnly(readOnly: boolean): void {
        this._readOnly = readOnly;
    }

    /**
     * 获取指定命名空间下的配置
     * @param namespace 命名空间（如 'plugin-states', 'editor-preferences'）
     * @returns 配置对象
     */
    getSettings<T extends object>(namespace: string): T {
        try {
            const key = this.STORAGE_KEY_PREFIX + namespace;
            const str = localStorage.getItem(key);
            return str ? (JSON.parse(str) as T) : ({} as T);
        } catch (e) {
            logger.error(`Failed to load settings for ${namespace}`, e);
            return {} as T;
        }
    }

    /**
     * 获取单个配置项
     */
    getSetting<T>(key: string, defaultValue: T): T {
        // key 格式: 'namespace.property'
        const [namespace, ...domainParts] = key.split('.');
        const property = domainParts.join('.');
        const settings = this.getSettings<any>(namespace);
        return settings[property] !== undefined ? settings[property] as T : defaultValue;
    }

    /**
     * 更新指定命名空间下的某项配置 (原子合并操作)
     * @param namespace 命名空间
     * @param updates 增量更新项
     */
    updateSettings<T extends object>(namespace: string, updates: Partial<T>): void {
        if (this._readOnly) return;
        try {
            const key = this.STORAGE_KEY_PREFIX + namespace;

            // 事务性合并：先读取最新，再合并，后写入
            // 这虽然不能解决真正的多线程竞争，但在单线程环境下能解决应用启动时的加载顺序问题
            const current = this.getSettings<T>(namespace);
            const next = { ...current, ...updates };

            localStorage.setItem(key, JSON.stringify(next));
        } catch (e) {
            logger.error(`Failed to update settings for ${namespace}`, e);
        }
    }

    /**
     * 设置完整的配置对象
     */
    setSettings<T extends object>(namespace: string, settings: T): void {
        if (this._readOnly) return;
        try {
            const key = this.STORAGE_KEY_PREFIX + namespace;
            localStorage.setItem(key, JSON.stringify(settings));
        } catch (e) {
            logger.error(`Failed to set settings for ${namespace}`, e);
        }
    }
}
