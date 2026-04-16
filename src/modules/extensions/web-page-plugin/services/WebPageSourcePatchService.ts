import {
    WebPageDocumentParser,
    type WebPageDocumentModel,
    type WebPageNodeLocation,
} from '../parser/WebPageDocumentParser';

export type WebPagePatchOperation =
    | 'replace-node-text'
    | 'replace-node-attributes'
    | 'sync-form-control'
    | 'move-node';

export interface WebPagePatchPlan {
    operation: WebPagePatchOperation;
    nodeId: string;
    section: 'template';
}

export interface WebPageTextWritebackRequest {
    nodeId: string;
    text: string;
}

export interface WebPageFormControlWritebackRequest {
    nodeId: string;
    tagName: 'input' | 'textarea' | 'select';
    inputType?: string;
    value?: string;
    checked?: boolean;
}

export interface WebPageAttributeWritebackRequest {
    nodeId: string;
    attributes: Record<string, string | boolean | null | undefined>;
}

export interface WebPageSourcePatchResult {
    ok: boolean;
    content?: string;
    message?: string;
}

export class WebPageSourcePatchService {
    getNodeLocation(document: WebPageDocumentModel | null, nodeId: string): WebPageNodeLocation | null {
        const template = document?.template;
        if (!template || !nodeId) {
            return null;
        }

        return WebPageDocumentParser.locateTemplateNode(template, nodeId);
    }

    createReplaceNodeTextPlan(nodeId: string): WebPagePatchPlan {
        return {
            operation: 'replace-node-text',
            nodeId,
            section: 'template',
        };
    }

    createReplaceNodeAttributesPlan(nodeId: string): WebPagePatchPlan {
        return {
            operation: 'replace-node-attributes',
            nodeId,
            section: 'template',
        };
    }

    createMoveNodePlan(nodeId: string): WebPagePatchPlan {
        return {
            operation: 'move-node',
            nodeId,
            section: 'template',
        };
    }

    replaceNodeText(
        document: WebPageDocumentModel | null,
        request: WebPageTextWritebackRequest,
    ): WebPageSourcePatchResult {
        return this.patchTemplateNode(document, request.nodeId, (snippet, location) => {
            if (!snippet.includes(`</${location.tagName}>`)) {
                return {
                    ok: false,
                    message: `节点 ${request.nodeId} 是自闭合节点，当前不支持文本回写。`,
                };
            }

            const match = snippet.match(
                new RegExp(`^(<${location.tagName}\\b[^>]*>)([\\s\\S]*?)(</${location.tagName}>$)`, 'i'),
            );
            if (!match) {
                return {
                    ok: false,
                    message: `节点 ${request.nodeId} 结构不符合文本回写条件。`,
                };
            }

            const [, openTag, innerContent, closeTag] = match;
            if (this.containsNestedElements(innerContent)) {
                return {
                    ok: false,
                    message: `节点 ${request.nodeId} 包含嵌套结构，当前仅支持纯文本节点回写。`,
                };
            }

            const nextInnerContent = this.replaceInnerTextPreservingPadding(
                innerContent,
                this.escapeHtmlText(request.text),
            );

            return {
                ok: true,
                snippet: `${openTag}${nextInnerContent}${closeTag}`,
            };
        });
    }

    syncFormControlValue(
        document: WebPageDocumentModel | null,
        request: WebPageFormControlWritebackRequest,
    ): WebPageSourcePatchResult {
        return this.patchTemplateNode(document, request.nodeId, (snippet, location) => {
            switch (request.tagName) {
                case 'input':
                    return this.patchInput(snippet, request, location);
                case 'textarea':
                    return this.patchTextarea(snippet, request, location);
                case 'select':
                    return this.patchSelect(snippet, request, location);
                default:
                    return {
                        ok: false,
                        message: `节点 ${request.nodeId} 的控件类型暂不支持回写。`,
                    };
            }
        });
    }

    replaceNodeAttributes(
        document: WebPageDocumentModel | null,
        request: WebPageAttributeWritebackRequest,
    ): WebPageSourcePatchResult {
        return this.patchTemplateNode(document, request.nodeId, (snippet) => {
            const nextSnippet = this.applyAttributesToTagSource(snippet, request.attributes);
            if (!nextSnippet) {
                return {
                    ok: false,
                    message: `节点 ${request.nodeId} 的属性回写请求无效。`,
                };
            }

            return {
                ok: true,
                snippet: nextSnippet,
            };
        });
    }

