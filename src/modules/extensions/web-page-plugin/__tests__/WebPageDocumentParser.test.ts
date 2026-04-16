/**
 * 测试范围：web-page 文档类型识别与三区解析
 * 测试类型：单元 / 回归
 * 测试目的：验证 frontmatter、template/style/script 与 data-node-id 规则的最小闭环
 * 防回归问题：类型识别失效、三区解析串区、节点标识提取失败
 */
import { describe, expect, it } from 'vitest';
import { WebPageDocumentParser } from '../parser/WebPageDocumentParser';

describe('WebPageDocumentParser', () => {
    it('应识别 type: web-page 并解析三区内容', () => {
        const content = `---
type: web-page
title: Demo
runtime: vanilla
---
<template>
  <section data-node-id="hero">
    <button data-node-id="hero-cta">Start</button>
  </section>
</template>

<style>
  [data-node-id="hero-cta"] { color: red; }
</style>

<script>
  console.log('ready');
</script>`;

        const parsed = WebPageDocumentParser.parse(content);

        expect(parsed.isWebPageFile).toBe(true);
        expect(parsed.metadata.title).toBe('Demo');
        expect(parsed.template).toContain('data-node-id="hero-cta"');
        expect(parsed.style).toContain('color: red');
        expect(parsed.script).toContain("console.log('ready')");
        expect(parsed.nodeIds).toEqual(['hero', 'hero-cta']);
        expect(parsed.duplicateNodeIds).toEqual([]);
        expect(parsed.metadata.editable).toBe('structured');
        expect(parsed.metadata.version).toBe('1');
    });

    it('非 web-page 文档不应误判，但仍可解析 frontmatter', () => {
        const content = `---
type: kanban
title: Board
---
<template><div>noop</div></template>`;

        const parsed = WebPageDocumentParser.parse(content);

        expect(parsed.isWebPageFile).toBe(false);
        expect(parsed.metadata.title).toBe('Board');
        expect(parsed.template).toContain('<div>noop</div>');
    });

    it('缺少三区时应安全降级为空字符串', () => {
        const parsed = WebPageDocumentParser.parse('---\ntype: web-page\n---\n# empty');

        expect(parsed.isWebPageFile).toBe(true);
        expect(parsed.template).toBe('');
        expect(parsed.style).toBe('');
        expect(parsed.script).toBe('');
        expect(parsed.nodeIds).toEqual([]);
        expect(parsed.duplicateNodeIds).toEqual([]);
    });

    it('应收集重复的 data-node-id，供诊断层使用', () => {
        const parsed = WebPageDocumentParser.parse(`---
type: web-page
---
<template>
  <section data-node-id="hero">
    <div data-node-id="hero"></div>
  </section>
</template>`);

        expect(parsed.nodeIds).toEqual(['hero']);
        expect(parsed.duplicateNodeIds).toEqual(['hero']);
    });

    it('应能根据 data-node-id 定位 template 中的节点源码片段', () => {
        const template = `
<section data-node-id="hero">
  <div data-node-id="hero-content">
    <button data-node-id="hero-cta">Start</button>
  </div>
</section>`;

        const location = WebPageDocumentParser.locateTemplateNode(template, 'hero-content');

        expect(location).not.toBeNull();
        expect(location?.section).toBe('template');
        expect(location?.tagName).toBe('div');
        expect(location?.snippet).toContain('data-node-id="hero-content"');
        expect(location?.snippet).toContain('data-node-id="hero-cta"');
        expect(location?.start).toBeGreaterThanOrEqual(0);
        expect(location?.end).toBeGreaterThan(location?.start ?? 0);
    });
});
