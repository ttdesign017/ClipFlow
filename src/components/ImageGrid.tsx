import { ClipboardItem } from '../types';
import { formatTime } from '../utils/formatTime';
import { convertFileSrc } from '@tauri-apps/api/core';
import { useDraggable } from '@dnd-kit/core';
import { CopyIcon, DeleteIcon, PinIcon, GripIcon } from './Icons';

interface ImageGridProps {
  items: ClipboardItem[];
  onDelete?: (id: string) => void;
  onPin?: (id: string) => void;
  onCopyImage?: (path: string) => void;
}

function ImageCard({ item, onDelete, onPin, onCopyImage }: { item: ClipboardItem; onDelete?: (id: string) => void; onPin?: (id: string) => void; onCopyImage?: (path: string) => void }) {
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

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(item.id);
  };

  const handlePinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPin?.(item.id);
  };

  const handleCopyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (path) {
      onCopyImage?.(path);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="px-2 py-1.5 bg-gray-50/90 hover:bg-white rounded-lg border border-gray-200/50 hover:border-gray-300/60 transition-all cursor-grab active:cursor-grabbing group relative shadow-sm hover:shadow"
    >
      {/* 左侧拖拽手柄 */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-0 bottom-0 w-4 cursor-grab active:cursor-grabbing hover:bg-gray-300/30 rounded-l-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-30"
      >
        <GripIcon className="w-3 h-3 text-gray-400" />
      </div>

      {/* 右上角操作按钮 */}
      <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-30">
        <button
          onClick={handlePinClick}
          className="p-1 bg-white hover:bg-gray-50 rounded transition-colors shadow-md"
          title="置顶"
        >
          <PinIcon className="w-3.5 h-3.5 text-gray-600" />
        </button>
        <button
          onClick={handleDeleteClick}
          className="p-1 bg-white hover:bg-red-50 rounded transition-colors shadow-md"
          title="删除"
        >
          <DeleteIcon className="w-3.5 h-3.5 text-gray-600 hover:text-red-600" />
        </button>
        <button
          onClick={handleCopyClick}
          className="p-1 bg-white hover:bg-gray-50 rounded transition-colors shadow-md"
          title="复制图片"
        >
          <CopyIcon className="w-3.5 h-3.5 text-gray-600" />
        </button>
      </div>

      {/* 缩略图 */}
      <div className="w-full aspect-[4/3] bg-gray-50 rounded-lg overflow-hidden mb-1">
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

      {/* 底部信息：分辨率 + 时间 */}
      <div className="flex items-center justify-between text-xs px-1">
        <span className="text-gray-500">{width}x{height}</span>
        <span className="text-gray-400">{formatTime(item.timestamp)}</span>
      </div>
    </div>
  );
}

export default function ImageGrid({ items, onDelete, onPin, onCopyImage }: ImageGridProps) {
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
        <ImageCard key={item.id} item={item} onDelete={onDelete} onPin={onPin} onCopyImage={onCopyImage} />
      ))}
    </div>
  );
}
