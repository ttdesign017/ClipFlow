import { ClipboardItem } from '../types';
import { formatTime } from '../utils/formatTime';
import { convertFileSrc } from '@tauri-apps/api/core';
import { useDraggable } from '@dnd-kit/core';

interface ImageGridProps {
  items: ClipboardItem[];
}

function ImageCard({ item }: { item: ClipboardItem }) {
  if (!('Image' in item.kind)) return null;

  const { path, width, height } = item.kind.Image;

  const imageUrl = path ? convertFileSrc(path) : null;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `image-${item.id}`,
    data: {
      type: 'image',
      filePath: path || '',
    },
  });

  const style = {
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-2 bg-gray-100/60 hover:bg-gray-200/80 rounded-lg border border-gray-200/60 hover:border-gray-300 transition-all cursor-grab active:cursor-grabbing group relative"
    >
      {/* 缩略图 */}
      <div className="w-full aspect-square bg-gray-50 rounded-lg overflow-hidden mb-2">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="剪贴板图片"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl">🖼️</span>
          </div>
        )}
      </div>

      {/* 图片信息 */}
      <div className="text-xs text-gray-500 mb-1">
        {width}x{height}
      </div>
      <div className="text-xs text-gray-400">
        {formatTime(item.timestamp)}
      </div>

      {/* Hover 预览 */}
      <div className="absolute inset-0 bg-black/60 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
        <div className="text-center">
          {imageUrl && (
            <img
              src={imageUrl}
              alt="预览"
              className="w-32 h-32 object-cover rounded mb-2 mx-auto"
            />
          )}
          <div className="text-xs text-white">{width}x{height}</div>
        </div>
      </div>
    </div>
  );
}

export default function ImageGrid({ items }: ImageGridProps) {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        暂无图片历史
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <ImageCard key={item.id} item={item} />
      ))}
    </div>
  );
}
