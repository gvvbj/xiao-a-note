import React from 'react';
import { Outlet } from 'react-router-dom';
import { useLayout } from '@/kernel/hooks/useLayout';
import { SidebarContainer } from './SidebarContainer';
import { RightSidebarContainer } from './RightSidebarContainer';
import { SaveConfirmDialog } from '@/shared/components/ui/SaveConfirmDialog';
import { useBeforeUnload } from '@/shared/hooks/useBeforeUnload';
import { UISlotId } from '@/kernel/core/Constants';
import { UISlot } from '@/shared/components/ui/UISlot';

/**
 * AppLayout — 应用主布局容器
 *
 * 纯布局组件，不包含任何业务逻辑。
 * 所有生命周期逻辑已迁移至 AppLifecyclePlugin。
 */
export function AppLayout() {
  const { isZenMode } = useLayout();
  const { showConfirmDialog, handleSaveAll, handleConfirm, handleCancel } = useBeforeUnload();

  return (
    <div className="flex flex-col h-screen w-full bg-background text-foreground overflow-hidden">
      {/* 1. 自定义标题栏 (Top) - 全屏模式下隐藏 */}
      {!isZenMode && (
        <header className="relative z-50 shrink-0">
          <UISlot id={UISlotId.TITLE_BAR} />
        </header>
      )}

      {/* 2. 主体区域 */}
      <div className="flex flex-1 overflow-hidden relative z-0">
        <SidebarContainer />

        {/* 主内容区 (Editor) */}
        <main className="flex-1 overflow-hidden relative bg-background flex flex-col min-w-0 min-h-0">
          <Outlet />
        </main>

        <RightSidebarContainer />
      </div>

      {/* 3. 状态栏 - 可由插件扩展 */}
      {!isZenMode && (
        <footer className="h-6 bg-background/50 backdrop-blur-sm flex items-center justify-between px-3 text-[11px] select-none shrink-0 z-30">
          <UISlot id={UISlotId.STATUS_BAR_LEFT} className="flex items-center gap-4 text-muted-foreground/70" />
          <UISlot id={UISlotId.STATUS_BAR} className="flex-1 flex justify-center text-muted-foreground/70" />
          <UISlot id={UISlotId.STATUS_BAR_RIGHT} className="flex items-center gap-4 text-muted-foreground/70" />
        </footer>
      )}

      {/* 退出确认对话框 */}
      <SaveConfirmDialog
        isOpen={showConfirmDialog}
        title="确认退出"
        description="您有未保存的文件。"
        saveText="保存并退出"
        discardText="不保存退出"
        cancelText="取消"
        onSave={handleSaveAll}
        onDontSave={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
}
