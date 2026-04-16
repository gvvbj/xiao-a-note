/**
 * ThemeController - 主题控制器
 * 
 * 从 index.tsx 抽离的业务逻辑
 * 
 * 职责:
 * 1. 加载外部主题
 * 2. 应用当前主题
 * 3. 注册主题菜单
 * 4. 订阅主题变化
 * 
 * 遵循原则:
 * - Plugin-First: 业务逻辑集中在 Controller，index.tsx 只负责 wiring
 * - 0 硬编码: 使用 ThemeConstants 中的常量
 */

import { Kernel } from '@/kernel/core/Kernel';
import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import { MenuService } from '@/kernel/services/MenuService';
import { ThemeService, ThemeItem } from '@/kernel/services/ThemeService';
import { IFileSystem } from '@/kernel/interfaces/IFileSystem';
import { ThemeType, DEFAULT_THEME_IDS } from '@/kernel/constants/ThemeConstants';
import { IFrameBridge } from '@/kernel/services/IFrameBridge';

export class ThemeController {
    private kernel: Kernel;
    private themeService: ThemeService;
    private menuService: MenuService | null;
    private logger: any;

    private cleanups: (() => void)[] = [];
    private menuCleanups: (() => void)[] = [];

    constructor(kernel: Kernel, logger?: any) {
        this.kernel = kernel;
        this.logger = logger;
        this.themeService = kernel.getService<ThemeService>(ServiceId.THEME);
        this.menuService = kernel.getService<MenuService>(ServiceId.MENU, false);
    }

    /**
     * 初始化控制器
     */
    async init(): Promise<void> {
        // 1. 订阅列表变更 (核心：解决异步文件扫描滞后导致的 ID 未激活问题)
        const handleListChanged = () => {
            const currentId = this.themeService.getCurrentThemeId();
            const theme = this.themeService.getCurrentTheme();
            if (theme) {
                this.applyCurrentTheme();
            }
        };
        this.themeService.on(CoreEvents.THEME_LIST_CHANGED, handleListChanged);
        this.cleanups.push(() => this.themeService.off(CoreEvents.THEME_LIST_CHANGED, handleListChanged));

        // 2. 加载外部主题
        await this.loadExternalThemes();

        // 3. 应用当前状态 (首轮尝试)
        this.applyCurrentTheme();

        // 4. 订阅主题 ID 变更
        const handleThemeChanged = () => {
            this.applyCurrentTheme();
            // 零侵入式同步：通知所有隔离的渲染块更新 CSS 变量
            IFrameBridge.notifyThemeChanged();
        };
        this.themeService.on(CoreEvents.THEME_CHANGED, handleThemeChanged);
        this.cleanups.push(() => this.themeService.off(CoreEvents.THEME_CHANGED, handleThemeChanged));

        // 5. 注册 UI 指令与菜单
        this.registerThemeMenu();
        this.registerCommands();


    }

    /**
     * 注册内核指令
     */
    private registerCommands(): void {
        const handleToggle = () => this.toggleThemeType();
        this.kernel.on(CoreEvents.APP_CMD_TOGGLE_THEME, handleToggle);
        this.cleanups.push(() => this.kernel.off(CoreEvents.APP_CMD_TOGGLE_THEME, handleToggle));
    }

    /**
     * 加载外部主题
     */
    private async loadExternalThemes(): Promise<void> {
        try {
            const fileSystem = this.kernel.getService<IFileSystem>(ServiceId.FILE_SYSTEM, false);
            if (!fileSystem) {
                this.logger?.error('[Manager] FileSystem unavailable, blocking file scan');
                return;
            }

            const themeList = await fileSystem.getThemeList();


            if (!themeList || themeList.length === 0) return;

            const builtInThemes = this.themeService.getThemes();
            const externalThemes: ThemeItem[] = themeList.map((t: any) => ({
                id: t.id,
                name: t.name,
                path: t.path,
                type: t.id.includes('dark') ? ThemeType.DARK : ThemeType.LIGHT
            }));

            const mergedThemes = this.mergeThemes(builtInThemes, externalThemes);
            this.themeService.setThemes(mergedThemes);
        } catch (e) {
            this.logger?.error('[Manager] Unexpected error loading external themes', e);
        }
    }

