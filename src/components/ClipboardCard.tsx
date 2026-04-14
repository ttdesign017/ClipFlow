import { useDraggable } from '@dnd-kit/core';
import { ClipboardItem } from '../types';
import { formatTime } from '../utils/formatTime';
import { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { CopyIcon, DeleteIcon, PinIcon, GripIcon } from './Icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ClipboardCardProps {
  item: ClipboardItem;
  onCopy: (content: string) => void;
  onDelete?: (id: string) => void;
  onPin?: (id: string) => void;
}

// 简单的 markdown 样式配置
const markdownComponents = {
  h1: ({ children, ...props }: any) => <h1 className="text-base font-bold mb-1 text-gray-800" {...props}>{children}</h1>,
  h2: ({ children, ...props }: any) => <h2 className="text-sm font-bold mb-1 text-gray-800" {...props}>{children}</h2>,
  h3: ({ children, ...props }: any) => <h3 className="text-xs font-bold mb-0.5 text-gray-800" {...props}>{children}</h3>,
  p: ({ children, ...props }: any) => <p className="text-sm text-gray-700 mb-1" {...props}>{children}</p>,
  ul: ({ children, ...props }: any) => <ul className="list-disc pl-4 mb-1 text-sm text-gray-700" {...props}>{children}</ul>,
  ol: ({ children, ...props }: any) => <ol className="list-decimal pl-4 mb-1 text-sm text-gray-700" {...props}>{children}</ol>,
  li: ({ children, ...props }: any) => <li className="mb-0.5" {...props}>{children}</li>,
  blockquote: ({ children, ...props }: any) => <blockquote className="border-l-2 border-blue-400 pl-3 italic text-gray-600 mb-1" {...props}>{children}</blockquote>,
  code: ({ children, ...props }: any) => <code className="bg-gray-100 text-pink-600 px-1 py-0.5 rounded text-xs font-mono" {...props}>{children}</code>,
  pre: ({ children, ...props }: any) => <pre className="bg-gray-100 p-2 rounded text-xs font-mono overflow-x-auto mb-1" {...props}>{children}</pre>,
  a: ({ children, ...props }: any) => <a className="text-blue-600 hover:text-blue-700 underline" {...props}>{children}</a>,
  table: ({ children, ...props }: any) => <table className="border-collapse border border-gray-300 text-xs mb-1" {...props}>{children}</table>,
  th: ({ children, ...props }: any) => <th className="border border-gray-300 px-2 py-1 bg-gray-100 font-semibold" {...props}>{children}</th>,
  td: ({ children, ...props }: any) => <td className="border border-gray-300 px-2 py-1" {...props}>{children}</td>,
  hr: ({ children, ...props }: any) => <hr className="border-gray-300 my-1" {...props}>{children}</hr>,
  img: ({ children, ...props }: any) => <img className="max-w-full h-auto rounded" {...props}>{children}</img>,
};

export default function ClipboardCard({ item, onCopy, onDelete, onPin }: ClipboardCardProps) {
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
    onCopy(content);
  }, [content, onCopy]);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(item.id);
  }, [item.id, onDelete]);

  const handlePinClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onPin?.(item.id);
  }, [item.id, onPin]);

  // 检测是否是 markdown 格式（包含 # 或 * 或 ``` 等标记）
  const isMarkdown = useMemo(() => {
    return /^(#{1,6} )|(\*\*.*\*\*)|(```)|(\* )|(- )|(\[.*\]\(.*\))|(> )/.test(content);
  }, [content]);

  // 计算是否需要展开（纯文本超过 3 行）
  const [isExpanded, setIsExpanded] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const [needsExpand, setNeedsExpand] = useState(false);

  useEffect(() => {
    if (textRef.current && !isMarkdown) {
      setNeedsExpand(textRef.current.scrollHeight > textRef.current.clientHeight);
    }
  }, [content, isMarkdown]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="px-2.5 py-1.5 bg-gray-50/90 hover:bg-white rounded-lg border border-gray-200/50 hover:border-gray-300/60 transition-all cursor-grab active:cursor-grabbing group relative shadow-sm hover:shadow"
    >
      {/* 左侧拖拽手柄 */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-0 bottom-0 w-4 cursor-grab active:cursor-grabbing hover:bg-gray-300/30 rounded-l-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-30"
      >
        <GripIcon className="w-3 h-3 text-gray-400" />
      </div>

      {/* 内容区域 */}
      <div className="pr-2">
        {/* Markdown 渲染 */}
        {isMarkdown ? (
          <div className="prose prose-sm max-w-none overflow-hidden" ref={textRef}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {content}
            </ReactMarkdown>
          </div>
        ) : (
          /* 纯文本 */
          <div 
            className={`text-sm text-gray-700 whitespace-pre-wrap break-words ${!isExpanded ? 'line-clamp-3' : ''}`}
            ref={textRef}
          >
            {content}
          </div>
        )}
        
        {/* 展开/收起按钮 */}
        {needsExpand && !isMarkdown && (
          <button 
            className="text-xs text-blue-500 hover:text-blue-600 mt-1"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? '收起' : '展开'}
          </button>
        )}

        {/* 底部时间 */}
        <div className="flex items-center justify-end mt-1">
          <span className="text-xs text-gray-400">{formatTime(item.timestamp)}</span>
        </div>
      </div>

      {/* 右上角操作按钮 - 浮在内容上方 */}
      <div className="absolute top-1 right-1.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-30">
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
          title="复制"
        >
          <CopyIcon className="w-3.5 h-3.5 text-gray-600" />
        </button>
      </div>
    </div>
  );
}
