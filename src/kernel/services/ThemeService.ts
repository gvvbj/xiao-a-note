import { EventEmitter } from 'eventemitter3';
import { Kernel } from '@/kernel/core/Kernel';
import { ServiceId } from '@/kernel/core/ServiceId';
import { SettingsService } from './SettingsService';
import { LoggerService, ILogger } from './LoggerService';
import { IFileSystem } from '@/kernel/interfaces/IFileSystem';
import {
    ThemeType,
    DEFAULT_THEME_IDS,
    THEME_SETTINGS_NAMESPACE,
    LIGHT_THEME_VALUES,
    DARK_THEME_VALUES,
    getCSSVarName
} from '@/kernel/constants/ThemeConstants';
import { CoreEvents } from '@/kernel/core/Events';

/**
 * 主题项接口
 */
export interface ThemeItem {
    id: string;
    name: string;
    path?: string; // 外部文件路径，内置主题为 undefined
    type: ThemeType;
}

/**
 * 默认主题列表 (使用常量，零硬编码)
 */
const DEFAULT_THEMES: ThemeItem[] = [
    { id: DEFAULT_THEME_IDS.LIGHT, name: '默认浅色', type: ThemeType.LIGHT },
    { id: DEFAULT_THEME_IDS.DARK, name: '默认深色', type: ThemeType.DARK }
];

/**
 * ThemeService - 全局主题服务
 * 
 * 增强版
 * 
 * 职责:
 * 1. 管理当前主题 ID 和主题列表
 * 2. 通过 SettingsService 持久化主题配置
 * 3. 发布主题变更事件
 * 4. 动态应用 CSS 变量 (Phase 11 新增)
 * 
 * 遵循原则:
 * - 0 硬编码: 使用 ThemeConstants 中的常量
 * - 零 Store: 完全独立，不依赖 Zustand
 */
export class ThemeService extends EventEmitter {
    private _currentThemeId: string;
    private _themes: ThemeItem[];
    private _kernel?: Kernel;
    private _logger?: ILogger;

    constructor() {
        super();
        this._currentThemeId = DEFAULT_THEME_IDS.LIGHT;
        this._themes = [...DEFAULT_THEMES];
    }

    /**
     * 初始化服务，从 SettingsService 加载持久化状态
     * 应在 Kernel 注册服务后调用
     */
    async init(kernel: Kernel): Promise<void> {
        this._kernel = kernel;

        const loggerService = kernel.getService<LoggerService>(ServiceId.LOGGER, false);
        this._logger = loggerService?.createLogger('ThemeService');

        // 优先尝试从文件加载主题 ID (IPC)，解决 localStorage 易丢失问题
        let savedThemeId: string | null = null;
        try {
            const fileSystem = kernel.getService<IFileSystem & {
                loadThemeId?: () => Promise<string | null>;
            }>(ServiceId.FILE_SYSTEM, false);
            if (fileSystem && fileSystem.loadThemeId) {
                savedThemeId = await fileSystem.loadThemeId();
                if (savedThemeId) {
                    this._logger?.debug('[Persistence] Loaded theme ID from standalone file (theme.json):', savedThemeId);
                }
            }
        } catch (e) {
            this._logger?.warn('[Persistence] Failed to load theme from file, falling back to SettingsService:', e);
        }

        // 如果文件没读到，再尝试 SettingsService (localStorage)
        if (!savedThemeId) {
            const settingsService = kernel.getService<SettingsService>(ServiceId.SETTINGS, false);
            if (settingsService) {
                savedThemeId = settingsService.getSetting<string>(
                    `${THEME_SETTINGS_NAMESPACE}.currentThemeId`,
                    DEFAULT_THEME_IDS.LIGHT
                );
                this._logger?.debug('[Persistence] Loaded theme ID from SettingsService:', savedThemeId);
            }
        }

        if (savedThemeId) {
            this._currentThemeId = savedThemeId;
        }

        // 立即应用基础深浅模式类，防止启动时的剧烈白屏/黑屏闪烁
        const theme = this.getCurrentTheme();
        if (theme) {
            this.applyCSSVariables(theme.type);
        } else {
            // 兜底日志：说明此时 ID 虽然加载了，但主题列表中还没这个对象（通常是因为外部文件还没扫描）
            this._logger?.debug('[Persistence] Current ID has no matching object, waiting for Controller to load external themes');
        }
    }

