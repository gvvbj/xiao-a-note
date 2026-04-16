import React from 'react';
import { Columns, FileCode, Maximize2, Minimize2 } from 'lucide-react';
import { useEditor } from '@/kernel/hooks/useEditor';
import { useLayout } from '@/kernel/hooks/useLayout';
import { useKernel } from '@/kernel/core/KernelContext';
import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import { SettingsService } from '@/kernel/services/SettingsService';

/**
 * 源码/预览切换按钮组件
 */
const SourceToggle: React.FC = () => {
    const { viewMode, setViewMode } = useEditor();

    // 视图模式耦合修复：分栏模式下隐藏切换按钮
    const kernel = useKernel();
    const [isSplitView, setIsSplitView] = React.useState(false);

    React.useEffect(() => {
        const settings = kernel.getService<SettingsService>(ServiceId.SETTINGS, false);
        setIsSplitView(settings?.getSetting('editor.isSplitView', false) || false);

        const handler = (val: boolean) => setIsSplitView(val);
        kernel.on(CoreEvents.SPLIT_VIEW_CHANGED, handler);
        return () => { kernel.off(CoreEvents.SPLIT_VIEW_CHANGED, handler); };
    }, [kernel]);

    // 保持按钮渲染占位，仅禁用交互，防止 Header 布局抖动
    return (
        <button
            onClick={() => !isSplitView && setViewMode(viewMode === 'source' ? 'preview' : 'source')}
            disabled={isSplitView}
            className={`p-1.5 rounded-md transition-colors ${isSplitView
                ? 'opacity-40 cursor-not-allowed text-muted-foreground' // 分栏禁用态
                : (viewMode === 'source'
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground')
                }`}
            title={isSplitView ? "分栏模式下已固定视图" : (viewMode === 'source' ? "切换到预览视图" : "切换到源码视图")}
        >
            <FileCode size={14} />
        </button>
    );
};

/**
 * 禅模式切换按钮组件
 */
const ZenToggle: React.FC = () => {
    const { isZenMode, toggleZenMode } = useLayout();
    return (
        <button
            onClick={toggleZenMode}
            className={`p-1.5 rounded-md transition-colors ${isZenMode
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
            title={isZenMode ? "退出禅模式" : "进入禅模式"}
        >
            {isZenMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
    );
};

export { SourceToggle, ZenToggle };
