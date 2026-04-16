import {
    WEB_PAGE_ALLOWED_EDITABLE_MODES,
    WEB_PAGE_ALLOWED_RUNTIMES,
    WEB_PAGE_DIAGNOSTIC_CODES,
    WEB_PAGE_SCHEMA_DEFAULTS,
    WEB_PAGE_SCHEMA_VERSION,
    type WebPageDiagnostic,
    type WebPageEditableMode,
    type WebPageRuntime,
} from '../constants/WebPageSchema';
import type { WebPageDocumentModel } from '../parser/WebPageDocumentParser';

export class WebPageSchemaValidator {
    static validate(document: WebPageDocumentModel): WebPageDiagnostic[] {
        if (!document.isWebPageFile) {
            return [];
        }

        const diagnostics: WebPageDiagnostic[] = [];

        if (!document.template.trim()) {
            diagnostics.push({
                code: WEB_PAGE_DIAGNOSTIC_CODES.MISSING_TEMPLATE,
                level: 'error',
                message: '当前文档缺少 <template> 区块，页面视图无法渲染。',
            });
        }

        if (document.duplicateNodeIds.length > 0) {
            diagnostics.push({
                code: WEB_PAGE_DIAGNOSTIC_CODES.DUPLICATE_NODE_ID,
                level: 'error',
                message: `发现重复的 data-node-id：${document.duplicateNodeIds.join(', ')}`,
            });
        }

        if (!this.isSupportedRuntime(document.metadata.runtime)) {
            diagnostics.push({
                code: WEB_PAGE_DIAGNOSTIC_CODES.UNSUPPORTED_RUNTIME,
                level: 'warning',
                message: `runtime=${document.metadata.runtime} 当前未正式支持，将按 ${WEB_PAGE_SCHEMA_DEFAULTS.runtime} 预览。`,
            });
        }

        if (!this.isSupportedEditableMode(document.metadata.editable)) {
            diagnostics.push({
                code: WEB_PAGE_DIAGNOSTIC_CODES.UNSUPPORTED_EDITABLE_MODE,
                level: 'warning',
                message: `editable=${document.metadata.editable} 当前未正式支持，将按 ${WEB_PAGE_SCHEMA_DEFAULTS.editable} 处理。`,
            });
        }

        if (!this.isSupportedVersion(document.metadata.version)) {
            diagnostics.push({
                code: WEB_PAGE_DIAGNOSTIC_CODES.UNSUPPORTED_VERSION,
                level: 'warning',
                message: `version=${document.metadata.version} 当前未正式支持，推荐使用 ${WEB_PAGE_SCHEMA_VERSION}。`,
            });
        }

        return diagnostics;
    }

    private static isSupportedRuntime(value?: string): value is WebPageRuntime {
        return WEB_PAGE_ALLOWED_RUNTIMES.includes((value ?? WEB_PAGE_SCHEMA_DEFAULTS.runtime) as WebPageRuntime);
    }

    private static isSupportedEditableMode(value?: string): value is WebPageEditableMode {
        return WEB_PAGE_ALLOWED_EDITABLE_MODES.includes((value ?? WEB_PAGE_SCHEMA_DEFAULTS.editable) as WebPageEditableMode);
    }

    private static isSupportedVersion(value?: string): boolean {
        return (value ?? WEB_PAGE_SCHEMA_DEFAULTS.version) === WEB_PAGE_SCHEMA_VERSION;
    }
}
