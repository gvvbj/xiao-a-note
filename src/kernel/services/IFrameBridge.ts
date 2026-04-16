import { ISOLATION_CONSTANTS } from '@/kernel/constants/IsolationConstants';

export class IFrameBridge {
    private static iframeMap = new Map<string, HTMLIFrameElement>();
    private static lastInteractionMap = new Map<string, number>();
    private static isInitialized = false;
    private static signalHandlers = new Map<string, (iframe: HTMLIFrameElement, data: any) => void>();

    static init() {
        if (this.isInitialized) return;

        window.addEventListener('message', (event) => {
            const data = event.data;
            if (!data || data.signalSource !== 'isolation-bridge' || !data.isolationId) return;

            const iframe = this.iframeMap.get(data.isolationId);
            if (!iframe) return;

            switch (data.type) {
                case 'resize':
                    iframe.style.height = `${data.height}px`;
                    break;
                case 'pulse':
                    this.lastInteractionMap.set(data.isolationId, Date.now());
                    break;
                case 'event':
                    this.handleTunneledEvent(iframe, data.eventType, data.data);
                    break;
                default:
                    const handler = this.signalHandlers.get(data.type);
                    if (handler) {
                        handler(iframe, data);
                    }
                    break;
            }
        });

        this.isInitialized = true;
    }

    static register(id: string, iframe: HTMLIFrameElement) {
        this.init();
        this.iframeMap.set(id, iframe);
        this.syncThemeVariables(iframe);
    }

    static unregister(id: string) {
        this.iframeMap.delete(id);
    }

    static registerSignalHandler(type: string, handler: (iframe: HTMLIFrameElement, data: any) => void): () => void {
        this.signalHandlers.set(type, handler);
        return () => this.signalHandlers.delete(type);
    }

    private static handleTunneledEvent(iframe: HTMLIFrameElement, type: string, data: any) {
        const rect = iframe.getBoundingClientRect();

        const event = new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            view: window,
            detail: data.detail,
            clientX: rect.left + data.clientX,
            clientY: rect.top + data.clientY,
            ctrlKey: data.ctrlKey,
            altKey: data.altKey,
            shiftKey: data.shiftKey,
            metaKey: data.metaKey,
            button: data.button,
            buttons: data.buttons
        });

        if (type === 'mousedown') {
            window.focus();
        }

        iframe.dispatchEvent(event);
    }

    static notifyThemeChanged() {
        this.iframeMap.forEach(iframe => {
            requestAnimationFrame(() => this.syncThemeVariables(iframe));
        });
    }

    static syncThemeVariables(iframe: HTMLIFrameElement) {
        try {
            const hostStyles = getComputedStyle(document.documentElement);
            const vars: Record<string, string> = {};

            ISOLATION_CONSTANTS.SYNC_VARS.forEach(varName => {
                const val = hostStyles.getPropertyValue(varName);
                if (val) vars[varName] = val;
            });

            iframe.contentWindow?.postMessage({
                type: 'theme-update',
                vars
            }, '*');
        } catch (e) {
            // iframe 可能尚未就绪，忽略同步异常
        }
    }

    static isInteracting(iframe: HTMLIFrameElement): boolean {
        let foundId: string | null = null;
        for (const [id, el] of this.iframeMap.entries()) {
            if (el === iframe) {
                foundId = id;
                break;
            }
        }

        if (!foundId) return false;

        const lastTime = this.lastInteractionMap.get(foundId) || 0;
        const now = Date.now();
        const diff = now - lastTime;

        return diff < ISOLATION_CONSTANTS.INTERACTION_PULSE_MS;
    }

    static hasGlobalInteractionPulse(): boolean {
        const now = Date.now();
        for (const time of this.lastInteractionMap.values()) {
            if (now - time < ISOLATION_CONSTANTS.INTERACTION_PULSE_MS) {
                return true;
            }
        }
        return false;
    }

    static getBaseStyles(): string {
        return ISOLATION_CONSTANTS.BASE_STYLES;
    }
}
