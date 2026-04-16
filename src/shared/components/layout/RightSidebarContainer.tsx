import React from 'react';
import { useKernel, useService } from '@/kernel/core/KernelContext';
import { UISlotId } from '@/kernel/core/Constants';
import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import { SettingsService } from '@/kernel/services/SettingsService';
import { LoggerService } from '@/kernel/services/LoggerService';
import { LayoutSettingKey, RightSidebarLayout } from '@/shared/constants/LayoutSettings';
import { ResizeHandle } from '@/shared/components/ui/ResizeHandle';
import { UISlot } from '@/shared/components/ui/UISlot';

export function RightSidebarContainer() {
    const kernel = useKernel();
    const settingsService = useService<SettingsService>(ServiceId.SETTINGS, false);
    const loggerService = useService<LoggerService>(ServiceId.LOGGER, false);
    const logger = React.useMemo(() => loggerService?.createLogger('RightSidebarContainer'), [loggerService]);

    const [sidebarItems, setSidebarItems] = React.useState(() => kernel.getUI(UISlotId.RIGHT_SIDEBAR) || []);
    const [visible, setVisible] = React.useState(
        () => settingsService?.getSetting<boolean>(LayoutSettingKey.RIGHT_SIDEBAR_VISIBLE, false) ?? false
    );
    const [width, setWidth] = React.useState(
        () => settingsService?.getSetting<number>(
            LayoutSettingKey.RIGHT_SIDEBAR_WIDTH,
            RightSidebarLayout.DEFAULT_WIDTH
        ) ?? RightSidebarLayout.DEFAULT_WIDTH
    );

    const widthRef = React.useRef(width);
    React.useEffect(() => {
        widthRef.current = width;
    }, [width]);

    React.useEffect(() => {
        const handleUIUpdate = (slotId: UISlotId) => {
            if (slotId === UISlotId.RIGHT_SIDEBAR) {
                logger?.info('RIGHT_SIDEBAR UI updated, refreshing panels...');
                setSidebarItems([...kernel.getUI(UISlotId.RIGHT_SIDEBAR)]);
            }
        };

        const handleSettingChanged = ({ id, value }: { id: string; value: unknown }) => {
            if (id === LayoutSettingKey.RIGHT_SIDEBAR_VISIBLE) {
                setVisible(Boolean(value));
                return;
            }

            if (id === LayoutSettingKey.RIGHT_SIDEBAR_WIDTH) {
                const numeric = typeof value === 'number' ? value : Number(value);
                if (!Number.isNaN(numeric)) {
                    setWidth(
                        Math.max(
                            RightSidebarLayout.MIN_WIDTH,
                            Math.min(RightSidebarLayout.MAX_WIDTH, numeric)
                        )
                    );
                }
            }
        };

        kernel.on(CoreEvents.UI_UPDATED, handleUIUpdate);
        kernel.on(CoreEvents.SETTING_CHANGED, handleSettingChanged);

        return () => {
            kernel.off(CoreEvents.UI_UPDATED, handleUIUpdate);
            kernel.off(CoreEvents.SETTING_CHANGED, handleSettingChanged);
        };
    }, [kernel, logger]);

    const handleResize = React.useCallback((delta: number) => {
        const next = Math.max(
            RightSidebarLayout.MIN_WIDTH,
            Math.min(RightSidebarLayout.MAX_WIDTH, widthRef.current + delta)
        );
        setWidth(next);
        kernel.emit(CoreEvents.SETTING_CHANGED, {
            id: LayoutSettingKey.RIGHT_SIDEBAR_WIDTH,
            value: next,
        });
    }, [kernel]);

    if (!visible || sidebarItems.length === 0) {
        return null;
    }

    return (
        <aside
            className="relative bg-sidebar border-l border-border/50 h-full flex flex-col animate-in slide-in-from-right-2 duration-200 shrink-0"
            style={{ width }}
        >
            <ResizeHandle onResize={handleResize} position="left" />
            <UISlot id={UISlotId.RIGHT_SIDEBAR} className="h-full min-h-0" itemClassName="h-full min-h-0" />
        </aside>
    );
}
