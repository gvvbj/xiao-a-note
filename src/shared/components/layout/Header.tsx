import React from 'react';
import { useTheme } from '@/kernel/hooks/useTheme';
import { useLayout } from '@/kernel/hooks/useLayout';
import { PanelLeftOpen, Moon, Sun, Save, Minus, Square, X } from 'lucide-react';
import { useKernel, useService } from '@/kernel/core/KernelContext';
import { IWindowService } from '@/kernel/interfaces/IWindowService';
import { SettingsService } from '@/kernel/services/SettingsService';
import { InputDialog } from '@/shared/components/ui/InputDialog';
import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';

export function Header() {
  const kernel = useKernel();
  const { themeId, themes, setCurrentTheme } = useTheme();
  const { sidebarVisible, toggleSidebar } = useLayout();
  const settingsService = useService<SettingsService>(ServiceId.SETTINGS, false);

  // 获取自动保存设置
  const [autoSaveIntervalMinutes, setAutoSaveIntervalMinutes] = React.useState(() =>
    settingsService?.getSetting<number>('app.autoSaveIntervalMinutes', 1) || 1
  );

  const windowControl = useService<IWindowService>(ServiceId.WINDOW, false);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

  const handleSaveClick = (e: React.MouseEvent) => {
    // 【核心】按住 Ctrl/Cmd 点击弹出设置
    if (e.ctrlKey || e.metaKey) {
      setIsSettingsOpen(true);
    } else {
      kernel.emit(CoreEvents.APP_CMD_SAVE);
    }
  };

  const handleSaveSettings = (val: string) => {
    let minutes = parseFloat(val);
    if (isNaN(minutes) || minutes < 0) minutes = 0;
    // 持久化到 SettingsService
    settingsService?.updateSettings('app', { autoSaveIntervalMinutes: minutes });
    setAutoSaveIntervalMinutes(minutes);
    setIsSettingsOpen(false);
  };

  const handleToggleTheme = () => {
    kernel.emit(CoreEvents.APP_CMD_TOGGLE_THEME);
  };

  // 当前分钟数
  const currentMinutes = autoSaveIntervalMinutes;

  return (
    <>
      <header className="h-10 border-b border-border flex items-center bg-background/95 backdrop-blur z-50 transition-colors duration-300 select-none">

        <div className="flex items-center gap-2 px-4 h-full shrink-0">
          {!sidebarVisible && (
            <button onClick={toggleSidebar} className="p-1.5 hover:bg-accent rounded-md transition-colors text-muted-foreground hover:text-foreground">
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          )}
          <span className="font-semibold text-sm text-foreground tracking-tight ml-1">小A笔记</span>
        </div>

        <div className="flex-1 h-full draggable-region" />

        <div className="flex items-center gap-1 px-4 h-full shrink-0">
          <button
            onClick={handleSaveClick}
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-primary transition-colors relative group"
            title={autoSaveIntervalMinutes > 0 ? `自动保存: ${currentMinutes}分钟 (Ctrl+点击设置)` : "自动保存已关闭 (Ctrl+点击设置)"}
          >
            <Save className="w-4 h-4" />
            {/* 可选：显示一个小圆点提示开启状态 */}
            {autoSaveIntervalMinutes > 0 && <span className="absolute bottom-1 right-1 w-1 h-1 bg-green-500 rounded-full" />}
          </button>

          <button onClick={handleToggleTheme} className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground">
            {themes.find(t => t.id === themeId)?.type === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          <div className="w-[1px] h-3 bg-border/50 mx-2" />

          <div className="flex items-center gap-1">
            <button onClick={() => windowControl?.minimize()} className="p-1.5 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground" title="最小化">
              <Minus className="w-4 h-4" />
            </button>
            <button onClick={() => windowControl?.maximize()} className="p-1.5 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground" title="最大化">
              <Square className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => windowControl?.close()} className="p-1.5 hover:bg-red-500 hover:text-white rounded-md text-muted-foreground transition-colors" title="关闭">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <InputDialog
        isOpen={isSettingsOpen}
        title="设置自动保存间隔 (分钟)"
        placeholder="输入分钟数，0 为关闭"
        defaultValue={currentMinutes.toString()}
        onConfirm={handleSaveSettings}
        onCancel={() => setIsSettingsOpen(false)}
        confirmText="保存设置"
      />
    </>
  );
}
