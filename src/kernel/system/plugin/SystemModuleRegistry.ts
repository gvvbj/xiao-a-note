import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as jsxRuntime from 'react/jsx-runtime';
import * as lucideReact from 'lucide-react';

// 导入核心业务模块
import * as KernelContext from '@/kernel/core/KernelContext';
import { CoreEvents } from '@/kernel/core/Events';
import * as PluginTypes from '@/kernel/system/plugin/types';
import * as capabilities from './capabilities';

/**
 * SystemModuleRegistry - 系统模块注册中心
 * 
 * 职责:
 * 1. 集中管理所有允许插件访问的外部库和内核模块
 * 2. 提供一种机制，将这些模块"注入"到插件沙箱中
 */
export class SystemModuleRegistry {
    private static modules: Record<string, any> = {
        // --- 基础库层 ---
        'react': React,
        'react-dom': ReactDOM,
        'react/jsx-runtime': jsxRuntime,
        'lucide-react': lucideReact,

        // --- 内核核心层 (支持路径别名) ---
        '@/kernel/core/KernelContext': KernelContext,
        '@/kernel/core/Events': { CoreEvents },
        '@/kernel/system/plugin/types': PluginTypes,
        '@/kernel/system/plugin/capabilities': capabilities
    };

    /**
     * 注册运行时模块（用于引擎插件按需注入模块导出）
     */
    public static registerRuntimeModules(modules: Record<string, unknown>): void {
        this.modules = {
            ...this.modules,
            ...modules
        };
    }

    /**
     * 获取指定名称的模块
     */
    public static getModule(name: string): any | undefined {
        return this.modules[name];
    }

    /**
     * 获取所有已注册的模块名称
     */
    public static getRegisteredNames(): string[] {
        return Object.keys(this.modules);
    }
}
