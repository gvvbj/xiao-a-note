export const LOCAL_CONTENT_SUGGEST_CONSTANTS = {
    PLUGIN_ID: 'local-content-suggest',
    PLUGIN_NAME: '文档内内容提示',
    VERSION: '1.0.0',
    DESCRIPTION: '根据当前文档中已出现的内容提供输入补全提示',
    MAX_WORD_SUGGESTIONS: 8,
    MAX_LINE_SUGGESTIONS: 4,
    MIN_WORD_PREFIX: 1,
    MIN_LINE_PREFIX: 4,
    MAX_TOKEN_LENGTH: 64,
    MAX_LINE_LENGTH: 120,
    MAX_CJK_PHRASE_LENGTH: 8,
} as const;
