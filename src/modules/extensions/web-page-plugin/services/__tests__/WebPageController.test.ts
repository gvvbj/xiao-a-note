/**
 * Test scope:
 * - web-page view controller state transitions
 * - transient content recovery when host view switches
 * - safe exit when document truly stops being a web-page document
 */
import { describe, expect, it, vi } from 'vitest';
import { ServiceId } from '@/kernel/core/ServiceId';
import type { IPluginContext } from '@/kernel/system/plugin/types';
import { WebPageController } from '../WebPageController';

function createContext(options?: {
    readFile?: (path: string) => Promise<string>;
    editorActions?: {
        setContent?: (content: string, source?: string) => void;
    };
}) {
    return {
        logger: {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn(),
        },
        getService: vi.fn((serviceId: string) => {
            if (serviceId === ServiceId.FILE_SYSTEM && options?.readFile) {
                return { readFile: options.readFile };
            }

            if (serviceId === ServiceId.EDITOR_ACTIONS && options?.editorActions) {
                return options.editorActions;
            }

            return null;
        }),
    } as unknown as IPluginContext;
}

describe('WebPageController', () => {
    function createEditorViewMock(initialContent: string) {
        return {
            state: {
                doc: {
                    length: initialContent.length,
                },
            },
            dispatch: vi.fn(),
        };
    }

    it('should recognize a valid web-page document and expose parsed metadata', async () => {
        const controller = new WebPageController(createContext());

        controller.handleContentChange(`---
type: web-page
title: Demo
---
<template><button data-node-id="cta">Start</button></template>`, 'demo.md');

        await new Promise((resolve) => setTimeout(resolve, 0));

        const state = controller.getState();
        expect(state.isWebPageFile).toBe(true);
        expect(state.currentPath).toBe('demo.md');
        expect(state.document?.metadata.title).toBe('Demo');
        expect(state.document?.nodeIds).toEqual(['cta']);
        expect(state.diagnostics).toEqual([]);
        expect(state.selectedNodeId).toBeNull();
    });

    it('should only allow toggling page view for web-page documents', async () => {
        const controller = new WebPageController(createContext());

        controller.toggleView();
        expect(controller.getState().isActive).toBe(false);

        controller.handleContentChange(`---
type: web-page
---
<template><div>ok</div></template>`, 'page.md');
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(controller.getState().isActive).toBe(true);

        controller.toggleView();
        expect(controller.getState().isActive).toBe(false);

        controller.toggleView();
        expect(controller.getState().isActive).toBe(true);
    });

    it('should auto-activate page view when switching into a web-page document', async () => {
        const controller = new WebPageController(createContext());

        controller.handleContentChange('# plain markdown', 'plain.md');
        await new Promise((resolve) => setTimeout(resolve, 0));

        controller.handleContentChange(`---
type: web-page
---
<template><div>ok</div></template>`, 'page.md');
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(controller.getState().isActive).toBe(true);
    });

    it('should exit page view when the same document is explicitly rewritten as plain markdown', async () => {
        const controller = new WebPageController(createContext());

        controller.handleContentChange(`---
type: web-page
---
<template><div>ok</div></template>`, 'page.md');
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(controller.getState().isActive).toBe(true);

        controller.handleContentChange('# plain markdown', 'page.md');
        await new Promise((resolve) => setTimeout(resolve, 0));

        const state = controller.getState();
        expect(state.isWebPageFile).toBe(false);
        expect(state.isActive).toBe(false);
        expect(state.document).toBeNull();
    });

    it('should recover missing frontmatter from disk when live content only contains page body', async () => {
        const controller = new WebPageController(createContext({ readFile: async () => `---
type: web-page
title: Demo
---
<template><button data-node-id="cta">Disk</button></template>` }));

        controller.handleContentChange('<template><button data-node-id="cta">Live</button></template>', 'page.md');
        await new Promise((resolve) => setTimeout(resolve, 0));

        const state = controller.getState();
        expect(state.isWebPageFile).toBe(true);
        expect(state.document?.metadata.title).toBe('Demo');
        expect(state.document?.template).toContain('Live');
        expect(state.document?.nodeIds).toEqual(['cta']);
    });

    it('should preserve web-page identity across transient empty content on the same path', async () => {
        const controller = new WebPageController(createContext({ readFile: async () => `---
type: web-page
title: Demo
---
<template><button data-node-id="cta">Disk</button></template>` }));

        controller.handleContentChange(`---
type: web-page
title: Demo
---
<template><button data-node-id="cta">Live</button></template>`, 'page.md');
        await new Promise((resolve) => setTimeout(resolve, 0));

        controller.handleContentChange('', 'page.md');
        await new Promise((resolve) => setTimeout(resolve, 0));

        const state = controller.getState();
        expect(state.isWebPageFile).toBe(true);
        expect(state.document?.metadata.title).toBe('Demo');
    });

    it('should expose template node locations for future patch targeting', async () => {
        const controller = new WebPageController(createContext());

        controller.handleContentChange(`---
type: web-page
---
<template>
  <section data-node-id="hero">
    <button data-node-id="cta">Start</button>
  </section>
</template>`, 'page.md');
        await new Promise((resolve) => setTimeout(resolve, 0));

        const location = controller.getNodeLocation('hero');
        expect(location).not.toBeNull();
        expect(location?.tagName).toBe('section');
        expect(location?.snippet).toContain('data-node-id="cta"');
    });

    it('should expose schema diagnostics when the document contains duplicate node ids', async () => {
        const controller = new WebPageController(createContext());

        controller.handleContentChange(`---
type: web-page
runtime: react
---
<template>
  <section data-node-id="hero">
    <div data-node-id="hero"></div>
  </section>
</template>`, 'page.md');
        await new Promise((resolve) => setTimeout(resolve, 0));

        const diagnostics = controller.getState().diagnostics;
        expect(diagnostics.some((item) => item.code === 'duplicate-node-id')).toBe(true);
        expect(diagnostics.some((item) => item.code === 'unsupported-runtime')).toBe(true);
    });

    it('should write back contenteditable text changes through editor actions', async () => {
        const controller = new WebPageController(createContext());
        const view = createEditorViewMock(`---
type: web-page
---
<template>
  <h1 data-node-id="hero-title" contenteditable="true">Old title</h1>
</template>`);
        controller.setEditorView(view as any);

        controller.handleContentChange(`---
type: web-page
---
<template>
  <h1 data-node-id="hero-title" contenteditable="true">Old title</h1>
</template>`, 'page.md');
        await new Promise((resolve) => setTimeout(resolve, 0));

        const result = controller.writebackNodeText('hero-title', 'New title');

        expect(result.ok).toBe(true);
        expect(view.dispatch).toHaveBeenCalledTimes(1);
        expect(view.dispatch.mock.calls[0]?.[0]?.changes?.insert).toContain('>New title<');
        expect(controller.getState().document?.template).toContain('New title');
    });

    it('should write back textarea changes through editor actions', async () => {
        const controller = new WebPageController(createContext());
        const view = createEditorViewMock(`---
type: web-page
---
<template>
  <textarea data-node-id="contact-message">hello</textarea>
</template>`);
        controller.setEditorView(view as any);

        controller.handleContentChange(`---
type: web-page
---
<template>
  <textarea data-node-id="contact-message">hello</textarea>
</template>`, 'page.md');
        await new Promise((resolve) => setTimeout(resolve, 0));

        const result = controller.writebackFormControl({
            nodeId: 'contact-message',
            tagName: 'textarea',
            value: 'updated message',
        });

        expect(result.ok).toBe(true);
        expect(view.dispatch).toHaveBeenCalledTimes(1);
        expect(view.dispatch.mock.calls[0]?.[0]?.changes?.insert).toContain('<textarea data-node-id="contact-message">updated message</textarea>');
        expect(controller.getState().document?.template).toContain('updated message');
    });

    it('should write back common node attributes through editor actions', async () => {
        const controller = new WebPageController(createContext());
        const view = createEditorViewMock(`---
type: web-page
---
<template>
  <img data-node-id="cover" src="/old.png" alt="old cover" />
</template>`);
        controller.setEditorView(view as any);

        controller.handleContentChange(`---
type: web-page
---
<template>
  <img data-node-id="cover" src="/old.png" alt="old cover" />
</template>`, 'page.md');
        await new Promise((resolve) => setTimeout(resolve, 0));

        const result = controller.writebackNodeAttributes({
            nodeId: 'cover',
            attributes: {
                src: '/new.png',
                alt: 'new cover',
                title: 'hero cover',
            },
        });

        expect(result.ok).toBe(true);
        expect(view.dispatch).toHaveBeenCalledTimes(1);
        expect(view.dispatch.mock.calls[0]?.[0]?.changes?.insert).toContain('src="/new.png"');
        expect(view.dispatch.mock.calls[0]?.[0]?.changes?.insert).toContain('alt="new cover"');
        expect(view.dispatch.mock.calls[0]?.[0]?.changes?.insert).toContain('title="hero cover"');
        expect(controller.getState().document?.template).toContain('src="/new.png"');
    });
});
