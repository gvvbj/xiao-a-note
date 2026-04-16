import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { WebPageView } from '../WebPageView';

type Listener = () => void;

class MockController {
    private listeners = new Set<Listener>();
    writebackNodeText = vi.fn(() => ({ ok: true, message: '已写回节点文本：hero-title' }));
    writebackFormControl = vi.fn(() => ({ ok: true, message: '已写回控件值：email' }));
    selectNode = vi.fn();

    constructor(private state: any) {}

    getState() {
        return this.state;
    }

    subscribe(listener: Listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    toggleView() {}

    getNodeLocation() {
        return null;
    }
}

afterEach(() => {
    document.body.classList.remove('web-page-view-active');
    vi.restoreAllMocks();
    vi.useRealTimers();
});

describe('WebPageView', () => {
    it('should mount body immersive class while page view is active and clean it on unmount', () => {
        const controller = new MockController({
            isActive: true,
            isWebPageFile: true,
            currentPath: 'demo.md',
            diagnostics: [],
            selectedNodeId: null,
            document: {
                metadata: { title: 'Demo', runtime: 'vanilla' },
                template: '<button data-node-id="cta">Start</button>',
                style: '',
                script: '',
                nodeIds: ['cta'],
                duplicateNodeIds: [],
            },
        }) as any;

        const { unmount } = render(<WebPageView controller={controller} />);

        expect(document.body.classList.contains('web-page-view-active')).toBe(true);
        expect(screen.getByLabelText('全屏显示')).toBeInTheDocument();
        expect(screen.getByLabelText('返回源码视图')).toBeInTheDocument();

        unmount();

        expect(document.body.classList.contains('web-page-view-active')).toBe(false);
    });

    it('should show a temporary node status on click messages', () => {
        vi.useFakeTimers();

        const controller = new MockController({
            isActive: true,
            isWebPageFile: true,
            currentPath: 'demo.md',
            diagnostics: [],
            selectedNodeId: null,
            document: {
                metadata: { title: 'Demo', runtime: 'vanilla' },
                template: '<button data-node-id="cta">Start</button>',
                style: '',
                script: '',
                nodeIds: ['cta'],
                duplicateNodeIds: [],
            },
        }) as any;

        render(<WebPageView controller={controller} />);

        act(() => {
            window.dispatchEvent(new MessageEvent('message', {
                data: { type: 'web-page:node-click', nodeId: 'cta', tagName: 'button' },
            }));
        });

        expect(document.querySelector('.web-page-status-bar')?.textContent).toBe('button · cta');

        act(() => {
            vi.advanceTimersByTime(2300);
        });

        expect(document.querySelector('.web-page-status-bar')).toBeNull();
    });

    it('should show hovered links in the bottom status bar', () => {
        const controller = new MockController({
            isActive: true,
            isWebPageFile: true,
            currentPath: 'demo.md',
            diagnostics: [],
            selectedNodeId: null,
            document: {
                metadata: { title: 'Demo', runtime: 'vanilla' },
                template: '<a href="https://example.com" data-node-id="docs">Docs</a>',
                style: '',
                script: '',
                nodeIds: ['docs'],
                duplicateNodeIds: [],
            },
        }) as any;

        render(<WebPageView controller={controller} />);

        act(() => {
            window.dispatchEvent(new MessageEvent('message', {
                data: { type: 'web-page:link-hover', href: 'https://example.com' },
            }));
        });

        expect(screen.getByText('https://example.com')).toBeInTheDocument();

        act(() => {
            window.dispatchEvent(new MessageEvent('message', {
                data: { type: 'web-page:link-leave' },
            }));
        });

        expect(screen.queryByText('https://example.com')).toBeNull();
    });

    it('should open allowed external links through electron host api', () => {
        const openExternal = vi.fn().mockResolvedValue(undefined);
        window.electronAPI.openExternal = openExternal;

        const controller = new MockController({
            isActive: true,
            isWebPageFile: true,
            currentPath: 'demo.md',
            diagnostics: [],
            selectedNodeId: null,
            document: {
                metadata: { title: 'Demo', runtime: 'vanilla' },
                template: '<a href="https://example.com" data-node-id="docs">Docs</a>',
                style: '',
                script: '',
                nodeIds: ['docs'],
                duplicateNodeIds: [],
            },
        }) as any;

        render(<WebPageView controller={controller} />);

        act(() => {
            window.dispatchEvent(new MessageEvent('message', {
                data: { type: 'web-page:link-click', href: 'https://example.com' },
            }));
        });

        expect(openExternal).toHaveBeenCalledWith('https://example.com/');
    });

    it('should render diagnostics when the controller exposes schema issues', () => {
        const controller = new MockController({
            isActive: true,
            isWebPageFile: true,
            currentPath: 'demo.md',
            diagnostics: [
                { code: 'missing-template', level: 'error', message: '当前文档缺少 <template> 区块，页面视图无法渲染。' },
                { code: 'unsupported-runtime', level: 'warning', message: 'runtime=react 当前未正式支持，将按 vanilla 预览。' },
            ],
            selectedNodeId: null,
            document: {
                metadata: { title: 'Demo', runtime: 'vanilla' },
                template: '',
                style: '',
                script: '',
                nodeIds: [],
                duplicateNodeIds: [],
            },
        }) as any;

        render(<WebPageView controller={controller} />);

        expect(screen.getByText('当前文档缺少 <template> 区块，页面视图无法渲染。')).toBeInTheDocument();
        expect(screen.getByText('runtime=react 当前未正式支持，将按 vanilla 预览。')).toBeInTheDocument();
    });

    it('should surface runtime errors emitted by the iframe bridge', () => {
        const controller = new MockController({
            isActive: true,
            isWebPageFile: true,
            currentPath: 'demo.md',
            diagnostics: [],
            selectedNodeId: null,
            document: {
                metadata: { title: 'Demo', runtime: 'vanilla' },
                template: '<button data-node-id="cta">Start</button>',
                style: '',
                script: 'throw new Error("boom")',
                nodeIds: ['cta'],
                duplicateNodeIds: [],
            },
        }) as any;

        render(<WebPageView controller={controller} />);

        act(() => {
            window.dispatchEvent(new MessageEvent('message', {
                data: { type: 'web-page:runtime-error', message: 'boom' },
            }));
        });

        expect(screen.getByText('脚本运行错误：boom')).toBeInTheDocument();
        expect(screen.getByText('脚本错误: boom')).toBeInTheDocument();
    });

    it('should route contenteditable writeback messages to the controller', () => {
        const controller = new MockController({
            isActive: true,
            isWebPageFile: true,
            currentPath: 'demo.md',
            diagnostics: [],
            selectedNodeId: null,
            document: {
                metadata: { title: 'Demo', runtime: 'vanilla' },
                template: '<h1 data-node-id="hero-title" contenteditable="true">Title</h1>',
                style: '',
                script: '',
                nodeIds: ['hero-title'],
                duplicateNodeIds: [],
            },
        }) as any;

        render(<WebPageView controller={controller} />);

        act(() => {
            window.dispatchEvent(new MessageEvent('message', {
                data: { type: 'web-page:text-commit', nodeId: 'hero-title', text: 'Updated title' },
            }));
        });

        expect(controller.writebackNodeText).toHaveBeenCalledWith('hero-title', 'Updated title');
        expect(screen.getByText('已写回节点文本：hero-title')).toBeInTheDocument();
    });

    it('should route form writeback messages to the controller', () => {
        const controller = new MockController({
            isActive: true,
            isWebPageFile: true,
            currentPath: 'demo.md',
            diagnostics: [],
            selectedNodeId: null,
            document: {
                metadata: { title: 'Demo', runtime: 'vanilla' },
                template: '<input data-node-id="email" type="email" value="old@example.com" />',
                style: '',
                script: '',
                nodeIds: ['email'],
                duplicateNodeIds: [],
            },
        }) as any;

        render(<WebPageView controller={controller} />);

        act(() => {
            window.dispatchEvent(new MessageEvent('message', {
                data: {
                    type: 'web-page:form-commit',
                    nodeId: 'email',
                    tagName: 'input',
                    inputType: 'email',
                    value: 'new@example.com',
                },
            }));
        });

        expect(controller.writebackFormControl).toHaveBeenCalledWith({
            nodeId: 'email',
            tagName: 'input',
            inputType: 'email',
            value: 'new@example.com',
            checked: undefined,
        });
        expect(screen.getByText('已写回控件值：email')).toBeInTheDocument();
    });

    it('should render image showcase documents with media-friendly iframe srcDoc', () => {
        const controller = new MockController({
            isActive: true,
            isWebPageFile: true,
            currentPath: 'gallery.md',
            diagnostics: [],
            selectedNodeId: null,
            document: {
                metadata: { title: 'Gallery Demo', runtime: 'vanilla' },
                template: `
                    <main data-node-id="gallery">
                        <img data-node-id="cover" src="https://example.com/cover.jpg" alt="cover" />
                        <video data-node-id="teaser" src="https://example.com/demo.mp4"></video>
                    </main>
                `,
                style: '.gallery { display: grid; }',
                script: '',
                nodeIds: ['gallery', 'cover', 'teaser'],
                duplicateNodeIds: [],
            },
        }) as any;

        const { container } = render(<WebPageView controller={controller} />);
        const iframe = container.querySelector('iframe');

        expect(iframe).not.toBeNull();
        const srcDoc = iframe?.getAttribute('srcdoc') ?? '';
        expect(srcDoc).toContain('img-src * data: blob:; media-src * data: blob:;');
        expect(srcDoc).toContain('<img data-node-id="cover"');
        expect(srcDoc).toContain('<video data-node-id="teaser"');
    });

    it('should include form bridge handlers in iframe srcDoc for form-page validation', () => {
        const controller = new MockController({
            isActive: true,
            isWebPageFile: true,
            currentPath: 'form.md',
            diagnostics: [],
            selectedNodeId: null,
            document: {
                metadata: { title: 'Form Demo', runtime: 'vanilla' },
                template: `
                    <form data-node-id="contact-form">
                        <input data-node-id="email" type="email" value="hello@example.com" />
                        <textarea data-node-id="message">hello</textarea>
                        <select data-node-id="plan"><option value="basic">Basic</option></select>
                    </form>
                `,
                style: '',
                script: '',
                nodeIds: ['contact-form', 'email', 'message', 'plan'],
                duplicateNodeIds: [],
            },
        }) as any;

        const { container } = render(<WebPageView controller={controller} />);
        const iframe = container.querySelector('iframe');
        const srcDoc = iframe?.getAttribute('srcdoc') ?? '';

        expect(srcDoc).toContain("type: 'web-page:form-commit'");
        expect(srcDoc).toContain("document.addEventListener('submit', handleSubmit, true);");
        expect(srcDoc).toContain("document.addEventListener('focusout', handleBlur, true);");
        expect(iframe?.getAttribute('sandbox')).toBe('allow-scripts allow-forms');
    });
});
