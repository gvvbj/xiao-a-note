import { WEB_PAGE_DEFAULT_RUNTIME } from './WebPageConstants';

export const WEB_PAGE_SCHEMA_VERSION = '1';
export const WEB_PAGE_DEFAULT_EDITABLE_MODE = 'structured';

export const WEB_PAGE_ALLOWED_RUNTIMES = [WEB_PAGE_DEFAULT_RUNTIME] as const;
export const WEB_PAGE_ALLOWED_EDITABLE_MODES = [WEB_PAGE_DEFAULT_EDITABLE_MODE] as const;

export type WebPageRuntime = (typeof WEB_PAGE_ALLOWED_RUNTIMES)[number];
export type WebPageEditableMode = (typeof WEB_PAGE_ALLOWED_EDITABLE_MODES)[number];
export type WebPageDiagnosticLevel = 'error' | 'warning';

export const WEB_PAGE_DIAGNOSTIC_CODES = {
    MISSING_TEMPLATE: 'missing-template',
    DUPLICATE_NODE_ID: 'duplicate-node-id',
    UNSUPPORTED_RUNTIME: 'unsupported-runtime',
    UNSUPPORTED_EDITABLE_MODE: 'unsupported-editable-mode',
    UNSUPPORTED_VERSION: 'unsupported-version',
} as const;

export type WebPageDiagnosticCode =
    (typeof WEB_PAGE_DIAGNOSTIC_CODES)[keyof typeof WEB_PAGE_DIAGNOSTIC_CODES];

export interface WebPageDiagnostic {
    code: WebPageDiagnosticCode;
    level: WebPageDiagnosticLevel;
    message: string;
}

export const WEB_PAGE_SCHEMA_DEFAULTS = {
    runtime: WEB_PAGE_DEFAULT_RUNTIME,
    editable: WEB_PAGE_DEFAULT_EDITABLE_MODE,
    version: WEB_PAGE_SCHEMA_VERSION,
} as const;
