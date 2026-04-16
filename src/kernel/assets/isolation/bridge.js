(function () {
    const init = () => {
        const body = document.body;
        if (!body) { requestAnimationFrame(init); return; }

        // 隔离 ID 将在注入时由宿主替换为真实值
        const isolationId = 'ISOLATION_ID_PLACEHOLDER';

        const postToParent = (msg) => {
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ signalSource: 'isolation-bridge', isolationId, ...msg }, '*');
            }
        };

        // 1. 高度自适应同步 (通过 postMessage)
        const Observer = window.ResizeObserver || window.WebkitResizeObserver;
        if (Observer) {
            const resizeObserver = new Observer(entries => {
                for (let entry of entries) {
                    postToParent({ type: 'resize', height: entry.target.scrollHeight });
                }
            });
            resizeObserver.observe(body);
        }

        // 2. 点击事件透传 (发送原始坐标至宿主转发)
        const tunnelEvent = (e) => {
            // [Phase 9.2] 内核去脂：不再在底层预判交互意图。
            // 默认所有事件均为编辑意图，除非插件侧通过 bridge.sendPulse() 显式声明主权。
            const isInteractable = false;

            postToParent({
                type: 'event',
                eventType: e.type,
                intent: isInteractable ? 'interact' : 'edit',
                data: {
                    detail: e.detail,
                    clientX: e.clientX,
                    clientY: e.clientY,
                    ctrlKey: e.ctrlKey,
                    altKey: e.altKey,
                    shiftKey: e.shiftKey,
                    metaKey: e.metaKey,
                    button: e.button,
                    buttons: e.buttons
                }
            });
        };

        ['mousedown', 'mouseup', 'click'].forEach(type => {
            window.addEventListener(type, tunnelEvent, true);
        });

        // 3. 接收宿主的主题更新 (由于 sandbox 跨域限制，必须使用消息同步)
        window.addEventListener('message', (event) => {
            const data = event.data;
            if (!data) return;
            // 处理主题更新
            if (data.type === 'theme-update' && data.vars) {
                const style = body.style;
                Object.entries(data.vars).forEach(([name, value]) => {
                    style.setProperty(name, value);
                });
            }
        });

        // 4. 暴露受控 API 给插件 JS
        // [Phase 8.1] 虚拟文件系统访问
        window.bridge = {
            /**
             * [Phase 9.2] 手动发送交互脉冲信号
             * 插件在捕获到自定义交互后调用此方法，内核将延长预览锁定时间。
             */
            sendPulse() {
                postToParent({ type: 'pulse' });
            },
            /**
             * [Phase 9.3] 发送自定义业务信号 (带载荷)
             * 允许插件侧发送特定指令，由宿主侧注册的 SignalHandler 处理。
             */
            sendSignal(type, data = {}) {
                postToParent({ type, ...data });
            }
        };
    };

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        init();
    } else {
        window.addEventListener('DOMContentLoaded', init);
    }
})();
