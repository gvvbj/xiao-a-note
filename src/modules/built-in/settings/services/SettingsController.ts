/**
 * SettingsController - 设置控制器
 * 
 * 从 index.tsx 剥离的业务逻辑
 * 
 * 职责:
 * 1. 监听 SETTING_CHANGED 事件并持久化
 * 2. 注册核心配置项
 * 
 * 遵循原则:
 * - Plugin-First: 业务逻辑集中在 Controller
 * - 0 硬编码: 配置项定义使用结构化数据
 */

import { Kernel } from '@/kernel/core/Kernel';
import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import { SettingsService } from '@/kernel/services/SettingsService';
import { ISettingItem, IRegisteredSetting } from '../types';

export class SettingsController {
    private kernel: Kernel;
    private logger: any;
    private pluginId: string;
    private registerService: (id: string, service: any) => () => void;
    private cleanups: (() => void)[] = [];

    constructor(
        kernel: Kernel,
        pluginId: string,
        registerService: (id: string, service: any) => () => void,
        logger?: any
    ) {
        this.kernel = kernel;
        this.pluginId = pluginId;
        this.registerService = registerService;
        this.logger = logger;
    }

    /**
     * 初始化控制器
     */
    init(): void {
        // 1. 初始化设置注册表（使用正式服务注册，不挂载私有属性）
        if (!this.kernel.hasService(ServiceId.SETTINGS_REGISTRY)) {
            this.registerService(ServiceId.SETTINGS_REGISTRY, { items: [] as IRegisteredSetting[] });
        }

        // 2. 监听配置变更事件
        const handleSettingChange = ({ id, value }: { id: string; value: any }) => {
            this.persistSetting(id, value);
        };
        this.kernel.on(CoreEvents.SETTING_CHANGED, handleSettingChange);
        this.cleanups.push(() => this.kernel.off(CoreEvents.SETTING_CHANGED, handleSettingChange));

        // 3. 注册核心配置项
        this.registerCoreSettings();

        this.logger?.info('SettingsController 已初始化');
    }

    /**
     * 销毁控制器
     */
    dispose(): void {
        this.cleanups.forEach(cleanup => cleanup());
        this.cleanups = [];
        this.logger?.info('SettingsController 已销毁');
    }

    /**
     * 持久化设置变更
     */
    private persistSetting(id: string, value: any): void {
        const settingsService = this.kernel.getService<SettingsService>(ServiceId.SETTINGS);
        const parts = id.split('.');
        if (parts.length >= 2) {
            const namespace = parts[0];
            const property = parts.slice(1).join('.');
            settingsService.updateSettings(namespace, { [property]: value });
            this.logger?.info(`已持久化设置 ${id} = ${value}`);
        }
    }

    /**
     * 注册核心配置项
     */
    private registerCoreSettings(): void {
        const coreSettings: ISettingItem[] = [
            {
                id: 'app.autoSaveIntervalMinutes',
                label: '自动保存间隔',
                type: 'number',
                defaultValue: 1,
                description: '设置自动保存的时间间隔（分钟），0 表示禁用',
                group: 'general',
                order: 10,
                min: 0,
                max: 60,
                step: 1
            }
        ];

        const registry = this.kernel.getService<{ items: IRegisteredSetting[] }>(ServiceId.SETTINGS_REGISTRY, false);
        if (!registry) return;

        for (const setting of coreSettings) {
            registry.items.push({
                ...setting,
                pluginId: this.pluginId
            } as IRegisteredSetting);
        }
    }
}
