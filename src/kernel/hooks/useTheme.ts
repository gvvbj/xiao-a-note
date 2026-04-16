import { useState, useEffect, useCallback } from 'react';
import { useKernel } from '../core/KernelContext';
import { ServiceId } from '../core/ServiceId';
import { ThemeService, ThemeItem } from '../services/ThemeService';
import { CoreEvents } from '../core/Events';

/**
 * useTheme - 监听主题变化的 React Hook
 * 
 * 职责:
 * 1. 从内核获取 ThemeService
 * 2. 订阅 THEME_CHANGED 和 THEME_LIST_CHANGED 事件
 * 3. 自动同步主题状态到 React 组件
 */
export function useTheme() {
    const kernel = useKernel();
    const themeService = kernel.getService<ThemeService>(ServiceId.THEME, false);

    // 使用安全的初始值
    const [themeId, setThemeId] = useState(() => themeService?.getCurrentThemeId() || 'default-light');
    const [themes, setThemes] = useState<ThemeItem[]>(() => themeService?.getThemes() || [
        { id: 'default-light', name: '默认浅色', type: 'light' },
        { id: 'default-dark', name: '默认深色', type: 'dark' }
    ]);

    useEffect(() => {
        if (!themeService) return;

        // 初始同步
        setThemeId(themeService.getCurrentThemeId());
        setThemes(themeService.getThemes());

        // 订阅主题 ID 变化
        const handleThemeChanged = (newThemeId: string) => {
            setThemeId(newThemeId);
        };

        // 订阅主题列表变化
        const handleThemeListChanged = (newThemes: ThemeItem[]) => {
            setThemes(newThemes);
        };

        themeService.on(CoreEvents.THEME_CHANGED, handleThemeChanged);
        themeService.on(CoreEvents.THEME_LIST_CHANGED, handleThemeListChanged);

        return () => {
            themeService.off(CoreEvents.THEME_CHANGED, handleThemeChanged);
            themeService.off(CoreEvents.THEME_LIST_CHANGED, handleThemeListChanged);
        };
    }, [themeService]);

    const setCurrentTheme = useCallback((id: string) => {
        themeService?.setCurrentTheme(id);
    }, [themeService]);

    return {
        themeId,
        themes,
        setCurrentTheme,
        currentTheme: themes.find(t => t.id === themeId)
    };
}
