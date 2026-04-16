/**
 * useViewLifecycle - 编辑器 View 生命周期管理
 *
 * 职责：
 * 1. 监听 Extension Registry 变化，动态更新扩展列表
 * 2. 跟踪 EditorView 实例，在首次就绪时通知外部
 *
 * 遵循原则：
 * - Plugin-First: 从 CodeMirrorEditor 中提取的纯 Hook
 * - 单一职责: 只管 View 生命周期和 Extension 订阅
 */

import { useState, useEffect } from 'react';
import { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { useService } from '@/kernel/core/KernelContext';
import { ServiceId } from '@/kernel/core/ServiceId';
import { EditorExtensionRegistry } from '@/modules/built-in/editor/registries/EditorExtensionRegistry';

interface UseViewLifecycleOptions {
    cmRef: React.RefObject<ReactCodeMirrorRef | null>;
    onViewReady?: (view: EditorView) => void;
}

interface UseViewLifecycleReturn {
    dynamicExtensions: Extension[];
    editorView: EditorView | null;
    setEditorView: (view: EditorView | null) => void;
}

export function useViewLifecycle({
    cmRef,
    onViewReady
}: UseViewLifecycleOptions): UseViewLifecycleReturn {
    const extensionRegistry = useService<EditorExtensionRegistry>(ServiceId.EDITOR_EXTENSION_REGISTRY, false);
    const [dynamicExtensions, setDynamicExtensions] = useState<Extension[]>(
        extensionRegistry?.getExtensions() || []
    );
    const [editorView, setEditorView] = useState<EditorView | null>(null);

    // View Ready 通知
    // [关键修复] 依赖 editorView 状态：当 useUpdateListener 首次检测到 view 时
    // 会调用 setEditorView → 触发此 effect → cmRef.current.view 此时已存在 → onViewReady 被正确调用
    // 原来只依赖 [onViewReady]，新挂载组件的 view 尚未创建时 effect 已经执行，导致回调永远不被触发
    useEffect(() => {
        if (cmRef.current?.view && onViewReady) {
            onViewReady(cmRef.current.view);
        }
    }, [onViewReady, editorView]);

    // Extension 订阅
    useEffect(() => {
        if (!extensionRegistry) return;
        return extensionRegistry.subscribe(() => {
            setDynamicExtensions(extensionRegistry.getExtensions());
        });
    }, [extensionRegistry]);

    return { dynamicExtensions, editorView, setEditorView };
}
