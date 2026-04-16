import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { UISlotId } from '@/kernel/core/Constants';
import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import { LoggerService } from '@/kernel/services/LoggerService';
import { useKernel, useService } from '@/kernel/core/KernelContext';
import { PluginManager } from '@/kernel/system/plugin/PluginManager';
import { IPlugin, IPluginContext, PluginCategory } from '@/kernel/system/plugin/types';
import { Check, Cpu } from 'lucide-react';
import { EditorEngineSwitchService, EDITOR_ENGINE_SWITCH_SERVICE_ID } from '../../../services/EditorEngineSwitchService';
import { ENGINE_CONFLICT_GROUP, ENGINE_PLUGIN_ID_PREFIX } from '../../../engines/core/EnginePluginConstants';

interface IEngineOption {
    id: string;
    label: string;
}

function toEngineId(pluginId: string): string {
    if (!pluginId.startsWith(ENGINE_PLUGIN_ID_PREFIX)) {
        return pluginId;
    }
    return pluginId.slice(ENGINE_PLUGIN_ID_PREFIX.length);
}

export const EngineSwitcherControl: React.FC = () => {
    const kernel = useKernel();
    const pluginManager = useService<PluginManager>(ServiceId.PLUGIN_MANAGER, false);
    const switchService = useService<EditorEngineSwitchService>(EDITOR_ENGINE_SWITCH_SERVICE_ID, false);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const [options, setOptions] = useState<IEngineOption[]>([]);
    const [selectedEngine, setSelectedEngine] = useState<string>('codemirror');
    const [isSwitching, setIsSwitching] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const refreshOptions = useCallback(() => {
        if (!pluginManager) {
            setOptions([]);
            return;
        }

        const nextOptions = pluginManager
            .getPlugins()
            .filter(plugin => plugin.conflictGroup === ENGINE_CONFLICT_GROUP)
            .map(plugin => ({
                id: toEngineId(plugin.id),
                label: plugin.name || plugin.id,
            }))
            .sort((a, b) => a.label.localeCompare(b.label));

        setOptions(nextOptions);
    }, [pluginManager]);

    useEffect(() => {
        refreshOptions();
    }, [refreshOptions]);

    useEffect(() => {
        if (!pluginManager) {
            return;
        }
        return pluginManager.subscribe(() => {
            refreshOptions();
        });
    }, [pluginManager, refreshOptions]);

    useEffect(() => {
        if (!switchService) {
            return;
        }
        setSelectedEngine(switchService.getConfiguredEngineId());
    }, [switchService]);

    const optionLabelMap = useMemo(() => {
        const map: Record<string, string> = {};
        options.forEach(option => {
            map[option.id] = option.label;
        });
        return map;
    }, [options]);

    useEffect(() => {
        if (options.length === 0) {
            return;
        }
        const exists = options.some(option => option.id === selectedEngine);
        if (!exists) {
            setSelectedEngine(options[0].id);
        }
    }, [options, selectedEngine]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const handleOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (rootRef.current && !rootRef.current.contains(target)) {
                setIsOpen(false);
            }
        };

        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleOutside);
        document.addEventListener('keydown', handleEsc);

        return () => {
            document.removeEventListener('mousedown', handleOutside);
            document.removeEventListener('keydown', handleEsc);
        };
    }, [isOpen]);

    const showSwitchResult = useCallback((title: string, message: string, type: 'info' | 'error') => {
        kernel.emit(CoreEvents.APP_SHOW_MESSAGE_DIALOG, { title, message, type });
    }, [kernel]);

    const switchToEngine = useCallback(async (targetEngineId: string) => {
        if (!switchService || !targetEngineId || targetEngineId === selectedEngine || isSwitching) {
            return;
        }

        setIsSwitching(true);
        try {
            await switchService.switchEngine(targetEngineId);
            setSelectedEngine(targetEngineId);
            const targetLabel = optionLabelMap[targetEngineId] || targetEngineId;
            showSwitchResult('引擎切换成功', `已切换到 ${targetLabel}`, 'info');
            setIsOpen(false);
        } catch (error) {
            const restoredEngineId = switchService.getConfiguredEngineId();
            setSelectedEngine(restoredEngineId);
            const reason = error instanceof Error ? error.message : '未知错误';
            showSwitchResult('引擎切换失败', `切换到 ${targetEngineId} 失败：${reason}`, 'error');
            setIsOpen(false);
        } finally {
            setIsSwitching(false);
        }
    }, [isSwitching, optionLabelMap, selectedEngine, showSwitchResult, switchService]);

    const isDisabled = isSwitching || !switchService || options.length <= 1;
    const currentLabel = optionLabelMap[selectedEngine] || selectedEngine;

    return (
        <div ref={rootRef} className="relative flex items-center">
            <button
                type="button"
                aria-label="切换编辑器引擎"
                aria-haspopup="menu"
                aria-expanded={isOpen}
                disabled={isDisabled}
                onClick={() => setIsOpen(prev => !prev)}
                className="h-7 w-7 rounded border border-border bg-background text-foreground flex items-center justify-center hover:bg-accent/50 disabled:cursor-not-allowed disabled:opacity-50"
                title={isDisabled ? `当前引擎：${currentLabel}` : `当前引擎：${currentLabel}，点击切换`}
            >
                <Cpu className="h-3.5 w-3.5" />
            </button>

            {isOpen && !isDisabled && (
                <div
                    role="menu"
                    className="absolute right-0 top-9 z-50 min-w-44 rounded-md border border-border bg-popover p-1 shadow-lg"
                >
                    {options.map(option => (
                        <button
                            key={option.id}
                            type="button"
                            role="menuitem"
                            onClick={() => {
                                void switchToEngine(option.id);
                            }}
                            disabled={isSwitching}
                            className="w-full flex items-center justify-between rounded px-2 py-1.5 text-left text-xs hover:bg-accent/50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <span>{option.label}</span>
                            {option.id === selectedEngine && <Check className="h-3.5 w-3.5 text-primary" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default class EngineSwitcherUIPlugin implements IPlugin {
    id = 'engine-switcher-ui';
    name = 'Engine Switcher UI';
    version = '1.0.0';
    category = PluginCategory.UI;
    internal = true;
    hidden = true;
    order = 120;

    private _logger?: any;

    activate(context: IPluginContext): void {
        const loggerService = context.kernel.getService<LoggerService>(ServiceId.LOGGER, false);
        this._logger = loggerService?.createLogger('EngineSwitcherUIPlugin');
        this._logger?.info('Activating EngineSwitcherUIPlugin...');

        context.registerUI(UISlotId.EDITOR_HEADER_RIGHT, {
            id: 'engine-switcher',
            component: EngineSwitcherControl,
            order: 90,
        });

        this._logger?.info('EngineSwitcherUIPlugin activated.');
    }

    deactivate(): void {
        this._logger?.info('EngineSwitcherUIPlugin deactivated.');
    }
}

