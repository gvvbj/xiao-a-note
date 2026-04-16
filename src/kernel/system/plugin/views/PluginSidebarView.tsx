import React, { useCallback, useEffect, useState } from 'react';
import { useService } from '@/kernel/core/KernelContext';
import { ServiceId } from '@/kernel/core/ServiceId';
import type { ISettingsService } from '@/kernel/interfaces/ISettingsService';
import { PluginManager } from '../PluginManager';
import { IPlugin } from '../types';
import { Package, Search, User, Link as LinkIcon } from 'lucide-react';

export function PluginSidebarView() {
    const pluginManager = useService<PluginManager>(ServiceId.PLUGIN_MANAGER, false);
    const settingsService = useService<ISettingsService>(ServiceId.SETTINGS, false);
    const [plugins, setPlugins] = useState<IPlugin[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeStates, setActiveStates] = useState<Set<string>>(new Set());
    const [currentEngineId, setCurrentEngineId] = useState('codemirror');

    const resolveCurrentEngineId = useCallback(() => {
        return settingsService?.getSetting<string>('editor.engine', 'codemirror') ?? 'codemirror';
    }, [settingsService]);

    useEffect(() => {
        if (pluginManager) {
            const update = () => {
                setPlugins(pluginManager.getPlugins());
                const active = new Set(pluginManager.getPlugins().filter(p => pluginManager.isPluginActive(p.id)).map(p => p.id));
                setActiveStates(active);
                setCurrentEngineId(resolveCurrentEngineId());
            };

            update();
            const unsub = pluginManager.subscribe(update);
            return unsub;
        }
    }, [pluginManager, resolveCurrentEngineId]);

    useEffect(() => {
        setCurrentEngineId(resolveCurrentEngineId());
    }, [resolveCurrentEngineId]);

    const handleToggle = (id: string) => {
        pluginManager?.togglePlugin(id);
    };

    const filteredPlugins = plugins.filter(plugin => {
        // [OPTIMIZED] Use metadata-driven filtering
        // Also filter hidden plugins (e.g., common-utils)
        if (plugin.internal || plugin.hidden) return false;

        // [Defensive] Ensure name exists
        const name = plugin.name || '';
        const q = searchQuery.toLowerCase();
        return name.toLowerCase().includes(q) ||
            (plugin.description || '').toLowerCase().includes(q) ||
            plugin.id.toLowerCase().includes(q);
    });

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 px-3 pt-3 pb-2">
                <h3 className="text-sm font-semibold text-foreground">扩展中心</h3>
            </div>
            <div className="px-3 pb-2">
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="搜索插件..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 px-2 pb-2">
                <div className="rounded-lg bg-card/30 border border-border/50 overflow-hidden mb-1.5">
                    {filteredPlugins.length === 0 && (
                        <div className="p-4 text-center text-xs text-muted-foreground">
                            {searchQuery ? '未找到匹配的插件' : '暂无可用插件'}
                        </div>
                    )}
                    {filteredPlugins.map(plugin => {
                        const isEnabled = activeStates.has(plugin.id);
                        const isEssential = plugin.essential;
                        const missingDeps = pluginManager?.checkDependencies(plugin) || [];
                        const isCompatible = pluginManager?.isPluginCompatibleWithEngine(plugin, currentEngineId) ?? true;
                        const isToggleDisabled = isEssential || missingDeps.length > 0 || !isCompatible;
                        const toggleDisabledReason = isEssential
                            ? '核心插件无法禁用'
                            : missingDeps.length > 0
                                ? `缺少依赖: ${missingDeps.join(', ')}`
                                : !isCompatible
                                    ? `当前引擎(${currentEngineId})不兼容`
                                    : undefined;

                        return (
                            <div
                                key={plugin.id}
                                className="flex flex-col gap-1 px-2.5 py-2 border-b border-border/30 last:border-0"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Package size={14} className="text-primary shrink-0" />
                                        <span className="font-medium text-xs text-foreground truncate">{plugin.name}</span>
                                        <span className="text-[10px] text-muted-foreground shrink-0">v{plugin.version}</span>
                                    </div>
                                    <button
                                        onClick={() => handleToggle(plugin.id)}
                                        disabled={isToggleDisabled}
                                        title={toggleDisabledReason}
                                        className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border transition-all ${isEnabled
                                            ? 'bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20'
                                            : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                                            }`}
                                    >
                                        {isEnabled ? '已启用' : '已禁用'}
                                    </button>
                                </div>

                                {plugin.description && <div className="text-[11px] text-muted-foreground/90 leading-normal px-0.5">{plugin.description}</div>}

                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 px-0.5">
                                    <div className={`text-[10px] ${isCompatible ? 'text-green-600' : 'text-amber-600 font-medium'}`}>
                                        {isCompatible ? `兼容当前引擎 (${currentEngineId})` : `不兼容当前引擎 (${currentEngineId})`}
                                    </div>
                                    {plugin.author && (
                                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                            <User size={10} />
                                            {plugin.author}
                                        </div>
                                    )}
                                    {plugin.dependencies && plugin.dependencies.length > 0 && (
                                        <div className={`flex items-center gap-1 text-[10px] ${missingDeps.length > 0 ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
                                            <LinkIcon size={10} />
                                            依赖: {plugin.dependencies.join(', ')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
