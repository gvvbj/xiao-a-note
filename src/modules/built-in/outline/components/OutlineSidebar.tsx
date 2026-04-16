import React, { useMemo } from 'react';
import { useOutline } from '@/kernel/hooks/useOutline';
import { useKernel } from '@/kernel/core/KernelContext';
import { List, ChevronRight, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/shared/utils';
import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import { useService } from '@/kernel/core/KernelContext';
import { LoggerService } from '@/kernel/services/LoggerService';

export function OutlineSidebar() {
  const { headers, collapsedIds, toggleCollapse, expandAll, collapseAll } = useOutline();
  const loggerService = useService<LoggerService>(ServiceId.LOGGER, false);
  const logger = React.useMemo(() => loggerService?.createLogger('OutlineSidebar'), [loggerService]);

  logger?.info(`Current headers in store: ${headers.length}`);
  const kernel = useKernel();

  const handleJump = (line: number) => {
    kernel.emit(CoreEvents.EDITOR_SCROLL_TO_LINE, line);
  };

  // 计算每个标题的可见性（基于父级是否折叠）
  const visibleHeaders = useMemo(() => {
    const result: Array<{ item: typeof headers[0]; hasChildren: boolean; isVisible: boolean }> = [];
    const parentStack: Array<{ id: string; level: number; collapsed: boolean }> = [];

    for (let i = 0; i < headers.length; i++) {
      const item = headers[i];

      // 清理父级栈：移除所有 level >= 当前 level 的
      while (parentStack.length > 0 && parentStack[parentStack.length - 1].level >= item.level) {
        parentStack.pop();
      }

      // 检查是否有子项（下一个 header 的 level > 当前 level）
      const hasChildren = i < headers.length - 1 && headers[i + 1].level > item.level;

      // 检查是否可见（所有父级都未折叠）
      const isVisible = parentStack.every(p => !p.collapsed);

      result.push({ item, hasChildren, isVisible });

      // 将当前项加入父级栈
      parentStack.push({ id: item.id, level: item.level, collapsed: collapsedIds.has(item.id) });
    }

    return result;
  }, [headers, collapsedIds]);

  const anyCollapsed = collapsedIds.size > 0;

  return (
    <div className="h-full flex flex-col select-none">
      <div className="h-10 px-4 flex items-center justify-between border-b border-gray-100 dark:border-zinc-800">
        <span className="text-xs font-bold text-gray-500 uppercase">OUTLINE</span>
        {headers.length > 0 && (
          <button
            onClick={anyCollapsed ? expandAll : collapseAll}
            className="p-1 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded transition-colors"
            title={anyCollapsed ? "全部展开" : "全部折叠"}
          >
            <ChevronsUpDown className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {headers.length === 0 ? (
          <div className="mt-10 text-center text-sm text-gray-400 flex flex-col items-center gap-2">
            <List className="w-8 h-8 opacity-20" />
            <p>暂无大纲</p>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {visibleHeaders.map(({ item, hasChildren, isVisible }) => {
              if (!isVisible) return null;

              const isCollapsed = collapsedIds.has(item.id);

              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center py-1 cursor-pointer text-sm rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-muted-foreground hover:text-foreground group",
                  )}
                  style={{
                    paddingLeft: `${(item.level - 1) * 16 + 4}px`,
                  }}
                >
                  {/* 折叠按钮 */}
                  {hasChildren ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleCollapse(item.id); }}
                      className="w-5 h-5 flex items-center justify-center shrink-0 text-gray-400 hover:text-foreground"
                    >
                      {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  ) : (
                    <div className="w-5 shrink-0" />
                  )}

                  {/* 标题文本 */}
                  <span
                    onClick={() => handleJump(item.line)}
                    className="truncate flex-1"
                    style={{
                      fontWeight: item.level === 1 ? '600' : 'normal',
                      fontSize: item.level === 1 ? '14px' : '13px'
                    }}
                  >
                    {item.text}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
