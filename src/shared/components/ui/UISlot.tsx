import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useKernel, RestrictedKernelProvider } from '@/kernel/core/KernelContext';
import { loggerService } from '@/kernel/services/LoggerService';
import { UISlotId } from '@/kernel/core/Constants';
import { CoreEvents } from '@/kernel/core/Events';
import { Kernel, IUIComponent } from '@/kernel/core/Kernel';
import { ErrorBoundary } from './ErrorBoundary';
import { createSandboxKernelProxy } from '@/kernel/system/plugin/security/sandbox/SandboxProxyFactory';

interface UISlotProps {
    id: UISlotId;
    /** 组件之间的容器样式 */
    className?: string;
    /** 单个组件项的包装容器样式 */
    itemClassName?: string;
    /** 额外的渲染参数，会透传给插槽内的组件 */
    extraProps?: any;
    /** 当没有内容时渲染的占位符 */
    fallback?: React.ReactNode;
    /** 过滤函数，用于在同一个插槽中按 metadata 分组显示 */
    filter?: (item: IUIComponent) => boolean;
    /** 显示模式：'default' (显示所有) | 'exclusive' (只显示优先级最高的一个) */
    mode?: 'default' | 'exclusive';
}

/**
 * UISlot - 动态 UI 插槽组件
 * 
 * 根据指定的插槽 ID，从 Kernel 中自动获取并渲染所有注册的 UI 组件。
 * 支持实时更新。
 * 
 * 安全增强：对 isExtension 标记的组件自动包裹 RestrictedKernelProvider，
 * 防止扩展插件通过 useKernel() 绕过沙箱机制。
 */
export const UISlot: React.FC<UISlotProps> = ({
    id,
    className,
    itemClassName,
    extraProps,
    fallback,
    filter,
    mode = 'default'
}) => {
    const kernel = useKernel();
    const [components, setComponents] = useState<IUIComponent[]>(() => kernel.getUI(id));
    const sandboxLogger = useMemo(() => loggerService.createLogger('UISlot-Sandbox'), []);

    // 创建受限 Kernel 代理（缓存，避免每次渲染重建）
    const restrictedProxy = useMemo(() => createSandboxKernelProxy({
        kernel: kernel as Kernel,
        actorId: String(id),
        actorType: 'ui',
        logger: sandboxLogger,
        on: (event, handler) => {
            kernel.on(event as never, handler as never);
        },
        off: (event, handler) => {
            kernel.off(event as never, handler as never);
        },
        allowGetUI: true,
        getUI: (slotId) => kernel.getUI(slotId),
    }), [kernel, id, sandboxLogger]);

    const updateUI = useCallback(() => {
        setComponents([...kernel.getUI(id)]);
    }, [kernel, id]);

    useEffect(() => {
        const handler = (updatedSlotId: UISlotId) => {
            if (updatedSlotId === id) {
                updateUI();
            }
        };

        kernel.on(CoreEvents.UI_UPDATED, handler);

        return () => {
            kernel.off(CoreEvents.UI_UPDATED, handler);
        };
    }, [kernel, id, updateUI]);

    const filteredComponents = filter ? components.filter(filter) : components;

    // Handle "Exclusive" Mode (Conflict Resolution II)
    // 只渲染 Order 最小（优先级最高）的一个组件
    let finalComponents = filteredComponents;
    if (mode === 'exclusive') {
        finalComponents = [...filteredComponents]
            .sort((a, b) => (a.order || 100) - (b.order || 100))
            .slice(0, 1);
    }

    if (finalComponents.length === 0) {
        // 布局稳定性优化：如果提供了 className，即使内容为空也返回容器 div 占位
        // 这样可以防止 Flex 布局在内容插槽"从无到有"时发生剧烈的 DOM 层次跳变
        return className ? <div className={className}>{fallback}</div> : <>{fallback}</>;
    }

    return (
        <div className={className}>
            {finalComponents.map((item) => {
                const Component = item.component;
                // [Defense] Ensure component exists before rendering to prevent React crash
                if (!Component) {
                    loggerService.createLogger('UISlot').error(`Malformed UI component in slot "${id}":`, item);
                    return null;
                }

                // 安全隔离：扩展插件的 UI 组件包裹在 RestrictedKernelProvider 中
                // 使得组件内 useKernel() 返回受限 Proxy 而非真实 Kernel
                const content = (
                    <ErrorBoundary>
                        <Component {...(item.props || {})} {...(extraProps || {})} />
                    </ErrorBoundary>
                );

                return (
                    <div key={item.id} className={itemClassName}>
                        {item.isExtension ? (
                            <RestrictedKernelProvider proxy={restrictedProxy}>
                                {content}
                            </RestrictedKernelProvider>
                        ) : (
                            content
                        )}
                    </div>
                );
            })}
        </div>
    );
};
