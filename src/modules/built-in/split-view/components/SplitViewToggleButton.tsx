import React from 'react';
import { Columns } from 'lucide-react';
import { CoreEvents } from '@/kernel/core/Events';
import { SplitViewService } from '../services/SplitViewService';

interface SplitViewToggleButtonProps {
    service: SplitViewService;
    kernel: any;
}

/**
 * SplitViewToggleButton - 分栏切换按钮
 * 
 * 从 index.tsx 剥离的 UI 组件
 */
export function SplitViewToggleButton({ service, kernel }: SplitViewToggleButtonProps) {
    const [active, setActive] = React.useState(service.isSplitView);

    React.useEffect(() => {
        const handler = (val: boolean) => setActive(val);
        kernel.on(CoreEvents.SPLIT_VIEW_CHANGED, handler);
        return () => { kernel.off(CoreEvents.SPLIT_VIEW_CHANGED, handler); };
    }, [kernel]);

    return (
        <button
            onClick={() => {
                const nextState = !service.isSplitView;
                service.setSplitView(nextState);
            }}
            className={`p-1.5 rounded-md transition-colors ${active
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
            title={active ? "关闭分屏" : "开启分屏"}
        >
            <Columns size={14} />
        </button>
    );
}
