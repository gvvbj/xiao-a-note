import React from 'react';
import { ErrorBoundary } from '@/shared/components/ui/ErrorBoundary';
import { CodeMirrorEditor } from '../CodeMirrorEditor';
import { IEditorRef } from '../../framework/types';
import { IEditorPanel } from '../../registries/EditorPanelRegistry';
import { EditorView } from '@codemirror/view';
import { useKernel } from '@/kernel/core/KernelContext';
import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import { useEditor } from '@/kernel/hooks/useEditor';
import { UISlot } from '@/shared/components/ui/UISlot';
import { UISlotId } from '@/kernel/core/Constants';
import type { SplitViewService } from '@/modules/built-in/split-view/services/SplitViewService';

interface EditorMainViewProps {
    panels: IEditorPanel<any>[];
    getEditorView: () => EditorView | null;
    currentPath: string | null;
    initialContent: string | (() => string);
    handleEditorUpdate: (val: string | (() => string)) => void;
    showSourceOnHover: boolean;
    editorRef: React.MutableRefObject<IEditorRef | null>;
    previewEditorRef: React.MutableRefObject<IEditorRef | null>;
    onMainViewReady?: (view: EditorView) => void;
    onPreviewViewReady?: (view: EditorView) => void;
    onCursorActivity?: (line: number, head: number) => void;
    onScrollPercentage?: (pct: number) => void;
    loadedPath: string | null;
    switchError?: { path: string | null; error: string } | null;
    previewInitialContent?: string | (() => string); // [新增]
}

export const EditorMainView: React.FC<EditorMainViewProps> = React.memo(({
    panels,
    getEditorView,
    currentPath,
    initialContent,
    previewInitialContent,
    handleEditorUpdate,
    showSourceOnHover,
    editorRef,
    previewEditorRef,
    onMainViewReady,
    onPreviewViewReady,
    onCursorActivity,
    onScrollPercentage,
    loadedPath,
    switchError
}) => {
    // 使用 useEditor 接管状态
    const { viewMode, headingNumbering } = useEditor();
    const kernel = useKernel();

    // 布局稳定性优化：监听分栏状态以平滑控制插槽容器样式
    const [isSplitView, setIsSplitView] = React.useState(false);

    React.useEffect(() => {
        const service = kernel.getService<SplitViewService>(ServiceId.SPLIT_VIEW, false);
        if (service) setIsSplitView(service.isSplitView);

        const handler = (val: boolean) => setIsSplitView(val);
        kernel.on(CoreEvents.SPLIT_VIEW_CHANGED, handler);
        return () => { kernel.off(CoreEvents.SPLIT_VIEW_CHANGED, handler); };
    }, [kernel]);

    // [布局稳定化] 分栏切换过渡控制
    // 使用 ref 直接操作 DOM 而非 React state，确保在浏览器绘制前同步禁用过渡
    // 避免 setState 的异步延迟导致的轻微抖动
    const companionRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleTransitionStart = () => {
            const el = companionRef.current;
            if (el) {
                // 同步禁用过渡：在浏览器绘制前生效，消除布局变化期间的动画
                el.style.transition = 'none';
                // 等待布局完成后恢复过渡能力
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        if (companionRef.current) {
                            companionRef.current.style.transition = '';
                        }
                    });
                });
            }
        };
        kernel.on(CoreEvents.SPLIT_VIEW_TRANSITION_START, handleTransitionStart);
        return () => { kernel.off(CoreEvents.SPLIT_VIEW_TRANSITION_START, handleTransitionStart); };
    }, [kernel]);

    const isSwitchingFile = !switchError && currentPath !== null && currentPath !== loadedPath;
    const activeEditorPath = loadedPath;
    const switchingFileName = React.useMemo(() => {
        if (!currentPath) {
            return '';
        }

        return currentPath.split(/[\\/]/).pop() || currentPath;
    }, [currentPath]);

    return (
        <div className="flex-1 flex flex-col min-h-0">
            {/* 动态面板渲染 (如搜索栏) */}
            {panels.map(panel => {
                const PanelComponent = panel.component;
                const panelProps = panel.props || {};
                return (
                    <PanelComponent
                        key={panel.id}
                        {...panelProps}
                        getView={getEditorView}
                        isVisible={true}
                    />
                );
            })}
            <ErrorBoundary>
                <div className="flex-1 flex min-h-0 overflow-hidden">
                    {/* 左侧编辑器 */}
                    <div className={`flex flex-col min-h-0 relative ${isSplitView ? 'flex-1 border-r border-border/10' : 'w-full flex-1'}`}>
                        {switchError ? (
                            <div className="flex flex-1 items-center justify-center px-6">
                                <div className="w-full max-w-lg rounded-2xl border border-amber-200 bg-card px-6 py-5 text-center shadow-sm">
                                    <p className="text-sm font-medium text-foreground">文件加载失败</p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {switchingFileName ? `无法打开 ${switchingFileName}` : '当前目标文件无法加载'}
                                    </p>
                                    <p className="mt-3 text-xs leading-6 text-muted-foreground">
                                        {switchError.error}
                                    </p>
                                </div>
                            </div>
                        ) : isSwitchingFile ? (
                            <div className="flex flex-1 items-center justify-center px-6">
                                <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card/70 px-6 py-5 text-center shadow-sm">
                                    <p className="text-sm font-medium text-foreground">正在切换文件</p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {switchingFileName ? `正在加载 ${switchingFileName}` : '正在同步编辑器内容'}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <CodeMirrorEditor
                                key={activeEditorPath ?? 'editor-empty'}
                                ref={editorRef}
                                initialContent={initialContent}
                                onUpdate={handleEditorUpdate}
                                viewMode={viewMode}
                                currentFilePath={activeEditorPath}
                                showSourceOnHover={showSourceOnHover}
                                className={headingNumbering ? 'show-heading-numbering' : ''}
                                onViewReady={onMainViewReady}
                                onCursorActivity={onCursorActivity}
                                onScrollPercentage={onScrollPercentage}
                            />
                        )}
                    </div>
                    {/* 右侧伴随视图槽位 (用于预览、分栏等插件) */}
                    {/* 稳定容器策略：用 ref 容器包裹 UISlot 以实现同步过渡控制 */}
                    <div
                        ref={companionRef}
                        className={`${isSplitView ? 'flex-1' : 'w-0'} flex flex-col min-h-0 border-l border-border/30 overflow-hidden transition-all duration-200 ease-in-out`}
                    >
                        <UISlot
                            id={UISlotId.EDITOR_SIDE_COMPANION}
                            className="flex-1 flex flex-col min-h-0"
                            itemClassName="flex-1 flex flex-col min-h-0"
                        />
                    </div>
                </div>
            </ErrorBoundary>
        </div>
    );
});

EditorMainView.displayName = 'EditorMainView';

