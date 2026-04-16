import { describe, expect, it } from 'vitest';
import { WebPageDocumentParser } from '../../parser/WebPageDocumentParser';
import { WebPageSourcePatchService } from '../WebPageSourcePatchService';

describe('WebPageSourcePatchService', () => {
    const service = new WebPageSourcePatchService();

    it('should update input value attributes in template source', () => {
        const document = WebPageDocumentParser.parse(`---
type: web-page
---
<template>
  <input data-node-id="email" type="email" value="old@example.com" />
</template>`);

        const result = service.syncFormControlValue(document, {
            nodeId: 'email',
            tagName: 'input',
            inputType: 'email',
            value: 'new@example.com',
        });

        expect(result.ok).toBe(true);
        expect(result.content).toContain('value="new@example.com"');
    });

    it('should toggle checkbox checked state in template source', () => {
        const document = WebPageDocumentParser.parse(`---
type: web-page
---
<template>
  <input data-node-id="agree" type="checkbox" />
</template>`);

        const result = service.syncFormControlValue(document, {
            nodeId: 'agree',
            tagName: 'input',
            inputType: 'checkbox',
            checked: true,
        });

        expect(result.ok).toBe(true);
        expect(result.content).toContain('type="checkbox" checked');
    });

    it('should select the matching option in select source', () => {
        const document = WebPageDocumentParser.parse(`---
type: web-page
---
<template>
  <select data-node-id="plan">
    <option value="basic">Basic</option>
    <option value="pro">Pro</option>
  </select>
</template>`);

        const result = service.syncFormControlValue(document, {
            nodeId: 'plan',
            tagName: 'select',
            value: 'pro',
        });

        expect(result.ok).toBe(true);
        expect(result.content).toContain('<option value="pro" selected>Pro</option>');
        expect(result.content).not.toContain('<option value="basic" selected>');
    });

    it('should reject text writeback for nested nodes to protect structure', () => {
        const document = WebPageDocumentParser.parse(`---
type: web-page
---
<template>
  <h1 data-node-id="hero-title"><span>Nested</span></h1>
</template>`);

        const result = service.replaceNodeText(document, {
            nodeId: 'hero-title',
            text: 'New title',
        });

        expect(result.ok).toBe(false);
        expect(result.message).toContain('嵌套结构');
    });

    it('should replace common string attributes on a node without touching structure', () => {
        const document = WebPageDocumentParser.parse(`---
type: web-page
---
<template>
  <img data-node-id="cover" src="/old.png" alt="old cover" class="hero-image" />
</template>`);

        const result = service.replaceNodeAttributes(document, {
            nodeId: 'cover',
            attributes: {
                src: '/new.png',
                alt: 'new cover',
                title: 'hero cover',
            },
        });

        expect(result.ok).toBe(true);
        expect(result.content).toContain('src="/new.png"');
        expect(result.content).toContain('alt="new cover"');
        expect(result.content).toContain('title="hero cover"');
        expect(result.content).toContain('data-node-id="cover"');
    });

    it('should remove nullable attributes and toggle boolean attributes', () => {
        const document = WebPageDocumentParser.parse(`---
type: web-page
---
<template>
  <details data-node-id="faq" open class="expanded">
    <summary>FAQ</summary>
  </details>
</template>`);

        const result = service.replaceNodeAttributes(document, {
            nodeId: 'faq',
            attributes: {
                open: false,
                class: null,
                title: 'collapsed',
            },
        });

        expect(result.ok).toBe(true);
        expect(result.content).not.toContain(' open');
        expect(result.content).not.toContain('class="expanded"');
        expect(result.content).toContain('title="collapsed"');
    });

    it('should reject attempts to rewrite data-node-id', () => {
        const document = WebPageDocumentParser.parse(`---
type: web-page
---
<template>
  <a data-node-id="docs" href="/docs">Docs</a>
</template>`);

        const result = service.replaceNodeAttributes(document, {
            nodeId: 'docs',
            attributes: {
                'data-node-id': 'other-id',
            },
        });

        expect(result.ok).toBe(false);
    });
});
