import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { SettingsIcon } from './Icons';

interface SettingsDropdownProps {
  onClose: () => void;
}

export default function SettingsDropdown({ onClose }: SettingsDropdownProps) {
  const [maxItems, setMaxItems] = useState(50);
  const [autoStart, setAutoStart] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

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
    <div
      ref={dropdownRef}
      className="absolute top-full right-0 mt-1 w-56 bg-white/95 backdrop-blur-md rounded-lg shadow-lg border border-gray-200/60 py-1.5 z-50"
    >
      {/* 开机自启 */}
      <div className="flex items-center justify-between px-3 py-1.5 hover:bg-gray-100/50 transition-colors">
        <span className="text-sm text-gray-700">开机自启</span>
        <button
          onClick={() => handleAutoStartToggle(!autoStart)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            autoStart ? 'bg-blue-500' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
              autoStart ? 'translate-x-5' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* 最大保留条数 */}
      <div className="px-3 py-1.5 hover:bg-gray-100/50 transition-colors">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-700">最大保留</span>
          <span className="text-xs text-gray-400">{maxItems} 条</span>
        </div>
        <input
          type="range"
          min="10"
          max="200"
          value={maxItems}
          onChange={(e) => setMaxItems(Number(e.target.value))}
          className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>
    </div>
  );
}
