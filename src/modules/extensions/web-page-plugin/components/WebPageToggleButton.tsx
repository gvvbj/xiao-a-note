import React from 'react';
import { WebPageController } from '../services/WebPageController';

interface WebPageToggleButtonProps {
    controller: WebPageController;
}

export const WebPageToggleButton: React.FC<WebPageToggleButtonProps> = ({ controller }) => {
    const [state, setState] = React.useState(controller.getState());

    React.useEffect(() => {
        return controller.subscribe(() => {
            setState({ ...controller.getState() });
        });
    }, [controller]);

    if (!state.isWebPageFile) {
        return null;
    }

    return (
        <button
            onClick={() => controller.toggleView()}
            className={`web-page-toggle-btn ${state.isActive ? 'active' : ''}`}
            title={state.isActive ? '切换到源码视图' : '切换到页面视图'}
            aria-label={state.isActive ? '切换到源码视图' : '切换到页面视图'}
        >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M8 20V8" />
                <path d="M8 12H21" />
            </svg>
        </button>
    );
};
