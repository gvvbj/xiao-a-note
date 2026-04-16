/**
 * 虚拟文件系统 (VFS) 环境注入脚本
 * 职责：在 IFrame 隔离沙箱内重建 API 环境
 */

export const getVfsScript = () => `
(function() {
    const callbackMap = new Map();
    let queryCounter = 0;
    const WAIT_INTERVAL_MS = 25;
    const MAX_WAIT_ATTEMPTS = 80;
    
    // 基础消息监听：处理异步回调
    window.addEventListener('message', (event) => {
        const data = event.data;
        if (data.type === 'fs-response' && data.queryId) {
            const cb = callbackMap.get(data.queryId);
            if (cb) {
                if (data.status === 'success') cb.resolve(data.data);
                else cb.reject(new Error(data.message));
                callbackMap.delete(data.queryId);
            }
        }
    });

    const installFsBridge = () => {
        if (!window.bridge) return false;
        if (window.bridge.fs) return true;

        // 在隔离沙箱内重建 fs 镜像对象
        window.bridge.fs = {
            list(path) {
                return new Promise((resolve, reject) => {
                    const queryId = 'fs-' + Date.now() + '-' + (queryCounter++);
                    callbackMap.set(queryId, { resolve, reject });
                    window.bridge.sendSignal('fs-query', { operation: 'list', path, queryId });
                });
            },
            read(path) {
                return new Promise((resolve, reject) => {
                    const queryId = 'fs-' + Date.now() + '-' + (queryCounter++);
                    callbackMap.set(queryId, { resolve, reject });
                    window.bridge.sendSignal('fs-query', { operation: 'read', path, queryId });
                });
            }
        };

        return true;
    };

    const waitForBridge = (attempt = 0) => {
        if (installFsBridge()) return;
        if (attempt >= MAX_WAIT_ATTEMPTS) return;
        window.setTimeout(() => waitForBridge(attempt + 1), WAIT_INTERVAL_MS);
    };

    waitForBridge();
})();
`;
