import { useState, useEffect, useRef, useCallback } from 'react';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import DockPanel from './components/DockPanel';
import SearchBar from './components/SearchBar';
import Settings from './components/Settings';
import { ClipboardItem } from './types';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

const HIDE_DELAY = 150; // 鼠标离开窗口后延迟隐藏（毫秒）

function App() {
  const [textItems, setTextItems] = useState<ClipboardItem[]>([]);
  const [imageItems, setImageItems] = useState<ClipboardItem[]>([]);
  const [filteredTextItems, setFilteredTextItems] = useState<ClipboardItem[]>([]);
  const [filteredImageItems, setFilteredImageItems] = useState<ClipboardItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadHistory = async () => {
    try {
      const [texts, images] = await Promise.all([
        invoke<ClipboardItem[]>('get_text_history'),
        invoke<ClipboardItem[]>('get_image_history'),
      ]);
      setTextItems(texts);
      setImageItems(images);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  useEffect(() => {
    loadHistory();
    const unlisten = listen('clipboard-updated', () => loadHistory());
    return () => { unlisten.then(fn => fn()); };
  }, []);

  // 鼠标进入窗口 → 显示面板
  const handleMouseEnter = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setPanelOpen(true);
  }, []);

  // 鼠标离开窗口 → 延迟隐藏面板
  const handleMouseLeave = useCallback(() => {
    hideTimerRef.current = setTimeout(() => {
      setPanelOpen(false);
      hideTimerRef.current = null;
    }, HIDE_DELAY);
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredTextItems(textItems);
      setFilteredImageItems(imageItems);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredTextItems(textItems.filter(item => item.preview.toLowerCase().includes(query)));
      setFilteredImageItems(imageItems.filter(item => item.preview.toLowerCase().includes(query)));
    }
  }, [searchQuery, textItems, imageItems]);

  const handleCopyToClipboard = async (content: string) => {
    try { await invoke('copy_to_clipboard', { content }); }
    catch (error) { console.error('Failed to copy:', error); }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active } = event;
    const data = active.data.current;
    if (!data) return;
    if (data.type === 'text' && data.content) {
      invoke('on_drag_end_text', { content: data.content }).catch(console.error);
    } else if (data.type === 'image' && data.filePath) {
      invoke('on_drag_end_image', { filePath: data.filePath }).catch(console.error);
    }
  };

  const handleClearHistory = async () => {
    try {
      await invoke('clear_clipboard_history');
      setTextItems([]);
      setImageItems([]);
      setFilteredTextItems([]);
      setFilteredImageItems([]);
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      {/* 整个窗口容器：始终存在，mouseenter/mouseleave 控制显示 */}
      <div
        className="w-full h-full"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* 面板内容：translateY 控制滑入/滑出 */}
        <div
          className="w-full h-full bg-white/90 backdrop-blur-md rounded-b-lg border border-gray-200/60 flex flex-col"
          style={{
            transform: panelOpen ? 'translateY(0)' : 'translateY(-100%)',
            transition: 'transform 0.25s cubic-bezier(0.4, 0.0, 0.2, 1)',
          }}
        >
          {/* 顶部操作栏 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/60 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xl">📋</span>
              <h1 className="text-lg font-semibold text-gray-800">ClipFlow</h1>
            </div>

            <SearchBar value={searchQuery} onChange={setSearchQuery} />

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 hover:bg-gray-200/50 rounded-lg transition-colors"
                title="设置"
              >
                ⚙️
              </button>
              <button
                onClick={handleClearHistory}
                className="p-2 hover:bg-gray-200/50 rounded-lg transition-colors"
                title="清空历史"
              >
                🗑️
              </button>
            </div>
          </div>

          {/* 设置面板 */}
          {showSettings && <Settings onClose={() => setShowSettings(false)} />}

          {/* 主内容区域 */}
          <div className="flex-1 overflow-hidden">
            <DockPanel
              textItems={filteredTextItems}
              imageItems={filteredImageItems}
              onCopy={handleCopyToClipboard}
            />
          </div>
        </div>
      </div>
    </DndContext>
  );
}

export default App;
