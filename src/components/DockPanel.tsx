import TextList from './TextList';
import ImageGrid from './ImageGrid';
import { ClipboardItem } from '../types';

interface DockPanelProps {
  textItems: ClipboardItem[];
  imageItems: ClipboardItem[];
  onCopy: (content: string) => void;
}

export default function DockPanel({ textItems, imageItems, onCopy }: DockPanelProps) {
  return (
    <div className="flex h-[calc(100vh-60px)]">
      {/* 左侧文字面板 */}
      <div className="w-1/2 border-r border-gray-200/60 p-3 overflow-y-auto">
        <h2 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
          <span>📝</span>
          文字历史 ({textItems.length})
        </h2>
        <TextList items={textItems} onCopy={onCopy} />
      </div>

      {/* 右侧图片面板 */}
      <div className="w-1/2 p-3 overflow-y-auto">
        <h2 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
          <span>🖼️</span>
          图片历史 ({imageItems.length})
        </h2>
        <ImageGrid items={imageItems} />
      </div>
    </div>
  );
}
