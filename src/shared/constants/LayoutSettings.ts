export const LayoutSettingKey = {
    RIGHT_SIDEBAR_VISIBLE: 'layout.rightSidebarVisible',
    RIGHT_SIDEBAR_WIDTH: 'layout.rightSidebarWidth',
} as const;

export const RightSidebarLayout = {
    DEFAULT_WIDTH: 360,
    MIN_WIDTH: 280,
    MAX_WIDTH: 640,
} as const;
