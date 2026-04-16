import { EventEmitter } from 'eventemitter3';
import { CoreEvents } from '../core/Events';
import { loggerService } from './LoggerService';

const logger = loggerService.createLogger('LayoutService');

/**
 * LayoutService - 全局布局状态服务
 * 
 * 职责:
 * 1. 管理侧边栏状态 (可见性、宽度、当前活动)
 * 2. 管理专注模式 (Zen Mode)
 * 3. 发射布局变更事件
 * 
 * 遵循原则:
 * - 服务化: 布局状态由内核服务管理
 * - 解耦: 组件通过服务访问状态，不直接依赖 Zustand Store
 */
export interface LayoutState {
    sidebarVisible: boolean;
    sidebarWidth: number;
    activeActivity: string;
    isZenMode: boolean;
}

export class LayoutService extends EventEmitter {
    private state: LayoutState = {
        sidebarVisible: true,
        sidebarWidth: 256,
        activeActivity: 'explorer-sidebar',
        isZenMode: false
    };

    constructor() {
        super();
        this.loadFromStorage();
    }

    private loadFromStorage() {
        try {
            const saved = localStorage.getItem('little-a-notes-layout');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.state = { ...this.state, ...parsed.state };
            }
        } catch (e) {
            logger.warn('Failed to load state', e);
        }
    }

    private saveToStorage() {
        try {
            localStorage.setItem('little-a-notes-layout', JSON.stringify({ state: this.state }));
        } catch (e) {
            logger.warn('Failed to save state', e);
        }
    }

    getState(): LayoutState {
        return { ...this.state };
    }

    // === 侧边栏操作 ===

    toggleSidebar() {
        this.state.sidebarVisible = !this.state.sidebarVisible;
        this.emit(CoreEvents.LAYOUT_CHANGED, this.state);
        this.saveToStorage();
    }

    setSidebarVisible(visible: boolean) {
        this.state.sidebarVisible = visible;
        this.emit(CoreEvents.LAYOUT_CHANGED, this.state);
        this.saveToStorage();
    }

    setSidebarWidth(width: number) {
        this.state.sidebarWidth = Math.max(120, Math.min(600, width));
        this.emit(CoreEvents.LAYOUT_CHANGED, this.state);
        this.saveToStorage();
    }

    setActiveActivity(id: string) {
        this.state.activeActivity = id;
        this.state.sidebarVisible = true; // 切换时自动展开
        this.emit(CoreEvents.LAYOUT_CHANGED, this.state);
        this.saveToStorage();
    }

    // === 专注模式 ===

    toggleZenMode() {
        this.state.isZenMode = !this.state.isZenMode;
        this.emit(CoreEvents.LAYOUT_CHANGED, this.state);
        this.emit(CoreEvents.ZEN_MODE_CHANGED, this.state.isZenMode);
    }

    setZenMode(enabled: boolean) {
        this.state.isZenMode = enabled;
        this.emit(CoreEvents.LAYOUT_CHANGED, this.state);
        this.emit(CoreEvents.ZEN_MODE_CHANGED, enabled);
    }
}
