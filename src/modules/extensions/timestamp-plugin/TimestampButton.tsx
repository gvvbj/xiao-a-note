import React from 'react';
import { Clock } from 'lucide-react';
import { useKernel } from '@/kernel/core/KernelContext';
import { CoreEvents } from '@/kernel/core/Events';

/**
 * 时区配置常量 (遵循零硬编码原则)
 */
const TIMEZONE_CONFIG = {
    locale: 'zh-CN',
    timezone: 'Asia/Shanghai'
} as const;

export function TimestampButton() {
    const kernel = useKernel();
    const [time, setTime] = React.useState(
        new Date().toLocaleTimeString(TIMEZONE_CONFIG.locale, { timeZone: TIMEZONE_CONFIG.timezone })
    );

    React.useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date().toLocaleTimeString(TIMEZONE_CONFIG.locale, { timeZone: TIMEZONE_CONFIG.timezone }));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const handleClick = () => {
        const timeStr = new Date().toLocaleString(TIMEZONE_CONFIG.locale, { timeZone: TIMEZONE_CONFIG.timezone }) + ' ';
        // 发送插入文本事件
        kernel.emit(CoreEvents.EDITOR_INSERT_TEXT, timeStr);
    };

    return (
        <button
            onClick={handleClick}
            className="flex items-center gap-1 px-1.5 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
            title="点击插入当前时间"
        >
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <span className="font-mono text-[11px] leading-none">{time}</span>
        </button>
    );
}
