import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ImagePreviewProps {
  src: string | null;
  onClose: () => void;
}

export function ImagePreview({ src, onClose }: ImagePreviewProps) {
  const [scale, setScale] = useState(1);

  if (!src) return null;

  // 滚轮缩放处理
  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    // 向下滚(deltaY > 0) -> 缩小，向上滚 -> 放大
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(prev => Math.min(Math.max(0.1, prev + delta), 5)); // 限制范围 0.1 ~ 5
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-white/90 dark:bg-black/90 backdrop-blur-xl animate-in fade-in duration-200"
      onWheel={handleWheel} // 绑定滚轮
      onClick={onClose} // 点击背景关闭
    >

      {/* 顶部工具栏 */}
      <div className="absolute top-14 right-6 flex items-center gap-2 z-[110]" onClick={e => e.stopPropagation()}>
        <button
          onClick={() => setScale(1)}
          className="p-2 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 transition-colors"
          title="重置大小"
        >
          <RotateCcw className="w-5 h-5 text-foreground/70" />
        </button>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-black/10 dark:bg-white/10 hover:bg-red-500 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 缩放指示器 */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 text-white text-xs rounded-full backdrop-blur-md pointer-events-none select-none">
        {Math.round(scale * 100)}%
      </div>

      {/* 图片容器 */}
      <div
        className="relative transition-transform duration-75 ease-out"
        style={{ transform: `scale(${scale})` }}
        onClick={(e) => e.stopPropagation()} // 防止点击图片关闭
      >
        <img
          src={src}
          alt="Preview"
          className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
          draggable={false}
        />
      </div>
    </div>
  );
}
