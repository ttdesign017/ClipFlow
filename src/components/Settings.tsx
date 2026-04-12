import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface SettingsProps {
  onClose: () => void;
}

export default function Settings({ onClose }: SettingsProps) {
  const [maxItems, setMaxItems] = useState(50);
  const [autoStart, setAutoStart] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await invoke<any>('get_settings');
      setMaxItems(settings.max_items);
      setAutoStart(settings.auto_start);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleAutoStartToggle = async (enabled: boolean) => {
    try {
      await invoke('set_auto_start', { enable: enabled });
      setAutoStart(enabled);
    } catch (error) {
      console.error('Failed to update auto start:', error);
    }
  };

  return (
    <div className="p-4 bg-gray-100/90 border-b border-gray-200/60 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">设置</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-200/50 rounded transition-colors text-gray-600"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4">
        {/* 最大保留条数 */}
        <div>
          <label className="block text-sm text-gray-600 mb-2">
            最大保留条数
          </label>
          <input
            type="range"
            min="10"
            max="200"
            value={maxItems}
            onChange={(e) => setMaxItems(Number(e.target.value))}
            className="w-full"
          />
          <div className="text-xs text-gray-400 mt-1">{maxItems} 条</div>
        </div>

        {/* 开机自启 */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-600">开机自启</label>
          <button
            onClick={() => handleAutoStartToggle(!autoStart)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              autoStart ? 'bg-blue-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                autoStart ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