    getCurrentThemeId(): string {
        return this._currentThemeId;
    }

    getThemes(): ThemeItem[] {
        return this._themes;
    }

    setThemes(themes: ThemeItem[]): void {
        this._themes = themes;
        this._logger?.debug('[Manager] Theme list updated, current capacity:', themes.length);
        this.emit(CoreEvents.THEME_LIST_CHANGED, themes);
    }

    setCurrentTheme(id: string): void {
        if (this._currentThemeId === id) return;
        this._currentThemeId = id;

        if (this._kernel) {
            // 1. 写入 localStorage (原有逻辑保持)
            const settingsService = this._kernel.getService<SettingsService>(ServiceId.SETTINGS, false);
            if (settingsService) {
                settingsService.updateSettings(THEME_SETTINGS_NAMESPACE, { currentThemeId: id });
                this._logger?.debug('[Persistence] New theme ID written to localStorage:', id);
            }

            // 2. 写入独立文件 (新增逻辑，更稳健)
            const fileSystem = this._kernel.getService<IFileSystem & {
                saveThemeId?: (themeId: string) => Promise<void>;
            }>(ServiceId.FILE_SYSTEM, false);
            if (fileSystem && fileSystem.saveThemeId) {
                fileSystem.saveThemeId(id).catch((e: unknown) => {
                    this._logger?.error('[Persistence] Failed to write theme ID to file:', e);
                });
                this._logger?.debug('[Persistence] New theme ID triggered write to theme.json:', id);
            }
        }

        this.emit(CoreEvents.THEME_CHANGED, id);
    }

    /**
     * 获取当前主题对象
     */
    getCurrentTheme(): ThemeItem | undefined {
        return this._themes.find(t => t.id === this._currentThemeId);
    }

    /**
     * 应用基础 CSS 类 (.dark/.light)
     * 遵循 0 硬编码原则，仅控制 Root Class，变量定义留在 CSS 文件中
     */
    applyCSSVariables(themeType: ThemeType): void {
        const root = document.documentElement;
        if (themeType === ThemeType.DARK) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        this._logger?.debug('[Renderer] Base light/dark class toggle completed:', themeType);
    }

    /**
     * 加载外部主题 CSS
     */
    async loadExternalThemeCSS(cssPath: string): Promise<void> {
        this.removeExternalThemeCSS(); // 渲染前物理清理

        try {
            const fileSystem = this._kernel?.getService<IFileSystem>(ServiceId.FILE_SYSTEM, false);
            if (!fileSystem?.readThemeFile) {
                this._logger?.error('[Renderer] FileSystem unavailable, blocking external style injection');
                return;
            }

            const cssContent = await fileSystem.readThemeFile(cssPath);
            if (!cssContent) {
                this._logger?.warn('[Renderer] External theme file content is empty:', cssPath);
                return;
            }

            const style = document.createElement('style');
            style.id = 'theme-external-css';
            style.textContent = cssContent;
            document.head.appendChild(style);

            this._logger?.debug('[Renderer] External theme CSS physical injection successful:', cssPath);
        } catch (e) {
            this._logger?.error('[Renderer] Failed to load external theme CSS', { cssPath, error: e });
        }
    }

    /**
     * 物理移除外部样式标签，彻底杜绝变量残留污染
     */
    removeExternalThemeCSS(): void {
        const existing = document.getElementById('theme-external-css');
        if (existing) {
            existing.remove();
            this._logger?.debug('[Cleanup] Old external style tag removed from DOM');
        }
    }
}

