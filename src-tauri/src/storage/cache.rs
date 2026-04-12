use crate::clipboard::parser::{ClipboardItem, ItemType};
use std::collections::VecDeque;
use std::path::PathBuf;

/// 单一类型的缓存（文字或图片）
struct SingleTypeCache {
    items: VecDeque<ClipboardItem>,
    max_items: usize,
    temp_dir: PathBuf,
}

impl SingleTypeCache {
    fn new(max_items: usize) -> Self {
        let temp_dir = std::env::temp_dir().join("ClipFlow").join("images");
        let _ = std::fs::create_dir_all(&temp_dir);

        Self {
            items: VecDeque::with_capacity(max_items),
            max_items,
            temp_dir,
        }
    }

    fn add_item(&mut self, item: ClipboardItem) {
        if self.items.len() >= self.max_items {
            if let Some(oldest) = self.items.pop_front() {
                self.cleanup_item(&oldest);
            }
        }
        self.items.push_back(item);
    }

    fn get_items(&self) -> Vec<ClipboardItem> {
        self.items.iter().cloned().collect()
    }

    fn clear(&mut self) {
        let items: Vec<_> = self.items.drain(..).collect();
        for item in items {
            self.cleanup_item(&item);
        }
    }

    fn get_all_items(&self) -> Vec<ClipboardItem> {
        self.items.iter().cloned().collect()
    }

    fn cleanup_item(&self, item: &ClipboardItem) {
        if let ItemType::Image { path, .. } = &item.kind {
            let path_buf = PathBuf::from(path);
            if path_buf.starts_with(&self.temp_dir) {
                let _ = std::fs::remove_file(path_buf);
            }
        }
    }

    fn get_temp_dir(&self) -> &PathBuf {
        &self.temp_dir
    }
}

/// 剪贴板缓存：文字和图片各自独立
pub struct ClipboardCache {
    text_cache: SingleTypeCache,
    image_cache: SingleTypeCache,
}

impl ClipboardCache {
    pub fn new(max_items: usize) -> Self {
        Self {
            text_cache: SingleTypeCache::new(max_items),
            image_cache: SingleTypeCache::new(max_items),
        }
    }

    /// 添加条目到对应的缓存
    pub fn add_item(&mut self, item: ClipboardItem) {
        match &item.kind {
            ItemType::Text { .. } => self.text_cache.add_item(item),
            ItemType::Image { .. } => self.image_cache.add_item(item),
            ItemType::File { .. } => self.text_cache.add_item(item),
        }
    }

    /// 获取文字历史
    pub fn get_text_items(&self) -> Vec<ClipboardItem> {
        self.text_cache.get_items()
    }

    /// 获取图片历史
    pub fn get_image_items(&self) -> Vec<ClipboardItem> {
        self.image_cache.get_items()
    }

    /// 获取所有历史（合并，用于兼容旧接口）
    pub fn get_items(&self) -> Vec<ClipboardItem> {
        let mut all = self.text_cache.get_all_items();
        all.extend(self.image_cache.get_all_items());
        // 按时间戳排序，最新的在前
        all.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
        all
    }

    /// 清空所有缓存
    pub fn clear(&mut self) {
        self.text_cache.clear();
        self.image_cache.clear();
    }

    /// 清空文字缓存
    pub fn clear_text(&mut self) {
        self.text_cache.clear();
    }

    /// 清空图片缓存
    pub fn clear_images(&mut self) {
        self.image_cache.clear();
    }

    pub fn get_temp_dir(&self) -> &PathBuf {
        self.text_cache.get_temp_dir()
    }
}

impl Drop for ClipboardCache {
    fn drop(&mut self) {
        self.clear();
        let _ = std::fs::remove_dir_all(&self.text_cache.temp_dir);
    }
}
