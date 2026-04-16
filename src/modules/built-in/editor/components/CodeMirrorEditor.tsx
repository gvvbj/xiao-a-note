/**
 * CodeMirrorEditor - 纯架构壳
 *
 * Phase 5 重构后的极简组件。
 *
 * 职责：
 * - Props 接口定义
 * - ref forwarding
 * - 组合 4 个独立 hooks
 * - 渲染 CodeMirror 组件
 *
 * 所有业务逻辑已迁移到：
 * - useViewLifecycle: View 生命周期 + Extension 订阅
 * - useUpdateListener: 内容/光标/滚动事件转发
 * - useSyncProtocol: 终极防护协议（外部→内部同步）
 * - useEditorCommands: useImperativeHandle 命令接口
 *
 * 遵循原则：
 * - Plugin-First: 零业务逻辑
 * - 单一职责: 只负责 wiring
 */

import React, { useState, useRef, useMemo } from 'react';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';

import { EditorView } from '@codemirror/view';
import { githubLight } from '@uiw/codemirror-theme-github';
import { oneDark } from '@codemirror/theme-one-dark';
import { createDynamicTheme } from '../config/themeAdaptor';
import { IEditorRef } from '../framework/types';
import { useService, useKernel } from '@/kernel/core/KernelContext';
import { ServiceId } from '@/kernel/core/ServiceId';
import { useTheme } from '@/kernel/hooks/useTheme';
import { getDirnameSync } from '@/shared/utils/path';
import { normalizeMarkdown } from '@/shared/utils/ContentUtils';
import { CommandRegistry } from '../registries/CommandRegistry';

// 提取的 hooks
import { useViewLifecycle } from '../hooks/useViewLifecycle';
import { useUpdateListener } from '../hooks/useUpdateListener';
import { useSyncProtocol } from '../hooks/useSyncProtocol';
import { useEditorCommands } from '../hooks/useEditorCommands';

interface CodeMirrorEditorProps {
    initialContent: string | (() => string);
    onUpdate?: (content: string | (() => string), changes?: any) => void;
    viewMode: 'source' | 'preview';
    currentFilePath: string | null;
    readOnly?: boolean;
    showSourceOnHover?: boolean;
    className?: string;
    onScrollPercentage?: (percentage: number) => void;
    onViewReady?: (view: EditorView) => void;
    onCursorActivity?: (line: number, head: number) => void;
}

export const CodeMirrorEditor = React.forwardRef<IEditorRef, CodeMirrorEditorProps>((props, ref) => {
    return <CodeMirrorEditorBase {...props} forwardedRef={ref} />;
});

CodeMirrorEditor.displayName = 'CodeMirrorEditor';

const CodeMirrorEditorBase = React.memo(({
    initialContent,
    onUpdate,
    viewMode,
    currentFilePath,
    readOnly = false,
    className = '',
    onScrollPercentage,
    onViewReady,
    onCursorActivity,
    forwardedRef
}: CodeMirrorEditorProps & { forwardedRef: React.ForwardedRef<IEditorRef> }) => {
    const cmRef = useRef<ReactCodeMirrorRef>(null);
    const { themeId: currentThemeId } = useTheme();
    const isDark = currentThemeId.includes('dark');
    const kernel = useKernel();
    const commandRegistry = useService<CommandRegistry>(ServiceId.COMMAND_REGISTRY, false);
    const [activeStates] = useState<Record<string, boolean>>({});
    const dynamicTheme = useMemo(() => createDynamicTheme(isDark), [isDark]);
    const basePath = useMemo(() => currentFilePath ? getDirnameSync(currentFilePath) : null, [currentFilePath]);

    // 共享 refs（由父组件创建，传递给多个 hooks）
    const isUpdatingRef = useRef(false);
    const lastInitialSyncRef = useRef<string | null>(null);
    const pendingStateRef = useRef<{
        cursorPosition?: number;
        scrollTop?: number;
        topLineNumber?: number;
        topOffset?: number;
    } | null>(null);

    // Hook 1: View 生命周期 + Extension 订阅
    const { dynamicExtensions, editorView, setEditorView } = useViewLifecycle({
        cmRef,
        onViewReady
    });

    // Hook 2: UpdateListener（内容/光标/滚动转发）
    const stableExtensions = useUpdateListener({
        onUpdate,
        onCursorActivity,
        onScrollPercentage,
        viewMode,
        basePath,
        readOnly,
        currentFilePath,
        isUpdatingRef,
        lastInitialSyncRef,
        onEditorViewDetected: setEditorView,
        editorViewReady: !!editorView,
        dynamicExtensions,
        kernelRef: kernel
    });

    // Hook 3: 同步协议（外部→内部）
    useSyncProtocol({
        editorView,
        cmRef,
        initialContent,
        currentFilePath,
        forwardedRef,
        isUpdatingRef,
        lastInitialSyncRef,
        pendingStateRef
    });

    // Hook 4: 命令接口（useImperativeHandle）
    useEditorCommands({
        forwardedRef,
        cmRef,
        commandRegistry: commandRegistry || null,
        activeStates,
        stableExtensions,
        isDark,
        isUpdatingRef,
        pendingStateRef
    });

    // 纯 JSX
    return (
        <div className={`flex-1 flex flex-col min-h-0 min-w-0 ${className}`}>
            <CodeMirror
                ref={cmRef}
                height="100%"
                className="flex-1 min-h-0"
                theme={isDark ? oneDark : githubLight}
                extensions={[...stableExtensions, dynamicTheme]}
                readOnly={readOnly}
                basicSetup={false}
            />
        </div>
    );
});

CodeMirrorEditorBase.displayName = 'CodeMirrorEditorBase';
