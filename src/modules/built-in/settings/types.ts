/**
 * 设置项类型定义
 * 
 * 遵循原则:
 * - 0 硬编码: 配置项通过 registerSettings 动态注册
 * - Plugin-First: 每个插件可注册自己的配置项
 */

/**
 * 配置项类型
 */
export type SettingType = 'number' | 'boolean' | 'string' | 'select';

/**
 * 配置项描述符
 */
export interface ISettingItem {
    /** 唯一标识符 (如 'editor.fontSize') */
    id: string;
    /** 显示标签 */
    label: string;
    /** 配置项类型 */
    type: SettingType;
    /** 默认值 */
    defaultValue: any;
    /** 描述文本 */
    description?: string;
    /** 分组 (用于 UI 分类显示) */
    group?: string;
    /** 排序权重 */
    order?: number;
    /** 对于 select 类型的选项 */
    options?: { label: string; value: any }[];
    /** 对于 number 类型的范围 */
    min?: number;
    max?: number;
    step?: number;
}

/**
 * 设置分组
 */
export interface ISettingGroup {
    id: string;
    label: string;
    order?: number;
}

/**
 * 内部使用：带注册源信息的配置项
 */
export interface IRegisteredSetting extends ISettingItem {
    pluginId: string;
}
