import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { EditorMainView } from '../EditorMainView';

vi.mock('../../CodeMirrorEditor', () => ({
    CodeMirrorEditor: ({ currentFilePath }: { currentFilePath: string | null }) => (
        <div data-testid="cm-editor">{currentFilePath ?? 'null'}</div>
    ),
}));

vi.mock('@/kernel/hooks/useEditor', () => ({
    useEditor: () => ({
        viewMode: 'source',
        headingNumbering: false,
    }),
}));

vi.mock('@/shared/components/ui/UISlot', () => ({
    UISlot: () => null,
}));

vi.mock('@/kernel/core/KernelContext', () => ({
    useKernel: () => ({
        getService: () => null,
        on: () => undefined,
        off: () => undefined,
    }),
}));

describe('EditorMainView', () => {
    const baseProps = {
        panels: [],
        getEditorView: () => null,
        currentPath: 'docs/requested.md',
        initialContent: '# content',
        handleEditorUpdate: vi.fn(),
        showSourceOnHover: false,
        editorRef: { current: null },
        previewEditorRef: { current: null },
        loadedPath: 'docs/requested.md',
    };

    it('应在请求路径与已加载路径不一致时显示切换态', () => {
        render(
            <EditorMainView
                {...baseProps}
                currentPath="docs/next.md"
                loadedPath="docs/prev.md"
            />
        );

        expect(screen.getByText('正在切换文件')).toBeInTheDocument();
        expect(screen.getByText('正在加载 next.md')).toBeInTheDocument();
        expect(screen.queryByTestId('cm-editor')).toBeNull();
    });

    it('应在路径一致时渲染编辑器', () => {
        render(<EditorMainView {...baseProps} />);

        expect(screen.queryByText('正在切换文件')).toBeNull();
        expect(screen.getByTestId('cm-editor')).toHaveTextContent('docs/requested.md');
    });

    it('应在切换失败时显示失败态而不是继续渲染编辑器', () => {
        render(
            <EditorMainView
                {...baseProps}
                currentPath="docs/missing.md"
                loadedPath={null}
                switchError={{ path: 'docs/missing.md', error: '目标文件不存在：docs/missing.md' }}
            />
        );

        expect(screen.getByText('文件加载失败')).toBeInTheDocument();
        expect(screen.getByText('无法打开 missing.md')).toBeInTheDocument();
        expect(screen.getByText('目标文件不存在：docs/missing.md')).toBeInTheDocument();
        expect(screen.queryByTestId('cm-editor')).toBeNull();
    });
});
