use crate::clipboard::parser::{ClipboardItem, ItemType};
use std::collections::VecDeque;
use std::path::PathBuf;

/// 单一类型的缓存（文字或图片）
struct SingleTypeCache {
    items: VecDeque<ClipboardItem>,
    max_items: usize,
    temp_dir: PathBuf,
    sorted_cache: Option<Vec<ClipboardItem>>,
}

impl SingleTypeCache {
    fn new(max_items: usize) -> Self {
        let temp_dir = std::env::temp_dir().join("ClipFlow").join("images");
        let _ = std::fs::create_dir_all(&temp_dir);

        Self {
            items: VecDeque::with_capacity(max_items),
            max_items,
            temp_dir,
            sorted_cache: None,
        }
    }

    fn add_item(&mut self, item: ClipboardItem) {
        if self.items.len() >= self.max_items {
            if let Some(oldest) = self.items.pop_front() {
                self.cleanup_item(&oldest);
            }
        }
        self.items.push_back(item);
        self.sorted_cache = None; // invalidate cache
    }

    fn get_items(&self) -> Vec<ClipboardItem> {
        self.items.iter().cloned().collect()
    }

    fn clear(&mut self) {
        let items: Vec<_> = self.items.drain(..).collect();
        for item in items {
            self.cleanup_item(&item);
        }
        self.sorted_cache = None;
    }

    fn get_all_items(&self) -> Vec<ClipboardItem> {
        self.items.iter().cloned().collect()
    }

    /// 获取排序后的缓存条目（只排序一次，结果缓存）
    fn get_sorted_items(&mut self) -> Vec<ClipboardItem> {
        if let Some(ref cached) = self.sorted_cache {
            return cached.clone();
        }
        let items = self.items.iter().cloned().collect::<Vec<_>>();
        let mut pinned: Vec<_> = items.iter().filter(|i| i.pinned).cloned().collect();
        let mut unpinned: Vec<_> = items.into_iter().filter(|i| !i.pinned).collect();
        pinned.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
        unpinned.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
        let result: Vec<_> = pinned.into_iter().chain(unpinned).collect();
        self.sorted_cache = Some(result.clone());
        result
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

    /// 删除指定 ID 的条目
    fn delete_item(&mut self, id: &str) -> bool {
        if let Some(pos) = self.items.iter().position(|item| item.id == id) {
            if let Some(item) = self.items.remove(pos) {
                self.cleanup_item(&item);
                self.sorted_cache = None; // invalidate cache
                return true;
            }
        }
        false
    }

    /// 置顶指定 ID 的条目
    fn pin_item(&mut self, id: &str) -> bool {
        if let Some(item) = self.items.iter_mut().find(|item| item.id == id) {
            item.pinned = true;
            self.sorted_cache = None; // invalidate cache
            return true;
        }
        false
    }

    /// 取消置顶指定 ID 的条目
    fn unpin_item(&mut self, id: &str) -> bool {
        if let Some(item) = self.items.iter_mut().find(|item| item.id == id) {
            item.pinned = false;
            self.sorted_cache = None; // invalidate cache
            return true;
        }
        false
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

    /// 获取文字历史（已排序）
    pub fn get_text_items(&mut self) -> Vec<ClipboardItem> {
        self.text_cache.get_sorted_items()
    }

    /// 获取图片历史（已排序）
    pub fn get_image_items(&mut self) -> Vec<ClipboardItem> {
        self.image_cache.get_sorted_items()
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

    /// 删除指定 ID 的条目
    pub fn delete_item(&mut self, id: &str) -> bool {
        // 先尝试从文字缓存删除，如果失败则尝试图片缓存
        self.text_cache.delete_item(id) || self.image_cache.delete_item(id)
    }

    /// 置顶指定 ID 的条目
    pub fn pin_item(&mut self, id: &str) -> bool {
        // 先尝试从文字缓存置顶，如果失败则尝试图片缓存
        self.text_cache.pin_item(id) || self.image_cache.pin_item(id)
    }

    /// 取消置顶指定 ID 的条目
    pub fn unpin_item(&mut self, id: &str) -> bool {
        // 先尝试从文字缓存取消置顶，如果失败则尝试图片缓存
        self.text_cache.unpin_item(id) || self.image_cache.unpin_item(id)
    }
}

impl Drop for ClipboardCache {
    fn drop(&mut self) {
        self.clear();
        let _ = std::fs::remove_dir_all(&self.text_cache.temp_dir);
    }
}
