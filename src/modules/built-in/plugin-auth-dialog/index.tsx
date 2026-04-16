/**
 * PluginAuthDialogPlugin — 插件授权弹窗
 *
 * 内置插件，负责在第三方插件请求权限提升时展示授权弹窗。
 *
 * 流程：
 *   PluginManager emit(PLUGIN_REQUEST_AUTH) → 本插件显示弹窗
 *   → 用户操作 → 本插件 emit(PLUGIN_AUTH_RESPONSE)
 *
 * 安全等级：internal（需要完整 PluginContext 访问 Kernel）
 *
 * 注意：不再通过 window 全局暴露 Kernel 引用，改用 useKernel() hook。
 *       本插件为 internal 插件，useKernel() 返回的是完整 Kernel 实例（非受限代理）。
 */

import React, { useState, useEffect, useCallback } from 'react';
import { IPlugin, IPluginContext, PluginCategory } from '@/kernel/system/plugin/types';
import { CoreEvents } from '@/kernel/core/Events';
import { UISlotId } from '@/kernel/core/Constants';
import { ServiceId } from '@/kernel/core/ServiceId';
import { LoggerService } from '@/kernel/services/LoggerService';
import { useKernel } from '@/kernel/core/KernelContext';
import { AuthDialog } from './components/AuthDialog';
import { AuthStore } from './services/AuthStore';

/** 授权请求载荷类型 */
interface AuthRequestPayload {
    pluginId: string;
    pluginName: string;
    pluginVersion: string;
    reason?: string;
}

/**
 * 授权弹窗容器组件
 * 挂载在 EDITOR_MODALS 插槽，通过事件驱动显示/隐藏
 * 实际弹窗通过 createPortal 渲染在 document.body，不受插槽位置影响
 *
 * 通过 useKernel() 获取 Kernel 实例（internal 插件 → 完整 Kernel，非代理）
 */
function AuthDialogContainer() {
    const [request, setRequest] = useState<AuthRequestPayload | null>(null);
    const kernel = useKernel();

    useEffect(() => {
        if (!kernel) return;

        const handleRequest = (payload: AuthRequestPayload) => {
            // 先检查 localStorage 持久化决定
            const stored = AuthStore.getDecision(payload.pluginId);
            if (stored === 'always-allow') {
                // 已持久化 → 直接回复，无需弹窗
                kernel.emit(CoreEvents.PLUGIN_AUTH_RESPONSE, {
                    pluginId: payload.pluginId,
                    decision: 'always-allow'
                });
                return;
            }
            setRequest(payload);
        };

        kernel.on(CoreEvents.PLUGIN_REQUEST_AUTH, handleRequest);

        return () => {
            kernel.off(CoreEvents.PLUGIN_REQUEST_AUTH, handleRequest);
        };
    }, [kernel]);

    const handleDecision = useCallback((decision: 'allow' | 'deny' | 'always-allow') => {
        if (!request || !kernel) return;

        // 持久化 "始终允许" 决定
        if (decision === 'always-allow') {
            AuthStore.setDecision(request.pluginId, 'always-allow');
        }

        // 回复 PluginManager
        kernel.emit(CoreEvents.PLUGIN_AUTH_RESPONSE, {
            pluginId: request.pluginId,
            decision
        });

        setRequest(null);
    }, [request, kernel]);

    return (
        <AuthDialog
            isOpen={request !== null}
            pluginId={request?.pluginId || ''}
            pluginName={request?.pluginName || ''}
            pluginVersion={request?.pluginVersion || ''}
            reason={request?.reason}
            onDecision={handleDecision}
        />
    );
}

export default class PluginAuthDialogPlugin implements IPlugin {
    id = 'plugin-auth-dialog';
    name = '插件授权弹窗';
    version = '1.0.0';
    category = PluginCategory.SYSTEM;
    internal = true;
    essential = true;
    hidden = true;
    order = 1; // 极低 order，确保在所有扩展插件之前激活

    activate(context: IPluginContext) {
        const logger = context.kernel.getService<LoggerService>(ServiceId.LOGGER, false)?.createLogger('PluginAuthDialog');

        // 注册到 EDITOR_MODALS 插槽（弹窗通过 createPortal 渲染到 document.body）
        context.registerUI(UISlotId.EDITOR_MODALS, {
            id: 'plugin-auth-dialog',
            component: AuthDialogContainer,
            order: 0
        });

        logger?.info('插件授权弹窗已激活');
    }

    deactivate() {
        // 无需清理 window 全局引用 — 已改用 useKernel()
    }
}


