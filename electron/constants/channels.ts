/**
 * IPC Channel Constants - IPC 通道常量
 * 
 * [Phase 9] 后端架构重构
 * 
 * 设计原则:
 * - 无硬编码: 所有 IPC 通道名称集中管理
 * - 可维护性: 避免字符串散落在各处
 * - 类型安全: TypeScript 常量确保一致性
 */

/**
 * 核心文件操作通道
 */
export const CORE_CHANNELS = {
    // 对话框
    DIALOG_OPEN_DIRECTORY: 'dialog:openDirectory',
    DIALOG_SHOW_SAVE: 'dialog:showSaveDialog',
    DIALOG_OPEN_FILE: 'dialog:openFile',

    // 文件读写
    FS_READ_FILE: 'fs:readFile',
    FS_WRITE_FILE: 'fs:writeFile',
    FS_CREATE_FILE: 'fs:createFile',
    FS_CREATE_DIRECTORY: 'fs:createDirectory',
    FS_RENAME: 'fs:rename',
    FS_DELETE: 'fs:delete',
    FS_MOVE: 'fs:move',
    FS_COPY: 'fs:copy',
    FS_CHECK_EXISTS: 'fs:checkExists',
    FS_SHOW_IN_FOLDER: 'fs:showItemInFolder',

    // 目录树
    FS_READ_DIRECTORY_TREE: 'fs:readDirectoryTree',
    FS_GET_ALL_MARKDOWN: 'fs:getAllMarkdownFiles',

    // 路径工具
    PATH_DIRNAME: 'path:dirname',
    PATH_JOIN: 'path:join',
    PATH_USER_DATA: 'path:userData',

    // 主题
    FS_GET_THEME_LIST: 'fs:getThemeList',
    FS_READ_THEME_FILE: 'fs:readThemeFile',
    FS_SAVE_THEME_ID: 'fs:saveThemeId',
    FS_LOAD_THEME_ID: 'fs:loadThemeId',

    // 文件监听
    FS_WATCH: 'fs:watch',
    FS_WATCH_EVENT: 'fs:watch-event'
} as const;

/**
 * 图片操作通道
 */
export const IMAGE_CHANNELS = {
    FS_SAVE_IMAGE: 'fs:saveImage',
    FS_SAVE_TEMP_IMAGE: 'fs:saveTempImage'
} as const;

/**
 * 导出操作通道
 */
export const EXPORT_CHANNELS = {
    FS_EXPORT_PDF: 'fs:exportToPDF',
    FS_EXPORT_WORD: 'fs:exportToWord',
    FS_EXPORT_ZIP: 'fs:exportToZip'
} as const;

/**
 * 文件树生成的限制常量
 */
export const FILE_TREE_LIMITS = {
    MAX_DEPTH: 5,
    MAX_FILES_TOTAL: 3000
} as const;

/**
 * MIME 类型映射
 */
export const MIME_TYPES: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'bmp': 'image/bmp',
    'ico': 'image/x-icon'
};

/**
 * [Phase 10 P3] 插件系统通道
 */
export const PLUGIN_CHANNELS = {
    GET_EXTERNAL_PLUGIN_LIST: 'plugin:getExternalList',
    READ_PLUGIN_CODE: 'plugin:readCode',
    READ_PLUGIN_DIRECTORY: 'plugin:readDirectory',
    LOAD_WASM: 'plugin:loadWasm'
} as const;

/**
 * [Phase 10 P4] 日志系统通道
 */
export const LOGGER_CHANNELS = {
    /** 写入日志 (单条) */
    WRITE_LOG: 'logger:write',
    /** 批量写入日志 */
    WRITE_LOG_BATCH: 'logger:writeBatch',
    /** 读取日志文件 (用于导出) */
    READ_LOG_FILE: 'logger:readFile',
    /** 清理日志文件 */
    CLEAR_LOGS: 'logger:clear'
} as const;

/**
 * [Phase 10 P4] 日志配置常量
 */
export const LOGGER_CONFIG = {
    /** 日志目录名 */
    DIR_NAME: 'logs',
    /** 主日志文件名 */
    FILE_NAME: 'app.log',
    /** 最大文件大小 (10MB) */
    MAX_FILE_SIZE: 10 * 1024 * 1024,
    /** 最大备份文件数 */
    MAX_BACKUP_COUNT: 3
} as const;

/**
 * [Phase 3 P5] AI 任务通道
 */
export const AI_CHANNELS = {
    START_TASK: 'ai:startTask',
    CANCEL_TASK: 'ai:cancelTask',
    TASK_EVENT: 'ai:task-event',
} as const;

/**
 * [Phase 5] AI 配置与密钥管理通道
 */
export const AI_CONFIG_CHANNELS = {
    LIST_PROVIDERS: 'ai-config:listProviders',
    UPSERT_PROVIDER: 'ai-config:upsertProvider',
    DELETE_PROVIDER: 'ai-config:deleteProvider',
    CLEAR_PROVIDER_SECRET: 'ai-config:clearProviderSecret',
    TEST_PROVIDER_CONNECTION: 'ai-config:testProviderConnection',
    DISCOVER_OLLAMA_MODELS: 'ai-config:discoverOllamaModels',
} as const;
