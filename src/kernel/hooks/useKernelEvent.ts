import { useEffect, useRef } from 'react';
import { useKernel } from '../core/KernelContext';
import { KernelEvents } from '../core/Kernel';

type KernelEventHandlerKeys = {
    [K in keyof KernelEvents]: KernelEvents[K] extends (...args: any[]) => void ? K : never
}[keyof KernelEvents];

type KernelEventHandler<K extends KernelEventHandlerKeys> =
    Extract<KernelEvents[K], (...args: any[]) => void>;

/**
 * useKernelEvent
 * 
 * 一个类型安全且内存安全的 Hook，用于监听 Kernel 事件。
 * 自动管理事件监听器的注册和销毁。
 * 使用 useRef 保持 handler 引用，支持内联函数作为 handler 而无需 useCallback。
 * 
 * @param event 事件名称 (必须在 KernelEvents 中定义)
 * @param handler 事件处理函数 (类型为 KernelEvents[K])
 */
export function useKernelEvent<K extends KernelEventHandlerKeys>(
    event: K,
    handler: KernelEventHandler<K>
) {
    const kernel = useKernel();
    const handlerRef = useRef(handler);

    // 每次渲染更新 handler 引用，确保回调中能访问到最新的闭包变量
    useEffect(() => {
        handlerRef.current = handler;
    });

    useEffect(() => {
        // 创建一个稳定的监听器包装函数
        const listener = (...args: unknown[]) => {
            if (typeof handlerRef.current === 'function') {
                Reflect.apply(
                    handlerRef.current as (...callArgs: unknown[]) => void,
                    undefined,
                    args
                );
            }
        };
        kernel.on(event, listener as never);

        return () => {
            kernel.off(event, listener as never);
        };
    }, [kernel, event]);
}
