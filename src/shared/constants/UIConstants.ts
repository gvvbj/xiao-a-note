/**
 * UIConstants - 通用 UI 交互常量
 */
export const UI_CONSTANTS = {
    // 焦点恢复延迟
    FOCUS_RESTORE_DELAY_MS: 50,
    INPUT_FOCUS_DELAY_MS: 100,

    // 弹窗动画/关闭延迟
    DIALOG_CLOSE_DELAY_MS: 200,

    // 搜索与反馈
    SEARCH_DEBOUNCE_MS: 150,

    // UI 区域标识 (用于焦点检测等场景，通过 data-region 属性标识)
    REGION: {
        /** 侧边栏文件树区域 */
        SIDEBAR_FILE_TREE: 'sidebar-file-tree',
    },
};
