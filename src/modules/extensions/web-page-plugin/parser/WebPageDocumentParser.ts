import { WEB_PAGE_DOCUMENT_TYPE } from '../constants/WebPageConstants';
import { WEB_PAGE_SCHEMA_DEFAULTS } from '../constants/WebPageSchema';

export interface WebPageFrontmatter {
    type?: string;
    title?: string;
    runtime?: string;
    version?: string;
    editable?: string;
    [key: string]: string | undefined;
}

export interface WebPageDocumentModel {
    isWebPageFile: boolean;
    frontmatterRaw: string;
    body: string;
    metadata: WebPageFrontmatter;
    template: string;
    style: string;
    script: string;
    nodeIds: string[];
    duplicateNodeIds: string[];
}

export interface WebPageNodeLocation {
    nodeId: string;
    section: 'template';
    tagName: string;
    start: number;
    end: number;
    snippet: string;
}

export class WebPageDocumentParser {
    static parse(content: string): WebPageDocumentModel {
        if (typeof content !== 'string') {
            return this.emptyModel('');
        }

        const { metadata, raw, body } = this.parseFrontmatter(content);
        const template = this.extractSection(body, 'template');
        const style = this.extractSection(body, 'style');
        const script = this.extractSection(body, 'script');
        const { nodeIds, duplicateNodeIds } = this.extractNodeInfo(template);

        return {
            isWebPageFile: metadata.type === WEB_PAGE_DOCUMENT_TYPE,
            frontmatterRaw: raw,
            body,
            metadata: {
                runtime: WEB_PAGE_SCHEMA_DEFAULTS.runtime,
                editable: WEB_PAGE_SCHEMA_DEFAULTS.editable,
                version: WEB_PAGE_SCHEMA_DEFAULTS.version,
                ...metadata,
            },
            template,
            style,
            script,
            nodeIds,
            duplicateNodeIds,
        };
    }

    static isWebPageFile(content: string): boolean {
        return this.parse(content).isWebPageFile;
    }

    static locateTemplateNode(template: string, nodeId: string): WebPageNodeLocation | null {
        if (!template || !nodeId) {
            return null;
        }

        const attributePattern = new RegExp(`data-node-id\\s*=\\s*["']${this.escapeRegExp(nodeId)}["']`, 'i');
        const openTagPattern = /<([A-Za-z][\w:-]*)(\s[^<>]*?)?>/g;
        let match: RegExpExecArray | null;

        while ((match = openTagPattern.exec(template)) !== null) {
            const fullTag = match[0];
            if (!attributePattern.test(fullTag)) {
                continue;
            }

            const tagName = match[1];
            const start = match.index;

            if (this.isSelfClosingTag(fullTag, tagName)) {
                return {
                    nodeId,
                    section: 'template',
                    tagName,
                    start,
                    end: start + fullTag.length,
                    snippet: fullTag,
                };
            }

            const end = this.findMatchingTagEnd(template, tagName, openTagPattern.lastIndex);
            if (end === null) {
                return null;
            }

            return {
                nodeId,
                section: 'template',
                tagName,
                start,
                end,
                snippet: template.slice(start, end),
            };
        }

        return null;
    }

    static parseFrontmatter(content: string): { metadata: WebPageFrontmatter; raw: string; body: string } {
        const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
        if (!match) {
            return { metadata: {}, raw: '', body: content };
        }

        const raw = match[0];
        const body = content.slice(raw.length);
        const yaml = match[1];
        const metadata: WebPageFrontmatter = {};

        for (const line of yaml.split(/\r?\n/)) {
            const fieldMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.+)\s*$/);
            if (!fieldMatch) continue;
            metadata[fieldMatch[1]] = fieldMatch[2].trim();
        }

        return { metadata, raw, body };
    }

    private static extractSection(body: string, tag: 'template' | 'style' | 'script'): string {
        const match = body.match(new RegExp(`<${tag}>\\s*([\\s\\S]*?)\\s*<\\/${tag}>`, 'i'));
        return match ? match[1].trim() : '';
    }

    private static extractNodeInfo(template: string): { nodeIds: string[]; duplicateNodeIds: string[] } {
        const ids = new Set<string>();
        const duplicateIds = new Set<string>();
        const pattern = /data-node-id\s*=\s*["']([^"']+)["']/g;
        let match: RegExpExecArray | null;

        while ((match = pattern.exec(template)) !== null) {
            const nextId = match[1].trim();
            if (!nextId) {
                continue;
            }

            if (ids.has(nextId)) {
                duplicateIds.add(nextId);
                continue;
            }

            ids.add(nextId);
        }

        return {
            nodeIds: [...ids],
            duplicateNodeIds: [...duplicateIds],
        };
    }

    private static emptyModel(content: string): WebPageDocumentModel {
        return {
            isWebPageFile: false,
            frontmatterRaw: '',
            body: content,
            metadata: {},
            template: '',
            style: '',
            script: '',
            nodeIds: [],
            duplicateNodeIds: [],
        };
    }

    private static findMatchingTagEnd(template: string, tagName: string, fromIndex: number): number | null {
        const tokenPattern = new RegExp(`<(/?)${this.escapeRegExp(tagName)}(?:\\s[^<>]*?)?>`, 'gi');
        tokenPattern.lastIndex = fromIndex;

        let depth = 1;
        let match: RegExpExecArray | null;

        while ((match = tokenPattern.exec(template)) !== null) {
            const token = match[0];
            const isClosing = match[1] === '/';

            if (!isClosing && this.isSelfClosingTag(token, tagName)) {
                continue;
            }

            depth += isClosing ? -1 : 1;
            if (depth === 0) {
                return match.index + token.length;
            }
        }

        return null;
    }

    private static isSelfClosingTag(tagSource: string, tagName: string): boolean {
        return /\/>\s*$/.test(tagSource) || this.isVoidElement(tagName);
    }

    private static isVoidElement(tagName: string): boolean {
        return /^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/i.test(tagName);
    }

    private static escapeRegExp(value: string): string {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
