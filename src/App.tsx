import { useState, useEffect, useRef, useCallback } from 'react';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import DockPanel from './components/DockPanel';
import SearchBar from './components/SearchBar';
import Settings from './components/Settings';
import { ClipboardItem } from './types';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { ClipboardIcon as _ClipboardIcon, SettingsIcon, TrashIcon } from './components/Icons';

function App() {
  const [textItems, setTextItems] = useState<ClipboardItem[]>([]);
  const [imageItems, setImageItems] = useState<ClipboardItem[]>([]);
  const [filteredTextItems, setFilteredTextItems] = useState<ClipboardItem[]>([]);
  const [filteredImageItems, setFilteredImageItems] = useState<ClipboardItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const isMouseInPanelRef = useRef(false);
  const panelOpenRef = useRef(false);

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

  // 监听全局鼠标位置事件（由 Rust 端的全局鼠标监控发出）
  useEffect(() => {
    const unlistenMouseAtTop = listen('mouse-at-top', () => {
      if (!panelOpenRef.current) {
        setPanelOpen(true);
        panelOpenRef.current = true;
      }
    });

    const unlistenMouseLeftWindow = listen('mouse-left-window', () => {
      if (panelOpenRef.current) {
        setPanelOpen(false);
        panelOpenRef.current = false;
      }
    });

    return () => {
      unlistenMouseAtTop.then(fn => fn());
      unlistenMouseLeftWindow.then(fn => fn());
    };
  }, []);

  // 面板状态变化时，调用 Tauri API 设置窗口是否阻挡鼠标
  useEffect(() => {
    const setIgnoreCursorEvents = async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('set_ignore_cursor_events', { ignore: !panelOpen });
      } catch (e) {
        console.log('set_ignore_cursor_events not available:', e);
      }
    };
    setIgnoreCursorEvents();
  }, [panelOpen]);

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

  const handleCopyImageToClipboard = async (path: string) => {
    try { await invoke('copy_image_to_clipboard', { filePath: path }); }
    catch (error) { console.error('Failed to copy image:', error); }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await invoke('delete_clipboard_item', { id });
      // 直接从 state 中移除，实现即时更新
      setTextItems(prev => prev.filter(item => item.id !== id));
      setFilteredTextItems(prev => prev.filter(item => item.id !== id));
      setImageItems(prev => prev.filter(item => item.id !== id));
      setFilteredImageItems(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const handlePinItem = async (id: string) => {
    try {
      await invoke('pin_clipboard_item', { id });
      // 重新加载历史以获取排序后的结果
      loadHistory();
    } catch (error) {
      console.error('Failed to pin item:', error);
    }
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
      {/* 整个窗口容器 */}
      <div className="w-full h-full window-container">
        {/* 面板内容：translateY 控制滑入/滑出 */}
        <div
          ref={panelRef}
          className="w-full h-full bg-white/90 backdrop-blur-md rounded-b-lg border border-gray-200/60 flex flex-col"
          style={{
            transform: panelOpen ? 'translateY(0)' : 'translateY(-100%)',
            transition: 'transform 0.25s cubic-bezier(0.4, 0.0, 0.2, 1)',
            pointerEvents: panelOpen ? 'auto' : 'none',
          }}
        >
          {/* 顶部操作栏 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/60 flex-shrink-0">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 hover:bg-gray-200/50 rounded-lg transition-colors"
                title="设置"
              >
                <SettingsIcon className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={handleClearHistory}
                className="p-2 hover:bg-gray-200/50 rounded-lg transition-colors"
                title="清空历史"
              >
                <TrashIcon className="w-5 h-5 text-gray-600" />
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
              onCopyImage={handleCopyImageToClipboard}
              onDelete={handleDeleteItem}
              onPin={handlePinItem}
            />
          </div>
        </div>
      </div>
    </DndContext>
  );
}

export default App;