    private mergeThemes(builtIn: ThemeItem[], external: ThemeItem[]): ThemeItem[] {
        const themeMap = new Map<string, ThemeItem>();
        external.forEach(t => themeMap.set(t.id, t));
        builtIn.forEach(t => themeMap.set(t.id, t)); // 内置覆盖，保留中文名
        return Array.from(themeMap.values());
    }

    /**
     * 深度应用当前主题 (唯一入口)
     */
    private applyCurrentTheme(): void {
        const currentThemeId = this.themeService.getCurrentThemeId();
        const theme = this.themeService.getCurrentTheme();



        // [Physical Cleanup] 先卸载旧动态样式
        this.themeService.removeExternalThemeCSS();

        if (!theme) {
            this.logger?.warn('[Renderer] Activation failed: no matching object in pool, triggering base light/dark fallback render');
            // 基础兜底逻辑：防止全白屏
            const fallbackType = currentThemeId.includes('dark') ? ThemeType.DARK : ThemeType.LIGHT;
            this.themeService.applyCSSVariables(fallbackType);
            return;
        }

        // 1. 设置根组件属性
        document.documentElement.setAttribute('data-theme', currentThemeId);

        // 2. 应用基础上下文 (.dark)
        this.themeService.applyCSSVariables(theme.type);

        // 3. 动态注入外部样式
        if (theme.path) {
            this.themeService.loadExternalThemeCSS(theme.path);
        }


    }

    /**
     * 精确切换对转算法 (Deterministic Toggle)
     */
    private toggleThemeType(): void {
        const currentThemeId = this.themeService.getCurrentThemeId();
        const themes = this.themeService.getThemes();
        const current = themes.find(t => t.id === currentThemeId);

        if (!current) {
            this.logger?.warn('[Toggle] Current theme state abnormal, cannot execute toggle');
            return;
        }

        const targetType = current.type === ThemeType.DARK ? ThemeType.LIGHT : ThemeType.DARK;

        // 基于 BaseName 去后缀匹配
        const baseName = current.id.replace(/-dark$|-light$/, '');
        const targetId = `${baseName}-${targetType}`;



        const paired = themes.find(t => t.id === targetId);

        if (paired) {
            this.themeService.setCurrentTheme(paired.id);
            return;
        }

        // 失败回退：确立系统唯一默认锚点，杜绝随机性
        const fallbackId = targetType === ThemeType.DARK ? DEFAULT_THEME_IDS.DARK : DEFAULT_THEME_IDS.LIGHT;

        this.themeService.setCurrentTheme(fallbackId);
    }

    /**
     * 更新主题菜单
     */
    private updateThemeMenuItems(): void {
        if (!this.menuService) return;
        this.menuCleanups.forEach(fn => fn());
        this.menuCleanups = [];

        const themes = this.themeService.getThemes();
        const currentThemeId = this.themeService.getCurrentThemeId();

        themes.forEach((t, index) => {
            const cleanup = this.menuService!.registerMenuItem('theme', {
                id: `theme-item-${t.id}`,
                label: t.name + (currentThemeId === t.id ? ' ✓' : ''),
                action: () => {

                    this.themeService.setCurrentTheme(t.id);
                },
                order: 20 + index
            });
            this.menuCleanups.push(cleanup);
        });
    }

    private registerThemeMenu(): void {
        if (!this.menuService) return;
        this.cleanups.push(this.menuService.registerMenuGroup({ id: 'theme', label: '主题', order: 40 }));
        this.cleanups.push(this.menuService.registerMenuItem('theme', {
            id: 'theme-toggle',
            label: '🌓 切换深色/浅色',
            action: () => this.toggleThemeType(),
            order: 10
        }));

        this.updateThemeMenuItems();
        const update = () => this.updateThemeMenuItems();
        this.themeService.on(CoreEvents.THEME_LIST_CHANGED, update);
        this.themeService.on(CoreEvents.THEME_CHANGED, update);
        this.cleanups.push(() => {
            this.themeService.off(CoreEvents.THEME_LIST_CHANGED, update);
            this.themeService.off(CoreEvents.THEME_CHANGED, update);
        });
    }

    dispose(): void {
        this.menuCleanups.forEach(fn => fn());
        this.cleanups.forEach(fn => fn());

    }
}
