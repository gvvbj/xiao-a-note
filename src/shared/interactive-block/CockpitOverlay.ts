/**
 * CockpitOverlay - 通用操控面板 UI 模板
 *
 * 从 HTML Preview 插件的 CockpitTemplate.ts 泛化而来。
 * 为所有交互式块提供统一的 三态切换 UI。
 *
 * 支持两种使用方式：
 *   1. IFrame 模式：通过 bridge.sendSignal 传递事件（HTML Preview 用）
 *   2. Widget 模式：通过 onSetMode 回调直接处理（Mermaid 等用）
 */

import { ICockpitConfig, BlockMode } from './types';

/**
 * 生成 Cockpit 操控面板 HTML（IFrame 模式）
 * 通过 bridge.sendSignal 发送模式切换信号
 */
export function getCockpitHtmlForIFrame(config: ICockpitConfig): string {
    const { from, mode, badge } = config;
    const isLockedPreview = mode === 'preview';
    const isLockedSource = mode === 'source';

    return `
        <div class="interactive-block-cockpit ${isLockedPreview ? 'is-locked' : ''}">
            <div class="cockpit-group">
                <button class="cockpit-btn source-btn ${isLockedSource ? 'active' : ''}"
                        data-mode-action="source" data-pos="${from}"
                        onmousedown="bridge.sendPulse(); bridge.sendSignal('set-block-mode', { pos: ${from}, mode: 'source' })">
                    <span class="btn-icon">📝</span>
                    <span class="btn-text">Source</span>
                </button>

                <div class="cockpit-spacer"></div>

                <button class="cockpit-btn preview-btn ${isLockedPreview ? 'active' : ''}"
                        data-mode-action="preview" data-pos="${from}"
                        onmousedown="bridge.sendPulse(); bridge.sendSignal('set-block-mode', { pos: ${from}, mode: 'preview' })">
                    <span class="btn-icon">🖼️</span>
                    <span class="btn-text">Preview</span>
                </button>

                <div class="cockpit-spacer"></div>

                <button class="cockpit-btn unlock-btn"
                        data-mode-action="auto" data-pos="${from}"
                        onmousedown="bridge.sendPulse(); bridge.sendSignal('set-block-mode', { pos: ${from}, mode: 'auto' })"
                        style="${mode === 'auto' ? 'display:none' : ''}">
                    <span class="btn-icon">🔓</span>
                    <span class="btn-text">Unlock</span>
                </button>

                <div class="cockpit-spacer"></div>
                <div class="cockpit-badge">${badge}</div>
            </div>
        </div>
    `;
}

/**
 * 创建 Cockpit 操控面板 DOM（Widget 模式）
 * 直接通过 onSetMode 回调处理模式切换
 */
export function createCockpitDom(config: ICockpitConfig): HTMLElement {
    const { from, mode, badge, onSetMode } = config;
    const isLockedPreview = mode === 'preview';
    const isLockedSource = mode === 'source';

    const cockpit = document.createElement('div');
    cockpit.className = `interactive-block-cockpit ${isLockedPreview ? 'is-locked' : ''}`;

    // 辅助函数：创建按钮
    const createBtn = (icon: string, label: string, targetMode: BlockMode, isActive: boolean): HTMLButtonElement => {
        const btn = document.createElement('button');
        btn.className = `cockpit-btn ${isActive ? 'active' : ''}`;
        btn.innerHTML = `<span class="btn-icon">${icon}</span><span class="btn-text">${label}</span>`;
        btn.onmousedown = (e) => {
            e.preventDefault();
            e.stopPropagation();
            onSetMode?.(from, targetMode);
        };
        return btn;
    };

    const group = document.createElement('div');
    group.className = 'cockpit-group';

    // 源码按钮
    group.appendChild(createBtn('📝', 'Source', 'source', isLockedSource));

    // 分隔符
    const spacer1 = document.createElement('div');
    spacer1.className = 'cockpit-spacer';
    group.appendChild(spacer1);

    // 预览按钮
    group.appendChild(createBtn('🖼️', 'Preview', 'preview', isLockedPreview));

    // 分隔符
    const spacer2 = document.createElement('div');
    spacer2.className = 'cockpit-spacer';
    group.appendChild(spacer2);

    // 解锁按钮（仅在锁定状态下显示）
    if (mode !== 'auto') {
        group.appendChild(createBtn('🔓', 'Unlock', 'auto', false));
        const spacer3 = document.createElement('div');
        spacer3.className = 'cockpit-spacer';
        group.appendChild(spacer3);
    }

    // 标签
    const badgeEl = document.createElement('div');
    badgeEl.className = 'cockpit-badge';
    badgeEl.textContent = badge;
    group.appendChild(badgeEl);

    cockpit.appendChild(group);
    return cockpit;
}

/**
 * Cockpit 通用样式
 * 可通过 context.registerStyle() 注入，或嵌入 IFrame
 */
export const COCKPIT_STYLES = `
    .interactive-block-cockpit {
        position: absolute; top: 4px; right: 4px; z-index: 100;
        display: flex; gap: 4px; padding: 4px;
        background: var(--editor-bg, #ffffff);
        border: 1px solid var(--border-color, #e0e0e0);
        border-radius: 6px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        opacity: 0; transition: opacity 0.2s, background 0.2s;
        user-select: none; pointer-events: auto;
    }
    /* 悬停时显示操控面板 */
    .interactive-block-wrapper:hover .interactive-block-cockpit { opacity: 1; }
    .interactive-block-cockpit.is-locked { opacity: 0.8; border-color: var(--primary-color, #007acc); }
    .interactive-block-cockpit:hover { opacity: 1; background: var(--hover-bg, #f5f5f5); }

    .cockpit-group { display: flex; align-items: center; gap: 8px; }
    .cockpit-btn {
        border: none; background: transparent; cursor: pointer;
        font-size: 11px; display: flex; align-items: center; gap: 4px;
        padding: 4px 8px; border-radius: 4px;
        color: var(--text-color, #333);
        transition: all 0.2s;
    }
    .cockpit-btn:hover { background: rgba(0,0,0,0.05); }
    .cockpit-btn.active { background: rgba(0, 122, 204, 0.1); color: #007acc; font-weight: bold; }
    .cockpit-badge { font-size: 10px; color: #999; padding-left: 4px; border-left: 1px solid #eee; }
    .cockpit-spacer { width: 1px; }

    /* 交互式块通用包裹层 */
    .interactive-block-wrapper {
        position: relative;
        margin: 4px 0;
    }
`;
