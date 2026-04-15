import { ClipboardItem } from '../types';
import ClipboardCard from './ClipboardCard';

interface TextListProps {
  items: ClipboardItem[];
  onCopy: (content: string) => void;
  onDelete?: (id: string) => void;
  onTogglePin?: (id: string, pinned: boolean) => void;
}

export default function TextList({ items, onCopy, onDelete, onTogglePin }: TextListProps) {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        暂无文字历史
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <ClipboardCard key={item.id} item={item} onCopy={onCopy} onDelete={onDelete} onTogglePin={onTogglePin} />
      ))}
    </div>
  );
}
