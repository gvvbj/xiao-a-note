import React from 'react';
import { IPlugin, IPluginContext, PluginCategory } from '@/kernel/system/plugin/types';
import { SplitViewService } from './services/SplitViewService';
import { SplitPreview } from './components/SplitPreview';
import { SplitViewToggleButton } from './components/SplitViewToggleButton';
import { UISlotId } from '@/kernel/core/Constants';
import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import { LoggerService } from '@/kernel/services/LoggerService';
import { registerSplitViewUIActions } from './services/registerSplitViewUIActions';

/**
 * SplitViewPlugin - 分栏功能插件
 * 
 * 重构后的纯 wiring 入口
 * 
 * 职责:
 * 1. 注册 SplitViewService
 * 2. 注册 UI 组件到 Header
 * 3. 监听分栏状态变化并动态挂载 Preview
 * 
 * 遵循原则:
 * - Plugin-First: UI 组件剥离到 components 目录
 * - 0 硬编码: 事件名使用常量
 */
export default class SplitViewPlugin implements IPlugin {
    id = 'split-view';
    name = '分栏功能';
    version = '1.0.0';
    category = PluginCategory.SYSTEM;
    internal = true;
    essential = true;
    // editor 已接入 PluginManager 自动发现，split-view 显式依赖并排在其后
    order = 110;
    dependencies = ['editor'];

    private service: SplitViewService | null = null;
    private logger: any = null;
    private companionDisposer: (() => void) | null = null;
    private cleanups: (() => void)[] = [];

    activate(context: IPluginContext) {
        const kernel = context.kernel;

        // 使用 LoggerService
        const loggerService = kernel.getService<LoggerService>(ServiceId.LOGGER, false);
        this.logger = loggerService?.createLogger('SplitViewPlugin');
        this.logger?.info('Activating SplitViewPlugin...');

        // 1. 创建并注册服务
        this.service = new SplitViewService(kernel);
        context.registerService(ServiceId.SPLIT_VIEW, this.service);
        this.service.init();
        this.cleanups.push(...registerSplitViewUIActions(kernel, this.service));

        // 2. 动态 UI 挂载策略：根据分栏状态动态注册/卸载预览视图
        const updateCompanionUI = (active: boolean) => {
            if (active) {
                if (!this.companionDisposer) {
                    this.companionDisposer = context.registerUI(UISlotId.EDITOR_SIDE_COMPANION, {
                        id: 'split-view-preview',
                        component: SplitPreview
                    });
                }
            } else {
                if (this.companionDisposer) {
                    this.companionDisposer();
                    this.companionDisposer = null;
                }
            }
        };

        // 监听分栏状态变化
        kernel.on(CoreEvents.SPLIT_VIEW_CHANGED, updateCompanionUI);
        this.cleanups.push(() => kernel.off(CoreEvents.SPLIT_VIEW_CHANGED, updateCompanionUI));

        // [Bug 3] 关闭分栏时恢复 viewMode（业务逻辑已下沉到 SplitViewService）
        // 关键时序：SPLIT_VIEW_TRANSITION_START 在 setViewMode('source') 之前发射；
        //         SPLIT_VIEW_CHANGED 在 setViewMode('source') 之后发射。
        const handleSaveViewMode = () => this.service?.captureViewModeBeforeSplitTransition();
        const handleRestoreViewMode = (isSplit: boolean) => this.service?.restoreViewModeAfterSplitChange(isSplit);

        kernel.on(CoreEvents.SPLIT_VIEW_TRANSITION_START, handleSaveViewMode);
        kernel.on(CoreEvents.SPLIT_VIEW_CHANGED, handleRestoreViewMode);
        this.cleanups.push(() => kernel.off(CoreEvents.SPLIT_VIEW_TRANSITION_START, handleSaveViewMode));
        this.cleanups.push(() => kernel.off(CoreEvents.SPLIT_VIEW_CHANGED, handleRestoreViewMode));

        // 初始化挂载状态
        updateCompanionUI(this.service.isSplitView);

        // 3. 注册 UI 按钮到编辑器抬头 (组件已剥离)
        const service = this.service;
        context.registerUI(UISlotId.EDITOR_HEADER_RIGHT, {
            id: 'split-view-toggle',
            order: 50,
            component: () => <SplitViewToggleButton service={service} kernel={kernel} />
        });

        // 4. 监听分栏切换事件
        const handleToggle = () => this.service?.setSplitView(true);
        const handleClose = () => this.service?.setSplitView(false);
        kernel.on(CoreEvents.TOGGLE_SPLIT_VIEW, handleToggle);
        kernel.on(CoreEvents.CLOSE_SPLIT_VIEW, handleClose);
        this.cleanups.push(() => kernel.off(CoreEvents.TOGGLE_SPLIT_VIEW, handleToggle));
        this.cleanups.push(() => kernel.off(CoreEvents.CLOSE_SPLIT_VIEW, handleClose));

        this.logger?.info('SplitViewPlugin activated successfully');
    }

    deactivate() {
        if (this.companionDisposer) {
            this.companionDisposer();
            this.companionDisposer = null;
        }
        this.cleanups.forEach(cleanup => cleanup());
        this.cleanups = [];
        this.service?.dispose();
        this.service = null;
        this.logger?.info('SplitViewPlugin deactivated');
    }
}

