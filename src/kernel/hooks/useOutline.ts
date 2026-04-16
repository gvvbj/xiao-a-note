import { useState, useEffect } from 'react';
import { useKernel } from '../core/KernelContext';
import { ServiceId } from '../core/ServiceId';
import { OutlineService, OutlineItem } from '../services/OutlineService';
import { CoreEvents } from '../core/Events';

export function useOutline() {
    const kernel = useKernel();
    const outlineService = kernel.getService<OutlineService>(ServiceId.OUTLINE, false);

    const [state, setState] = useState({
        headers: outlineService ? outlineService.getHeaders() : [] as OutlineItem[],
        collapsedIds: outlineService ? outlineService.getCollapsedIds() : new Set<string>(),
    });

    useEffect(() => {
        if (!outlineService) return;

        const handleOutlineChanged = (payload: { headers: OutlineItem[], collapsedIds: Set<string> }) => {
            setState(payload);
        };

        outlineService.on(CoreEvents.OUTLINE_CHANGED, handleOutlineChanged);
        return () => {
            outlineService.off(CoreEvents.OUTLINE_CHANGED, handleOutlineChanged);
        };
    }, [outlineService]);

    return {
        ...state,
        setHeaders: (headers: OutlineItem[]) => outlineService?.setHeaders(headers),
        toggleCollapse: (id: string) => outlineService?.toggleCollapse(id),
        collapseAll: () => outlineService?.collapseAll(),
        expandAll: () => outlineService?.expandAll(),
        service: outlineService
    };
}
