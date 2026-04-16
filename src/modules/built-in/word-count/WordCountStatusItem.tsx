import React, { useState, useEffect, useCallback } from 'react';
import { useKernel } from '@/kernel/core/KernelContext';
import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import { ILifecycleService } from '@/modules/interfaces/ILifecycleService';

/**
 * WordCountStatusItem - 字数统计状态栏组件
 *
 * 监听文档切换和内容输入事件，实时更新字数和字符数。
 * 组件挂载时主动从 LifecycleService 读取当前内容，
 * 确保退出全屏等场景下不会归零。
 */
export const WordCountStatusItem = () => {
    const kernel = useKernel();
    const [stats, setStats] = useState({ words: 0, chars: 0 });

    const computeStats = useCallback((text: string) => {
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const chars = text.replace(/\s/g, '').length;
        setStats({ words, chars });
    }, []);

    useEffect(() => {
        // 挂载时主动读取当前文档内容（解决退出全屏后归零问题）
        const lifecycleService = kernel.getService<ILifecycleService>(ServiceId.LIFECYCLE, false);
        if (lifecycleService) {
            const state = lifecycleService.getState();
            if (state?.initialContent) {
                computeStats(state.initialContent);
            }
        }

        // 监听文件切换
        const handleDocChange = (payload: { content: string }) => {
            computeStats(payload.content);
        };

        // 监听内容编辑（实时更新）
        const handleContentInput = (payload: { newContent: string }) => {
            computeStats(payload.newContent);
        };

        kernel.on(CoreEvents.DOCUMENT_CHANGED, handleDocChange);
        kernel.on(CoreEvents.EDITOR_CONTENT_INPUT, handleContentInput);

        return () => {
            kernel.off(CoreEvents.DOCUMENT_CHANGED, handleDocChange);
            kernel.off(CoreEvents.EDITOR_CONTENT_INPUT, handleContentInput);
        };
    }, [kernel, computeStats]);

    return (
        <div className="flex items-center gap-3 px-2 text-xs select-none hover:text-foreground transition-colors cursor-default">
            <span>{stats.words} 词</span>
            <span className="opacity-50">|</span>
            <span>{stats.chars} 字符</span>
        </div>
    );
};
