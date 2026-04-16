import React, { createContext, useContext, useEffect, useState } from 'react';
import { Kernel, IUIComponent } from './Kernel';
import { loggerService } from '../services/LoggerService';

const kernelContextLogger = loggerService.createLogger('KernelContext');

const KernelContext = createContext<Kernel | null>(null);

/**
 * 受限 Kernel Context — 用于隔离扩展插件的 UI 组件
 * 当扩展插件通过 registerUI() 注册的 React 组件调用 useKernel() 时，
 * 返回的是受限 Proxy 而非真实 Kernel 实例
 */
const RestrictedKernelContext = createContext<Kernel | null>(null);

export function KernelProvider({ kernel, children }: { kernel: Kernel, children: React.ReactNode }) {
  return <KernelContext.Provider value={kernel}>{children}</KernelContext.Provider>;
}

/**
 * 受限 KernelProvider — 包裹扩展插件的 UI 组件
 * 使得组件内 useKernel() 返回受限 Proxy
 */
export function RestrictedKernelProvider({ proxy, children }: { proxy: Kernel, children: React.ReactNode }) {
  return <RestrictedKernelContext.Provider value={proxy}>{children}</RestrictedKernelContext.Provider>;
}

export function useKernel() {
  // 优先使用受限 Context（扩展插件 UI 组件会被包裹在 RestrictedKernelProvider 中）
  const restricted = useContext(RestrictedKernelContext);
  if (restricted) return restricted;

  const kernel = useContext(KernelContext);
  if (!kernel) throw new Error("useKernel must be used within KernelProvider");
  return kernel;
}

export function useService<T>(id: string, required: boolean = true): T | null {
  const kernel = useKernel();
  try {
    return kernel.getService<T>(id, required);
  } catch (e) {
    if (required) {
      kernelContextLogger.error(`Critical service "${id}" not found during render. This may cause white screen.`);
      throw e;
    }
    return null;
  }
}
