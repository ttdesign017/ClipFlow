import { useDraggable } from '@dnd-kit/core';
import { ClipboardItem } from '../types';
import { formatTime } from '../utils/formatTime';
import { useRef, useCallback } from 'react';

interface ClipboardCardProps {
  item: ClipboardItem;
  onCopy: (content: string) => void;
}

export default function ClipboardCard({ item, onCopy }: ClipboardCardProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: {
      type: 'text',
      content: 'Text' in item.kind ? item.kind.Text.content : '',
    },
  });

  const style = {
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  // 只处理文字类型
  if (!('Text' in item.kind)) return null;

  const content = item.kind.Text.content;

  const handleCopyClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('[ClipboardCard] Copy button clicked for:', content.substring(0, 30));
    onCopy(content);
  }, [content, onCopy]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-3 bg-gray-100/60 hover:bg-gray-200/80 rounded-lg border border-gray-200/60 hover:border-gray-300 transition-all cursor-grab active:cursor-grabbing group relative"
    >
      <div className="text-sm text-gray-700 line-clamp-3 mb-2 pointer-events-none">
        {item.preview}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 pointer-events-none">{formatTime(item.timestamp)}</span>
        <button
          ref={buttonRef}
          onClick={handleCopyClick}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          className="px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-600 rounded text-xs transition-colors opacity-0 group-hover:opacity-100"
          style={{ pointerEvents: 'auto', touchAction: 'none' }}
          data-tauri-dnd-no-capture="true"
        >
          📋 复制
        </button>
      </div>
    </div>
  );
}
