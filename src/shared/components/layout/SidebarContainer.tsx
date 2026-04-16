import React, { useRef } from 'react';
import { useKernel } from '@/kernel/core/KernelContext';
import { useLayout } from '@/kernel/hooks/useLayout';
import { UISlotId } from '@/kernel/core/Constants';
import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import { ResizeHandle } from '@/shared/components/ui/ResizeHandle';
import { cn } from '@/shared/utils';
import { UISlot } from '@/shared/components/ui/UISlot';
import { useService } from '@/kernel/core/KernelContext';
import { LoggerService } from '@/kernel/services/LoggerService';

export function SidebarContainer() {
    const kernel = useKernel();
    const loggerService = useService<LoggerService>(ServiceId.LOGGER, false);
    const logger = React.useMemo(() => loggerService?.createLogger('SidebarContainer'), [loggerService]);
    // 1. 使用 State 追踪侧边栏项，确保异步加载的插件注册后能触发重渲染
    const [sidebarItems, setSidebarItems] = React.useState(() => kernel.getUI(UISlotId.LEFT_SIDEBAR) || []);

    // 2. 订阅 UI 更新事件
    React.useEffect(() => {
        const handleUIUpdate = (slotId: UISlotId) => {
            if (slotId === UISlotId.LEFT_SIDEBAR) {
                logger?.info('LEFT_SIDEBAR UI updated, refreshing icons...');
                setSidebarItems([...kernel.getUI(UISlotId.LEFT_SIDEBAR)]);
            }
        };
        kernel.on(CoreEvents.UI_UPDATED, handleUIUpdate);
        return () => {
            kernel.off(CoreEvents.UI_UPDATED, handleUIUpdate);
        };
    }, [kernel]);

    const {
        sidebarVisible, sidebarWidth, activeActivity,
        setActiveActivity, setSidebarWidth, toggleSidebar,
        isZenMode
    } = useLayout();

    // 如果当前选中的插件不存在于 items 中，且 items 不为空，则切换到第一个
    React.useEffect(() => {
        if (sidebarItems.length > 0 && !sidebarItems.find(i => i.id === activeActivity)) {
            setActiveActivity(sidebarItems[0].id);
        }
    }, [sidebarItems, activeActivity, setActiveActivity]);

    const ActiveSidebarComponent = sidebarItems.find(item => item.id === activeActivity)?.component;

    // 使用 ref 实时追踪宽度，避免闭包过期导致回弹
    const widthRef = useRef(sidebarWidth);
    React.useEffect(() => {
        widthRef.current = sidebarWidth;
    }, [sidebarWidth]);


    const handleActivityClick = (id: string) => {
        if (activeActivity === id) {
            toggleSidebar();
        } else {
            setActiveActivity(id);
        }
    };

    const handleResize = (delta: number) => {
        setSidebarWidth(widthRef.current + delta);
    };

    if (isZenMode) return null;

    return (
        <>
            {/* A. Activity Bar (最左侧) */}
            <div className="w-12 bg-sidebar border-r border-border/50 flex flex-col items-center py-2 gap-2 z-20 shrink-0">
                {/* 上部：功能项 */}
                <div className="flex flex-col items-center gap-2 flex-1">
                    {sidebarItems.map((item) => {
                        const Icon = item.icon || (() => <div className="w-4 h-4 bg-sidebar-foreground/50" />);
                        const isActive = activeActivity === item.id && sidebarVisible;

                        return (
                            <button
                                key={item.id}
                                onClick={() => handleActivityClick(item.id)}
                                className={cn(
                                    "p-2.5 rounded-lg transition-all relative group",
                                    isActive
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-hover"
                                )}
                                title={item.label}
                            >
                                <Icon className="w-5 h-5" />
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-primary rounded-r-full" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* 下部：插件扩展项 (如设置、个人中心等) */}
                <UISlot id={UISlotId.SIDEBAR_BOTTOM} className="flex flex-col items-center gap-2 pb-2" />
            </div>

            {/* B. Sidebar (可折叠 + 可调整宽度) */}
            {sidebarVisible && ActiveSidebarComponent && (
                <div
                    className="relative bg-sidebar border-r border-border/50 h-full flex flex-col animate-in slide-in-from-left-2 duration-200 shrink-0"
                    style={{ width: sidebarWidth }}
                >
                    <ActiveSidebarComponent />
                    {/* 右侧拖拽手柄 */}
                    <ResizeHandle onResize={handleResize} position="right" />
                </div>
            )}
        </>
    );
}