    private patchTemplateNode(
        document: WebPageDocumentModel | null,
        nodeId: string,
        patcher: (
            snippet: string,
            location: WebPageNodeLocation,
        ) => { ok: true; snippet: string } | { ok: false; message: string },
    ): WebPageSourcePatchResult {
        if (!document?.isWebPageFile) {
            return {
                ok: false,
                message: '当前文档不是 web-page，无法执行源码回写。',
            };
        }

        const location = this.getNodeLocation(document, nodeId);
        if (!location) {
            return {
                ok: false,
                message: `未找到节点 ${nodeId} 对应的源码位置。`,
            };
        }

        const patched = patcher(location.snippet, location);
        if (!patched.ok) {
            return patched;
        }

        const nextTemplate =
            document.template.slice(0, location.start)
            + patched.snippet
            + document.template.slice(location.end);

        const nextBody = this.replaceSectionContent(document.body, 'template', nextTemplate);
        if (nextBody === null) {
            return {
                ok: false,
                message: '未能在源码中定位 <template> 区块，无法完成回写。',
            };
        }

        return {
            ok: true,
            content: `${document.frontmatterRaw}${nextBody}`,
        };
    }

    private patchInput(
        snippet: string,
        request: WebPageFormControlWritebackRequest,
        location: WebPageNodeLocation,
    ): { ok: true; snippet: string } | { ok: false; message: string } {
        if (location.tagName.toLowerCase() !== 'input') {
            return {
                ok: false,
                message: `节点 ${request.nodeId} 实际不是 input，无法按输入框方式回写。`,
            };
        }

        const normalizedType = (request.inputType ?? '').toLowerCase();
        if (normalizedType === 'checkbox' || normalizedType === 'radio') {
            const nextSnippet = this.setBooleanAttribute(snippet, 'checked', Boolean(request.checked));
            return {
                ok: true,
                snippet: nextSnippet,
            };
        }

        const nextSnippet = this.setAttribute(
            snippet,
            'value',
            this.escapeAttributeValue(request.value ?? ''),
        );

        return {
            ok: true,
            snippet: nextSnippet,
        };
    }

    private patchTextarea(
        snippet: string,
        request: WebPageFormControlWritebackRequest,
        location: WebPageNodeLocation,
    ): { ok: true; snippet: string } | { ok: false; message: string } {
        if (location.tagName.toLowerCase() !== 'textarea') {
            return {
                ok: false,
                message: `节点 ${request.nodeId} 实际不是 textarea，无法按文本域方式回写。`,
            };
        }

        const match = snippet.match(/^<textarea\b[^>]*>([\s\S]*?)<\/textarea>$/i);
        if (!match) {
            return {
                ok: false,
                message: `节点 ${request.nodeId} 的 textarea 结构异常，无法回写。`,
            };
        }

        const nextInner = this.replaceInnerTextPreservingPadding(
            match[1],
            this.escapeHtmlText(request.value ?? ''),
        );

        return {
            ok: true,
            snippet: snippet.replace(match[1], nextInner),
        };
    }

