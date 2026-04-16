import React from 'react';
import { KanbanController } from '../services/KanbanController';

/**
 * 看板视图切换按钮
 * 
 * 注册到 EDITOR_HEADER_RIGHT 插槽
 * 仅在检测到 frontmatter type: kanban 时渲染
 */
interface KanbanToggleButtonProps {
    controller: KanbanController;
}

export const KanbanToggleButton: React.FC<KanbanToggleButtonProps> = ({ controller }) => {
    const [state, setState] = React.useState(controller.getState());

    React.useEffect(() => {
        return controller.subscribe(() => {
            setState({ ...controller.getState() });
        });
    }, [controller]);

    // 非看板文件时不渲染
    if (!state.isKanbanFile) {
        return null;
    }

    return (
        <button
            onClick={() => controller.toggleView()}
            className={`kanban-toggle-btn ${state.isActive ? 'active' : ''}`}
            title={state.isActive ? '切换到源码视图' : '切换到看板视图'}
        >
            {/* Kanban 图标: 三列布局 */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="6" height="18" rx="1" />
                <rect x="9" y="3" width="6" height="13" rx="1" />
                <rect x="16" y="3" width="6" height="8" rx="1" />
            </svg>
        </button>
    );
};
