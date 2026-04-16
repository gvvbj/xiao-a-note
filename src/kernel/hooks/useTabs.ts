import { useState, useEffect, useCallback, useMemo } from 'react';
import { useKernel } from '../core/KernelContext';
import { ServiceId } from '../core/ServiceId';
import { ITabService, IEditorTab } from '../interfaces';
import { CoreEvents } from '../core/Events';

// Re-export for backward compatibility
export type EditorTab = IEditorTab;

export function useTabs() {
    const kernel = useKernel();
    const tabService = kernel.getService<ITabService>(ServiceId.TAB, false);

    const [state, setState] = useState({
        tabs: tabService ? tabService.getTabs() : [],
        activeTabId: tabService ? tabService.getActiveTabId() : null,
    });

    useEffect(() => {
        if (!tabService) return;

        const handleTabsChanged = () => {
            setState({
                tabs: tabService.getTabs(),
                activeTabId: tabService.getActiveTabId(),
            });
        };

        tabService.on(CoreEvents.TABS_CHANGED, handleTabsChanged);
        handleTabsChanged();
        return () => {
            tabService.off(CoreEvents.TABS_CHANGED, handleTabsChanged);
        };
    }, [tabService]);

    const openTab = useCallback((path: string, name: string) => tabService?.openTab(path, name), [tabService]);
    const closeTab = useCallback((id: string) => tabService?.closeTab(id), [tabService]);
    const closeAllTabs = useCallback(() => tabService?.closeAllTabs(), [tabService]);
    const closeOtherTabs = useCallback((id: string) => {
        const tabs = tabService?.getTabs() || [];
        const target = tabs.find(t => t.id === id);
        if (target) {
            tabService?.closeAllTabs();
            tabService?.openTab(target.path, target.name);
        }
    }, [tabService]);
    const setActiveTab = useCallback((id: string) => tabService?.setActiveTab(id), [tabService]);
    const setTabDirty = useCallback((id: string, isDirty: boolean) => tabService?.setTabDirty(id, isDirty), [tabService]);
    const updateTabContent = useCallback((id: string, content: string, isDirty?: boolean) => tabService?.updateTabContent(id, content, isDirty), [tabService]);
    const reorderTabs = useCallback((from: number, to: number) => tabService?.reorderTabs(from, to), [tabService]);
    const updateTabPath = useCallback((oldPath: string, newPath: string) => tabService?.updateTabPath(oldPath, newPath), [tabService]);
    const getTabs = useCallback(() => tabService?.getTabs() || [], [tabService]);
    const getTab = useCallback((id: string) => tabService?.getTab(id), [tabService]);
    const getTabContent = useCallback((id: string) => tabService?.getTabContent(id), [tabService]);
    const getTabCursor = useCallback((id: string) => {
        const tab = tabService?.getTab(id);
        return tab ? {
            cursorPosition: tab.cursorPosition,
            scrollTop: tab.scrollTop,
            topLineNumber: tab.topLineNumber,
            topOffset: tab.topOffset
        } : undefined;
    }, [tabService]);
    const clearTabContent = useCallback((id: string) => tabService?.clearTabContent(id), [tabService]);
    const setTabCursor = useCallback((id: string, pos: number, scroll: number, line?: number, offset?: number) =>
        tabService?.setTabCursor(id, pos, scroll, line, offset), [tabService]);

    return useMemo(() => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
        openTab,
        closeTab,
        closeAllTabs,
        closeOtherTabs,
        setActiveTab,
        setTabDirty,
        updateTabContent,
        reorderTabs,
        updateTabPath,
        getTabs,
        getTab,
        getTabContent,
        getTabCursor,
        clearTabContent,
        setTabCursor,
    }), [
        state.tabs,
        state.activeTabId,
        openTab,
        closeTab,
        closeAllTabs,
        closeOtherTabs,
        setActiveTab,
        setTabDirty,
        updateTabContent,
        reorderTabs,
        updateTabPath,
        getTabs,
        getTab,
        getTabContent,
        getTabCursor,
        clearTabContent,
        setTabCursor
    ]);
}
