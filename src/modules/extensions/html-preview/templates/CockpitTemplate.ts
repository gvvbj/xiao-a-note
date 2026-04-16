/**
 * 交互驾驶舱 (Cockpit) HTML/CSS 模板
 * 职责：定义 UI 展现，不含交互逻辑
 */

export interface ICockpitProps {
    from: number;
    mode: 'auto' | 'preview' | 'source';
}

export const getCockpitHtml = (props: ICockpitProps) => {
    const { from, mode } = props;
    const isLockedPreview = mode === 'preview';
    const isLockedSource = mode === 'source';

    return `
        <div id="interaction-cockpit" class="cockpit-overlay ${isLockedPreview ? 'is-locked' : ''}">
            <div class="cockpit-group">
                <!-- 场景 1: 切换回源码 (锁定源码态) -->
                <button class="cockpit-btn mode-btn source-btn ${isLockedSource ? 'active' : ''}" 
                        onmousedown="bridge.sendPulse(); bridge.sendSignal('set-block-mode', { pos: ${from}, mode: 'source' })">
                    <span class="btn-icon">📝</span>
                    <span class="btn-text">Source</span>
                </button>
                
                <div class="cockpit-spacer"></div>
                
                <!-- 场景 2: 强制预览 (锁定预览态) -->
                <button class="cockpit-btn mode-btn preview-btn ${isLockedPreview ? 'active' : ''}" 
                        onmousedown="bridge.sendPulse(); bridge.sendSignal('set-block-mode', { pos: ${from}, mode: 'preview' })">
                    <span class="btn-icon">🖼️</span>
                    <span class="btn-text">Preview</span>
                </button>

                <div class="cockpit-spacer"></div>

                <!-- 场景 3: 解锁 (恢复自动跟随) -->
                <button class="cockpit-btn unlock-btn" 
                        onmousedown="bridge.sendPulse(); bridge.sendSignal('set-block-mode', { pos: ${from}, mode: 'auto' })"
                        style="${mode === 'auto' ? 'display:none' : ''}">
                    <span class="btn-icon">🔓</span>
                    <span class="btn-text">Unlock</span>
                </button>

                <div class="cockpit-spacer"></div>
                <div class="cockpit-badge">HTML Preview</div>
            </div>
        </div>
    `;
};

export const getCockpitStyles = () => `
    .cockpit-overlay {
        position: fixed; top: 8px; right: 8px; z-index: 1000;
        display: flex; gap: 4px; padding: 4px;
        background: var(--editor-bg, #ffffff);
        border: 1px solid var(--border-color, #e0e0e0);
        border-radius: 6px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        opacity: 0.2; transition: opacity 0.2s, background 0.2s;
        user-select: none; pointer-events: auto;
    }
    .cockpit-overlay:hover { opacity: 1; background: var(--hover-bg, #f5f5f5); }
    .cockpit-overlay.is-locked { opacity: 0.8; border-color: var(--primary-color, #007acc); }
    
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
    .cockpit-badge { font-size: 10px; color: #999; padding-right: 4px; border-right: 1px solid #eee; }
`;
