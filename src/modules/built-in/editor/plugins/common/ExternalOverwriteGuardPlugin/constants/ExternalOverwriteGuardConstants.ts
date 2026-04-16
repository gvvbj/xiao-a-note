export const EXTERNAL_OVERWRITE_DIALOG_KIND = {
    RESOLUTION: 'resolution',
    SAVE_PROTECTION: 'save_protection',
} as const;

export const EXTERNAL_OVERWRITE_DIALOG_TEXT = {
    RESOLUTION: {
        title: '文件已被外部覆盖',
        description: (fileName: string) =>
            `文件 "${fileName}" 已被应用外的新版本覆盖，当前标签内容可能已经过期。\n\n你可以重新加载磁盘最新内容、关闭标签，或暂时保留当前内容。`,
        saveText: '重新加载',
        discardText: '关闭标签',
        cancelText: '暂时保留',
    },
    SAVE_PROTECTION: {
        title: '检测到外部覆盖冲突',
        description: (fileName: string) =>
            `文件 "${fileName}" 已被应用外的新版本覆盖。\n\n如果继续保存，将覆盖磁盘上的新版本。`,
        saveText: '继续覆盖保存',
        discardText: '重新加载',
        cancelText: '暂时保留',
    },
} as const;

export type ExternalOverwriteDialogKind =
    typeof EXTERNAL_OVERWRITE_DIALOG_KIND[keyof typeof EXTERNAL_OVERWRITE_DIALOG_KIND];
