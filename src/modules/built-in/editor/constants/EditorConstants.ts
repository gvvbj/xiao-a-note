/**
 * EditorConstants - 编辑器核心业务常量
 */
export const EDITOR_CONSTANTS = {
    // 文件系统相关
    UNTITLED_PREFIX: 'untitled-',

    // 内容更新防抖
    CONTENT_UPDATE_DEBOUNCE_MS: 500,

    // 加载与重试
    LOAD_RETRY_DELAY_MS: 1000,

    // 自动保存限制
    AUTO_SAVE_MIN_MS: 1000,
    INTERNAL_WRITE_IGNORE_MS: 1500,

    // 状态恢复
    WIDGET_RESTORE_DELAY_MS: 1500,

    // 同步与反抖
    SYNC_DEBOUNCE_MS: 50,
    UI_FEEDBACK_DELAY_MS: 100,

    // 默认名称
    DEFAULT_FILENAME: 'Untitled.md',
    DEFAULT_IMG_PREFIX: 'img_',
    ASSETS_DIR: 'assets',

    // 阈值
    SCROLL_THRESHOLD: 10,
    SCROLL_MARGIN_VERTICAL: 50,
    SCROLL_MARGIN_SMALL: 20,
    SCROLL_JITTER_THRESHOLD: 5,

    // 编辑器事件
    DOCUMENT_CHANGE_DEBOUNCE_MS: 500,

    // 查找与替换配置
    SEARCH_CONFIG: {
        REPLACE_CHUNK_SIZE: 1000,    // 恢复到 1000，确保 9000+ 匹配项时依然有顺滑的进度同步
        REPLACE_DELAY_MS: 0,         // 批次之间的延迟
        SEARCH_DEBOUNCE_MS: 150,     // 搜索输入防抖
    },

    // 服务名称 (遵循无硬编码原则)
    SERVICE_NAMES: {
        PERSISTENCE: 'editor.persistence',
        SYNC: 'editor.sync',
        LIFECYCLE: 'editor.lifecycle',
        ENGINE_SWITCH: 'editor.engine.switch',
    },
};
