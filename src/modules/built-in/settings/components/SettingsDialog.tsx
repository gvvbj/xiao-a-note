import React, { useState, useEffect, useMemo } from 'react';
import { X, Settings, FileText } from 'lucide-react';
import { useKernel } from '@/kernel/core/KernelContext';
import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import { SettingsService } from '@/kernel/services/SettingsService';
import { IRegisteredSetting } from '../types';
import { cn } from '@/shared/utils';
import { LogPanel } from './LogPanel';

interface SettingsDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

/**
 * SettingsDialog - 统一设置对话框
 * 
 * 遵循原则:
 * - 0 硬编码: 配置项从注册表动态获取
 * - Plugin-First: UI 自动生成基于配置描述符
 */
export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
    const kernel = useKernel();
    const settingsService = kernel.getService<SettingsService>(ServiceId.SETTINGS, false);

    const [settings, setSettings] = useState<IRegisteredSetting[]>([]);
    const [values, setValues] = useState<Record<string, any>>({});
    const [activeGroup, setActiveGroup] = useState<string>('general');

    // 获取注册的配置项
    useEffect(() => {
        if (!isOpen) return;

        const registry = kernel.getService<{ items: IRegisteredSetting[] }>(ServiceId.SETTINGS_REGISTRY, false);
        const registeredSettings = registry?.items || [];
        setSettings(registeredSettings);

        // 加载当前值
        const currentValues: Record<string, any> = {};
        for (const item of registeredSettings) {
            currentValues[item.id] = settingsService?.getSetting(item.id, item.defaultValue) ?? item.defaultValue;
        }
        setValues(currentValues);
    }, [isOpen, kernel, settingsService]);

    // 监听外部变更 (如菜单栏触发的变更)
    useEffect(() => {
        const handler = ({ id, value }: { id: string, value: any }) => {
            setValues(prev => ({ ...prev, [id]: value }));
        };
        kernel.on(CoreEvents.SETTING_CHANGED, handler);
        return () => { kernel.off(CoreEvents.SETTING_CHANGED, handler); };
    }, [kernel]);

    // 按分组整理配置项
    const groupedSettings = useMemo(() => {
        const groups: Record<string, IRegisteredSetting[]> = { general: [], '日志': [] };
        for (const item of settings) {
            const groupId = item.group || 'general';
            if (!groups[groupId]) groups[groupId] = [];
            groups[groupId].push(item);
        }
        // 排序
        Object.values(groups).forEach(items =>
            items.sort((a, b) => (a.order || 100) - (b.order || 100))
        );
        return groups;
    }, [settings]);
    const handleChange = (id: string, value: any) => {
        setValues(prev => ({ ...prev, [id]: value }));
        // 完全通过事件驱动，由 SettingsPlugin 负责分包与持久化
        kernel.emit(CoreEvents.SETTING_CHANGED, { id, value });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-[4px] flex items-center justify-center z-50">
            <div className="bg-background/95 backdrop-blur-2xl border border-border/80 rounded-xl shadow-2xl shadow-primary/20 w-[650px] max-h-[85vh] flex flex-col overflow-hidden text-foreground ring-1 ring-border/30">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                    <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4 text-primary" />
                        <h2 className="text-sm font-medium">设置</h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-muted rounded">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-40 border-r border-border/30 py-2">
                        {Object.keys(groupedSettings).map(groupId => (
                            <button
                                key={groupId}
                                onClick={() => setActiveGroup(groupId)}
                                className={cn(
                                    "w-full text-left px-4 py-3 text-sm transition-all border-l-[3px]",
                                    activeGroup === groupId
                                        ? "bg-primary/20 text-primary font-bold border-primary shadow-inner"
                                        : "text-muted-foreground/80 hover:bg-muted/40 border-transparent"
                                )}
                            >
                                {groupId === 'general' ? '常规' : groupId === '日志' ? '日志' : groupId}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {/* 日志特殊处理 */}
                        {activeGroup === '日志' ? (
                            <LogPanel />
                        ) : (
                            <>
                                {groupedSettings[activeGroup]?.map(item => (
                                    <div key={item.id} className="mb-4">
                                        <label className="block text-sm font-medium mb-1">
                                            {item.label}
                                        </label>
                                        {item.description && (
                                            <p className="text-xs text-muted-foreground mb-2">
                                                {item.description}
                                            </p>
                                        )}
                                        {renderControl(item, values[item.id], (v) => handleChange(item.id, v))}
                                    </div>
                                ))}
                                {(!groupedSettings[activeGroup] || groupedSettings[activeGroup].length === 0) && (
                                    <p className="text-sm text-muted-foreground">暂无配置项</p>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * 根据配置类型渲染对应控件
 */
function renderControl(
    item: IRegisteredSetting,
    value: any,
    onChange: (value: any) => void
) {
    switch (item.type) {
        case 'boolean':
            return (
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={!!value}
                        onChange={(e) => onChange(e.target.checked)}
                        className="w-4 h-4 rounded border-border"
                    />
                    <span className="text-sm">{value ? '已启用' : '已禁用'}</span>
                </label>
            );

        case 'number':
            return (
                <input
                    type="number"
                    value={value ?? item.defaultValue}
                    onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                    min={item.min}
                    max={item.max}
                    step={item.step || 1}
                    className="w-24 px-2 py-1 text-sm border border-border/50 rounded bg-background"
                />
            );

        case 'select':
            return (
                <select
                    value={value ?? item.defaultValue}
                    onChange={(e) => onChange(e.target.value)}
                    className="px-2 py-1 text-sm border border-border/50 rounded bg-background"
                >
                    {item.options?.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            );

        default:
            return (
                <input
                    type="text"
                    value={value ?? item.defaultValue ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-border/50 rounded bg-background"
                />
            );
    }
}
