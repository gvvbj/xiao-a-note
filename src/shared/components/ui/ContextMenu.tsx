import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/utils';

export interface MenuItem {
  label?: string;
  icon?: React.ElementType;
  onClick?: () => void;
  danger?: boolean;
  divider?: boolean;
  type?: 'separator' | 'normal'; // Added type property
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    // 监听滚轮事件也关闭菜单，防止菜单错位
    document.addEventListener('scroll', onClose, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', onClose, true);
    };
  }, [onClose]);

  // 边界检测：防止菜单超出屏幕下边缘
  const style: React.CSSProperties = {
    left: x,
  };

  // 假设菜单高度约 200px
  if (y > window.innerHeight - 200) {
    style.bottom = window.innerHeight - y;
  } else {
    style.top = y;
  }

  const content = (
    <div
      ref={menuRef}
      style={style}
      className="fixed z-[9999] w-52 bg-white dark:bg-zinc-800 border border-border/50 dark:border-white/10 rounded-lg shadow-xl animate-in fade-in zoom-in-95 duration-100 py-1 overflow-hidden ring-1 ring-black/5 dark:ring-white/10"
      onClick={(e) => e.stopPropagation()} // 防止点击菜单项时触发下层的点击事件
      onContextMenu={(e) => e.preventDefault()} // 菜单上禁用右键
    >
      {items.map((item, index) => {
        if (item.divider || item.type === 'separator') return <div key={index} className="h-[1px] bg-border/50 dark:bg-white/10 my-1 mx-2" />;

        return (
          <button
            key={index}
            onClick={() => { item.onClick?.(); onClose(); }}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-left transition-colors relative hover:bg-accent dark:hover:bg-white/5",
              item.danger ? "text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" : "text-foreground"
            )}
          >
            {item.icon && <item.icon className="w-4 h-4 opacity-70" />}
            <span className="flex-1">{item.label}</span>
          </button>
        );
      })}
    </div>
  );

  return createPortal(content, document.body);
}