    private patchSelect(
        snippet: string,
        request: WebPageFormControlWritebackRequest,
        location: WebPageNodeLocation,
    ): { ok: true; snippet: string } | { ok: false; message: string } {
        if (location.tagName.toLowerCase() !== 'select') {
            return {
                ok: false,
                message: `节点 ${request.nodeId} 实际不是 select，无法按下拉框方式回写。`,
            };
        }

        let matched = false;
        const targetValue = request.value ?? '';
        const nextSnippet = snippet.replace(
            /<option\b([^>]*)>([\s\S]*?)<\/option>/gi,
            (fullMatch, rawAttributes: string, innerContent: string) => {
                const attributes = rawAttributes.replace(/\sselected(?:=(["']).*?\1)?/gi, '');
                const optionValueMatch = attributes.match(/\svalue\s*=\s*(["'])(.*?)\1/i);
                const optionValue = optionValueMatch?.[2] ?? this.decodeHtmlText(innerContent.trim());
                const shouldSelect = !matched && optionValue === targetValue;

                if (shouldSelect) {
                    matched = true;
                    return `<option${attributes} selected>${innerContent}</option>`;
                }

                return `<option${attributes}>${innerContent}</option>`;
            },
        );

        if (!matched) {
            return {
                ok: false,
                message: `节点 ${request.nodeId} 未找到值为 ${targetValue} 的 option，无法回写。`,
            };
        }

        return {
            ok: true,
            snippet: nextSnippet,
        };
    }

    private replaceSectionContent(
        body: string,
        tag: 'template' | 'style' | 'script',
        nextContent: string,
    ): string | null {
        const pattern = new RegExp(`(<${tag}>)([\\s\\S]*?)(<\\/${tag}>)`, 'i');
        if (!pattern.test(body)) {
            return null;
        }

        return body.replace(pattern, (_fullMatch, openTag: string, innerContent: string, closeTag: string) => {
            const nextInner = this.preserveSectionSpacing(innerContent, nextContent);
            return `${openTag}${nextInner}${closeTag}`;
        });
    }

    private preserveSectionSpacing(originalInnerContent: string, nextContent: string): string {
        const hasLeadingNewline = /^\s*\r?\n/.test(originalInnerContent);
        const hasTrailingNewline = /\r?\n\s*$/.test(originalInnerContent);

        if (!nextContent.trim()) {
            return '';
        }

        const prefix = hasLeadingNewline || nextContent.includes('\n') ? '\n' : '';
        const suffix = hasTrailingNewline || nextContent.includes('\n') ? '\n' : '';

        return `${prefix}${nextContent}${suffix}`;
    }

    private containsNestedElements(innerContent: string): boolean {
        return /<[A-Za-z][\w:-]*\b/.test(innerContent);
    }

    private replaceInnerTextPreservingPadding(originalInnerContent: string, nextText: string): string {
        const leadingWhitespace = originalInnerContent.match(/^\s*/)?.[0] ?? '';
        const trailingWhitespace = originalInnerContent.match(/\s*$/)?.[0] ?? '';
        return `${leadingWhitespace}${nextText}${trailingWhitespace}`;
    }

    private applyAttributesToTagSource(
        snippet: string,
        attributes: Record<string, string | boolean | null | undefined>,
    ): string | null {
        const openingTagMatch = snippet.match(/^<([A-Za-z][\w:-]*)(\s[^<>]*?)?(\/?)>/);
        if (!openingTagMatch) {
            return null;
        }

        const openingTag = openingTagMatch[0];
        let nextOpeningTag = openingTag;

        for (const [attributeName, attributeValue] of Object.entries(attributes)) {
            if (!this.isWritableAttributeName(attributeName)) {
                return null;
            }

            if (attributeName === 'data-node-id') {
                return null;
            }

            if (typeof attributeValue === 'boolean') {
                nextOpeningTag = this.setBooleanAttribute(nextOpeningTag, attributeName, attributeValue);
                continue;
            }

            if (attributeValue === null || attributeValue === undefined) {
                nextOpeningTag = this.removeAttribute(nextOpeningTag, attributeName);
                continue;
            }

            nextOpeningTag = this.setAttribute(
                nextOpeningTag,
                attributeName,
                this.escapeAttributeValue(attributeValue),
            );
        }

        return `${nextOpeningTag}${snippet.slice(openingTag.length)}`;
    }

    private setAttribute(tagSource: string, attributeName: string, attributeValue: string): string {
        const attributePattern = new RegExp(`\\s${attributeName}\\s*=\\s*(["']).*?\\1`, 'i');
        if (attributePattern.test(tagSource)) {
            return tagSource.replace(attributePattern, ` ${attributeName}="${attributeValue}"`);
        }

        return tagSource.replace(/\s*(\/?>)$/, (_tail, closer: string) => {
            const suffix = closer === '/>' ? ' />' : '>';
            return ` ${attributeName}="${attributeValue}"${suffix}`;
        });
    }

    private setBooleanAttribute(tagSource: string, attributeName: string, enabled: boolean): string {
        const attributePattern = new RegExp(`\\s${attributeName}(?:\\s*=\\s*(["']).*?\\1)?`, 'i');
        if (enabled) {
            if (attributePattern.test(tagSource)) {
                return tagSource.replace(attributePattern, ` ${attributeName}`);
            }

            return tagSource.replace(/\s*(\/?>)$/, (_tail, closer: string) => {
                const suffix = closer === '/>' ? ' />' : '>';
                return ` ${attributeName}${suffix}`;
            });
        }

        return tagSource.replace(attributePattern, '');
    }

    private removeAttribute(tagSource: string, attributeName: string): string {
        const attributePattern = new RegExp(`\\s${attributeName}(?:\\s*=\\s*(["']).*?\\1)?`, 'i');
        return tagSource.replace(attributePattern, '');
    }

    private isWritableAttributeName(attributeName: string): boolean {
        return /^[A-Za-z_][A-Za-z0-9_:-]*$/.test(attributeName);
    }

    private escapeHtmlText(value: string): string {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    private decodeHtmlText(value: string): string {
        return value
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, '\'')
            .replace(/&amp;/g, '&');
    }

    private escapeAttributeValue(value: string): string {
        return value
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;');
    }
}
