import { Kernel, type IUIComponent, type KernelEvents } from '@/kernel/core/Kernel';
import { UISlotId } from '@/kernel/core/Constants';
import { ServiceId } from '@/kernel/core/ServiceId';
import type { ILogger } from '@/kernel/services/LoggerService';
import {
    getSandboxAllowedMethods,
    getSandboxDeniedServiceHint,
    isSandboxEventAllowed,
    isSandboxServiceAllowed,
    isSandboxServiceProxied,
} from '../policies/SandboxAccessPolicy';

type SandboxActorType = 'plugin' | 'ui';

export interface ISandboxActorDescriptor {
    actorId: string;
    actorType: SandboxActorType;
    logger: ILogger;
}

export interface ICreateSandboxKernelProxyOptions extends ISandboxActorDescriptor {
    kernel: Kernel;
    on: (event: string, handler: (...args: unknown[]) => void) => (() => void) | void;
    off: (event: string, handler: (...args: unknown[]) => void) => void;
    allowGetUI?: boolean;
    getUI?: (slotId: UISlotId) => IUIComponent[];
}

function formatActorLabel(descriptor: ISandboxActorDescriptor): string {
    if (descriptor.actorType === 'ui') {
        return '扩展组件';
    }

    return `扩展插件 "${descriptor.actorId}"`;
}

function toKernelEventName(event: string): keyof KernelEvents {
    return event as keyof KernelEvents;
}

function createSandboxedServiceProxy<T>(
    serviceId: string,
    original: T,
    descriptor: ISandboxActorDescriptor
): T {
    const allowedMethods = getSandboxAllowedMethods(serviceId);
    if (allowedMethods.length === 0) {
        return original;
    }

    return new Proxy(original as object, {
        get(target, prop) {
            if (typeof prop === 'symbol' || prop === 'then') {
                return Reflect.get(target, prop);
            }

            if (allowedMethods.includes(prop as string)) {
                const value = Reflect.get(target, prop);
                return typeof value === 'function' ? value.bind(target) : value;
            }

            const targetValue = Reflect.get(target, prop);
            if (typeof targetValue !== 'function' && prop in target) {
                return targetValue;
            }

            descriptor.logger.warn(
                `[Sandbox] ${formatActorLabel(descriptor)}尝试访问 ${serviceId}.${String(prop)}，已拦截。`
            );

            if (serviceId === ServiceId.FILE_SYSTEM) {
                return (..._args: unknown[]) =>
                    Promise.reject(new Error(`Sandbox: fileSystem.${String(prop)} 不允许扩展插件调用`));
            }

            return (..._args: unknown[]) => undefined;
        }
    }) as T;
}

export function getSandboxedService<T>(
    kernel: Kernel,
    serviceId: string,
    descriptor: ISandboxActorDescriptor
): T | undefined {
    if (isSandboxServiceAllowed(serviceId)) {
        return kernel.getService<T>(serviceId, false);
    }

    if (isSandboxServiceProxied(serviceId)) {
        const original = kernel.getService<T>(serviceId, false);
        if (!original) {
            return undefined;
        }
        return createSandboxedServiceProxy(serviceId, original, descriptor);
    }

    const deniedHint = getSandboxDeniedServiceHint(serviceId);
    if (deniedHint) {
        descriptor.logger.warn(
            `[Sandbox] ${formatActorLabel(descriptor)}请求被禁止的服务 "${serviceId}"。${deniedHint}`
        );
        return undefined;
    }

    descriptor.logger.warn(
        `[Sandbox] ${formatActorLabel(descriptor)}请求未授权的服务 "${serviceId}"。如需使用请联系开发者将其加入白名单。`
    );
    return undefined;
}

export function emitSandboxedEvent(
    kernel: Kernel,
    event: string,
    args: unknown[],
    descriptor: ISandboxActorDescriptor
): boolean {
    if (!isSandboxEventAllowed(event)) {
        descriptor.logger.warn(
            `[Sandbox] ${formatActorLabel(descriptor)}尝试发射未授权事件 "${event}"，已拦截。`
        );
        return false;
    }

    kernel.emit(toKernelEventName(event), ...(args as []));
    return true;
}

export function createSandboxKernelProxy(options: ICreateSandboxKernelProxyOptions): Kernel {
    const { kernel, logger } = options;

    return new Proxy(kernel, {
        get(target, prop) {
            if (prop === 'emit') {
                return (event: string, ...args: unknown[]) =>
                    emitSandboxedEvent(kernel, event, args, options);
            }

            if (prop === 'getService') {
                return <T = unknown>(serviceId: string) =>
                    getSandboxedService<T>(kernel, serviceId, options);
            }

            if (prop === 'on') {
                return (event: string, handler: (...args: unknown[]) => void) => {
                    const dispose = options.on(event, handler);
                    return typeof dispose === 'function'
                        ? dispose
                        : () => options.off(event, handler);
                };
            }

            if (prop === 'off') {
                return (event: string, handler: (...args: unknown[]) => void) => {
                    options.off(event, handler);
                };
            }

            if (prop === 'getUI' && options.allowGetUI && options.getUI) {
                return (slotId: UISlotId) => options.getUI?.(slotId) ?? [];
            }

            if (typeof prop === 'symbol' || prop === 'then') {
                return Reflect.get(target, prop);
            }

            logger.warn(
                `[Sandbox] ${formatActorLabel(options)}尝试访问 kernel.${String(prop)}，已拦截。`
            );
            return undefined;
        }
    }) as Kernel;
}
