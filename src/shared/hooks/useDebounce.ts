import { useEffect, useRef } from 'react';

/**
 * 防抖 Hook
 * @param fn 需要执行的函数
 * @param delay 延迟时间 (毫秒)
 * @param deps 依赖数组，当依赖变化时重置计时器
 */
export function useDebounce(fn: () => void, delay: number, deps: any[]) {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    // 每次依赖变化或组件重新渲染时，清除上一次的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 设置新的定时器
    timeoutRef.current = setTimeout(() => {
      fn();
    }, delay);

    // 清理函数：组件卸载时清除定时器
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay, ...deps]);
}