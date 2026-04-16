import React, { useMemo, useState } from 'react';
import { IEditorRef } from '../framework/types';
import { UISlot } from '@/shared/components/ui/UISlot';
import { UISlotId } from '@/kernel/core/Constants';
import { useKernelEvent } from '@/kernel/hooks/useKernelEvent';
import { CoreEvents } from '@/kernel/core/Events';
import { useKernel, useService } from '@/kernel/core/KernelContext';
import type { IUIComponent } from '@/kernel/core/Kernel';
import { ServiceId } from '@/kernel/core/ServiceId';
import type { ISettingsService } from '@/kernel/interfaces/ISettingsService';
import {
  collectUnsupportedToolbarItems,
  ICapabilityAwareEditorEngine,
  isToolbarItemSupported,
  resolveEngineCapabilitySchema,
} from '../engines/core/EngineToolbarCapabilityGate';

const ENGINE_SETTING_KEY = 'editor.engine';
const DEFAULT_ENGINE_ID = 'codemirror';

type ToolbarGroup = 'basic' | 'insert' | 'history' | 'other';

interface EditorToolbarProps {
  editorRef: React.MutableRefObject<IEditorRef | null>;
}

interface DisabledToolbarItemProps {
  item: IUIComponent;
  reason: string;
}

function resolveToolbarGroup(item: IUIComponent): ToolbarGroup {
  const group = item.meta?.group;
  if (group === 'basic' || group === 'insert' || group === 'history') {
    return group;
  }
  return 'other';
}

function DisabledToolbarItem({ item, reason }: DisabledToolbarItemProps) {
  const icon = item.props?.icon || item.icon;
  const label: string = item.props?.label || item.label || item.id;
  const Icon = icon as React.ElementType | undefined;

  return (
    <button
      disabled
      className="p-1.5 rounded text-muted-foreground/45 cursor-not-allowed border border-transparent"
      title={reason}
      aria-label={`${label}（不可用）`}
    >
      {Icon ? <Icon className="w-4 h-4" /> : <span className="text-[11px] leading-none">x</span>}
    </button>
  );
}

/**
 * EditorToolbar - 编辑器工具栏
 *
 * 通过能力模型驱动工具栏项显示：
 * - 支持项：正常渲染
 * - 不支持项：渲染禁用占位并给出提示
 */
export function EditorToolbar({ editorRef }: EditorToolbarProps) {
  const kernel = useKernel();
  const settingsService = useService<ISettingsService>(ServiceId.SETTINGS, false);
  const editorEngine = useService<ICapabilityAwareEditorEngine>(ServiceId.EDITOR_ENGINE, false);

  const [activeStates, setActiveStates] = useState<Record<string, boolean>>({});
  const [toolbarItems, setToolbarItems] = useState<IUIComponent[]>(
    () => kernel.getUI(UISlotId.EDITOR_TOOLBAR_ITEMS)
  );
  const [currentEngineId, setCurrentEngineId] = useState<string>(
    () => settingsService?.getSetting<string>(ENGINE_SETTING_KEY, DEFAULT_ENGINE_ID) ?? DEFAULT_ENGINE_ID
  );

  const refreshToolbarItems = () => {
    setToolbarItems([...kernel.getUI(UISlotId.EDITOR_TOOLBAR_ITEMS)]);
  };

  const refreshCurrentEngineId = () => {
    const engineId = settingsService?.getSetting<string>(ENGINE_SETTING_KEY, DEFAULT_ENGINE_ID) ?? DEFAULT_ENGINE_ID;
    setCurrentEngineId(engineId);
  };

  useKernelEvent(CoreEvents.TOOLBAR_STATE_CHANGED, (states: Record<string, boolean>) => {
    setActiveStates(states);
  });

  useKernelEvent(CoreEvents.UI_UPDATED, (slotId: UISlotId) => {
    if (slotId === UISlotId.EDITOR_TOOLBAR_ITEMS) {
      refreshToolbarItems();
      refreshCurrentEngineId();
    }
  });

  useKernelEvent(CoreEvents.SETTING_CHANGED, () => {
    refreshCurrentEngineId();
  });

  const capabilitySchema = useMemo(() => {
    return resolveEngineCapabilitySchema(currentEngineId, editorEngine);
  }, [currentEngineId, editorEngine]);

  const unsupportedItems = useMemo(() => {
    return collectUnsupportedToolbarItems(toolbarItems, capabilitySchema);
  }, [toolbarItems, capabilitySchema]);

  const unsupportedByGroup = useMemo(() => {
    return {
      basic: unsupportedItems.filter(item => resolveToolbarGroup(item) === 'basic'),
      insert: unsupportedItems.filter(item => resolveToolbarGroup(item) === 'insert'),
      history: unsupportedItems.filter(item => resolveToolbarGroup(item) === 'history'),
      other: unsupportedItems.filter(item => resolveToolbarGroup(item) === 'other'),
    };
  }, [unsupportedItems]);

  const getUnsupportedReason = (item: IUIComponent): string => {
    const label = item.props?.label || item.label || item.id;
    return `当前引擎 (${currentEngineId}) 暂不支持：${label}`;
  };

  const isSupportedInGroup = (item: IUIComponent, group: ToolbarGroup): boolean => {
    return resolveToolbarGroup(item) === group && isToolbarItemSupported(item, capabilitySchema);
  };

  const slotProps = { editorRef, activeStates };

  return (
    <div className="flex flex-col border-b border-border/40 bg-editor-background sticky top-0 z-20">
      <div className="flex items-center gap-0.5 px-3 py-1.5 overflow-x-auto custom-scrollbar select-none">
        <UISlot
          id={UISlotId.EDITOR_TOOLBAR_ITEMS}
          className="flex items-center gap-0.5"
          filter={(item) => isSupportedInGroup(item, 'basic')}
          extraProps={slotProps}
        />
        {unsupportedByGroup.basic.map(item => (
          <DisabledToolbarItem key={`unsupported-${item.id}`} item={item} reason={getUnsupportedReason(item)} />
        ))}

        <div className="w-[1px] h-4 bg-border/50 mx-1" />

        <UISlot
          id={UISlotId.EDITOR_TOOLBAR_ITEMS}
          className="flex items-center gap-0.5"
          filter={(item) => isSupportedInGroup(item, 'insert')}
          extraProps={slotProps}
        />
        {unsupportedByGroup.insert.map(item => (
          <DisabledToolbarItem key={`unsupported-${item.id}`} item={item} reason={getUnsupportedReason(item)} />
        ))}

        <div className="w-[1px] h-4 bg-border/50 mx-1" />

        <UISlot
          id={UISlotId.EDITOR_TOOLBAR_ITEMS}
          className="flex items-center gap-0.5"
          filter={(item) => isSupportedInGroup(item, 'history')}
          extraProps={slotProps}
        />
        {unsupportedByGroup.history.map(item => (
          <DisabledToolbarItem key={`unsupported-${item.id}`} item={item} reason={getUnsupportedReason(item)} />
        ))}

        <div className="w-[1px] h-4 bg-border/50 mx-1" />

        <UISlot
          id={UISlotId.EDITOR_TOOLBAR_ITEMS}
          className="flex items-center gap-0.5"
          filter={(item) => isSupportedInGroup(item, 'other')}
          extraProps={slotProps}
        />
        {unsupportedByGroup.other.map(item => (
          <DisabledToolbarItem key={`unsupported-${item.id}`} item={item} reason={getUnsupportedReason(item)} />
        ))}
      </div>
    </div>
  );
}
