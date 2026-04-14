import TextList from './TextList';
import ImageGrid from './ImageGrid';
import { ClipboardItem } from '../types';
import { TextIcon, ImageIcon } from './Icons';

interface DockPanelProps {
  textItems: ClipboardItem[];
  imageItems: ClipboardItem[];
  onCopy: (content: string) => void;
  onDelete?: (id: string) => void;
  onPin?: (id: string) => void;
  onCopyImage?: (path: string) => void;
}

export default function DockPanel({ textItems, imageItems, onCopy, onDelete, onPin, onCopyImage }: DockPanelProps) {
  return (
    <div className="flex h-[calc(100vh-60px)]">
      {/* 左侧文字面板 */}
      <div className="w-1/2 border-r border-gray-200/60 p-3 overflow-y-auto">
        <h2 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
          <TextIcon className="w-4 h-4" />
          文字历史 ({textItems.length})
        </h2>
        <TextList items={textItems} onCopy={onCopy} onDelete={onDelete} onPin={onPin} />
      </div>

      {/* 右侧图片面板 */}
      <div className="w-1/2 p-3 overflow-y-auto">
        <h2 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
          <ImageIcon className="w-4 h-4" />
          图片历史 ({imageItems.length})
        </h2>
        <ImageGrid items={imageItems} onDelete={onDelete} onPin={onPin} onCopyImage={onCopyImage} />
      </div>
    </div>
  );
}
