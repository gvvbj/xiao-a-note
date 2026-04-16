/**
 * ModeChangeScript - IFrame 注入脚本（模式切换直通通道）
 *
 * 解决问题：cockpit 按钮通过 bridge.sendSignal 发送的 set-block-mode 信号
 * 会被 IFrameBridge 按 isolationId 过滤。当 IFrame 因事件透传竞态被销毁后，
 * IFrameBridge 已注销该 IFrame，导致信号丢失。
 *
 * 方案：注入一个额外脚本，在 cockpit 按钮点击时通过 raw postMessage 发送
 * 模式切换消息，绕过 IFrameBridge 的生命周期管理。宿主侧由插件的全局
 * 消息监听器接收处理。
 */

/** 消息类型常量 */
export const MODE_CHANGE_MESSAGE_TYPE = 'html-preview-mode-change';

/**
 * 生成 IFrame 注入脚本
 *
 * 在 IFrame 内部为 cockpit 按钮添加 capture-phase 监听器，
 * 提取 data-pos 和 data-mode 属性并发送 raw postMessage。
 */
export function getModeChangeScript(): string {
    return `
(function() {
    var MSG_TYPE = '${MODE_CHANGE_MESSAGE_TYPE}';

    // 在 cockpit 容器上监听 mousedown（capture phase）
    // 因为 bridge.js 的 tunnelEvent 在 window capture 上已注册，
    // 此处不阻止透传，仅补发一条 raw postMessage 确保消息不丢失
    document.addEventListener('mousedown', function(e) {
        var btn = e.target.closest ? e.target.closest('[data-mode-action]') : null;
        if (!btn) return;

        var pos = parseInt(btn.getAttribute('data-pos'), 10);
        var mode = btn.getAttribute('data-mode-action');

        if (!isNaN(pos) && mode) {
            window.parent.postMessage({
                type: MSG_TYPE,
                pos: pos,
                mode: mode
            }, '*');
        }
    }, true);
})();
`;
}
