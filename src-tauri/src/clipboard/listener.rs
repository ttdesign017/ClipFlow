use crate::clipboard::parser::{parse_clipboard_content, parse_image_content, ClipboardItem, ItemType};
use crate::storage::ClipboardCache;
use parking_lot::Mutex;
use std::collections::HashSet;
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Manager, Emitter};

use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};

const POLL_INTERVAL: Duration = Duration::from_millis(300);

// Windows 剪贴板格式常量
const CF_UNICODETEXT: u32 = 13;
const CF_DIB: u32 = 8;

// 全局状态：用于跳过程序主动复制时的检测
static SKIP_CHECKS_REMAINING: AtomicUsize = AtomicUsize::new(0);

// 全局状态：用于通知监听线程重置状态
static RESET_REQUESTED: AtomicBool = AtomicBool::new(false);

/// 记录清空历史时的序列号（用于避免清空后重新拉取）
static RESET_SEQUENCE: AtomicUsize = AtomicUsize::new(0);

/// 标记接下来 N 次剪贴板检测应该跳过，避免程序复制的内容被再次添加到历史
pub fn mark_skip_next_check() {
    SKIP_CHECKS_REMAINING.store(5, Ordering::SeqCst);
}

/// 请求重置监听器状态（清空历史后调用）
pub fn reset_listener_state() {
    let current_seq = get_clipboard_sequence() as usize;
    println!("[Clipboard] Requesting reset, current sequence: {}", current_seq);
    RESET_SEQUENCE.store(current_seq, Ordering::SeqCst);
    RESET_REQUESTED.store(true, Ordering::SeqCst);
}

pub fn start_listening(app: AppHandle) {
    let app_handle = Arc::new(app);

    thread::spawn(move || {
        // 文字使用 HashSet 去重，避免重复添加相同文本
        let mut seen_text_hashes: HashSet<u64> = HashSet::new();
        let mut last_text_hash: Option<u64> = None;

        // 图片使用序列号检测新内容，而不是哈希去重
        let mut last_clipboard_sequence: Option<u32> = None;

        loop {
            // 检查是否需要重置状态
            if RESET_REQUESTED.swap(false, Ordering::SeqCst) {
                let reset_seq = RESET_SEQUENCE.load(Ordering::SeqCst) as u32;
                println!("[Clipboard] Resetting listener state, sequence at reset: {}", reset_seq);
                seen_text_hashes.clear();
                last_clipboard_sequence = Some(reset_seq);
                // 关键修复：读取当前剪贴板文本并种下 hash，避免清空后立即重新拉取
                if let Some(text) = read_text_from_clipboard() {
                    last_text_hash = Some(hash_content(text.as_bytes()));
                } else {
                    last_text_hash = None;
                }
                // 跳过接下来的 3 次轮询，给剪贴板稳定时间
                SKIP_CHECKS_REMAINING.store(3, Ordering::SeqCst);
            }

            // 检查是否应该跳过本次检测
            let remaining = SKIP_CHECKS_REMAINING.load(Ordering::SeqCst);
            if remaining > 0 {
                SKIP_CHECKS_REMAINING.store(remaining - 1, Ordering::SeqCst);
                // 只更新哈希，不添加到缓存
                if let Some(text) = read_text_from_clipboard() {
                    last_text_hash = Some(hash_content(text.as_bytes()));
                }
                thread::sleep(POLL_INTERVAL);
                continue;
            }

            // 获取当前剪贴板序列号（用于检测新内容）
            let current_sequence = get_clipboard_sequence();

            // 每次轮询都尝试读取
            match read_clipboard_once() {
                Some(ClipboardRead::Text(data)) => {
                    let current_hash = hash_content(&data);

                    // 检查是否是新内容
                    if Some(current_hash) != last_text_hash && !seen_text_hashes.contains(&current_hash) {
                        println!("[Clipboard] New text content detected, adding to cache (hash={})", current_hash);
                        last_text_hash = Some(current_hash);
                        seen_text_hashes.insert(current_hash);

                        // 限制 seen_text_hashes 大小
                        if seen_text_hashes.len() > 20 {
                            seen_text_hashes.clear();
                        }

                        let parsed = parse_clipboard_content(data);
                        add_to_cache_and_notify(&app_handle, parsed);
                    }
                }
                Some(ClipboardRead::Image(image_data)) => {
                    // 图片：只要序列号变化（说明有新操作）就添加，不去重
                    let is_new_operation = last_clipboard_sequence.is_none()
                        || Some(current_sequence) != last_clipboard_sequence;

                    if is_new_operation {
                        println!("[Clipboard] New image operation detected (seq: {:?} -> {})",
                            last_clipboard_sequence, current_sequence);
                        last_clipboard_sequence = Some(current_sequence);

                        let parsed = parse_image_content(image_data);
                        add_to_cache_and_notify(&app_handle, parsed);
                    }
                }
                None => {
                    // 剪贴板为空或读取失败
                }
            }

            thread::sleep(POLL_INTERVAL);
        }
    });
}

enum ClipboardRead {
    Text(Vec<u8>),
    Image(arboard::ImageData<'static>),
}

/// 获取剪贴板序列号（Windows 特有），用于检测剪贴板内容变化
fn get_clipboard_sequence() -> u32 {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::System::DataExchange::GetClipboardSequenceNumber;
        unsafe { GetClipboardSequenceNumber() }
    }
    #[cfg(not(target_os = "windows"))]
    {
        0
    }
}

/// 检测剪贴板中是否有图片格式（DIB）
fn clipboard_has_image_format() -> bool {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::System::DataExchange::IsClipboardFormatAvailable;
        unsafe {
            let result = IsClipboardFormatAvailable(CF_DIB);
            result.is_ok()
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        false
    }
}

/// 尝试读取剪贴板一次，返回读取到的内容类型
fn read_clipboard_once() -> Option<ClipboardRead> {
    // 优先读取文本（使用 clipboard-win，更可靠）
    if let Some(text) = read_text_from_clipboard() {
        return Some(ClipboardRead::Text(text.into_bytes()));
    }

    // 文本读取失败，检查是否有图片格式
    if clipboard_has_image_format() {
        // 只有确认有图片格式时才调用 arboard
        match try_read_image_from_clipboard() {
            Ok(Some(image_data)) => {
                println!("[Clipboard] Image detected: {}x{}", image_data.width, image_data.height);
                return Some(ClipboardRead::Image(image_data));
            }
            Ok(None) => {
                println!("[Clipboard] Clipboard has image format but read returned None");
            }
            Err(e) => {
                println!("[Clipboard] Image read error: {}", e);
            }
        }
    }

    None
}

/// 从剪贴板读取文本（使用 clipboard-win 直接调用 Windows API）
fn read_text_from_clipboard() -> Option<String> {
    use clipboard_win::{get_clipboard, formats};

    match get_clipboard::<String, _>(formats::Unicode) {
        Ok(text) => {
            if !text.is_empty() {
                println!("[Clipboard] Text read success: {} chars", text.len());
                Some(text)
            } else {
                None
            }
        }
        Err(_e) => {
            // 读取失败可能是剪贴板没有文本格式或被锁定
            None
        }
    }
}

/// 从剪贴板读取图片（仅当 clipboard_has_image_format 返回 true 时调用）
fn try_read_image_from_clipboard() -> Result<Option<arboard::ImageData<'static>>, String> {
    // 只尝试一次，避免反复打开剪贴板导致死锁
    match arboard::Clipboard::new() {
        Ok(mut clipboard) => {
            match clipboard.get_image() {
                Ok(image_data) => {
                    if image_data.width > 0 && image_data.height > 0 && !image_data.bytes.is_empty() {
                        println!("[Clipboard] Image read success: {}x{}, {} bytes",
                            image_data.width, image_data.height, image_data.bytes.len());
                        Ok(Some(image_data.to_owned_img()))
                    } else {
                        Err("Invalid image dimensions".to_string())
                    }
                }
                Err(e) => {
                    Err(format!("arboard get_image error: {}", e))
                }
            }
        }
        Err(e) => {
            Err(format!("Failed to create clipboard: {}", e))
        }
    }
}

fn add_to_cache_and_notify(app_handle: &AppHandle, item: ClipboardItem) {
    println!("[Clipboard] Adding item: {} (type={})", item.preview,
        match &item.kind {
            ItemType::Text { .. } => "Text",
            ItemType::Image { .. } => "Image",
            ItemType::File { .. } => "File",
        }
    );
    app_handle.state::<Arc<Mutex<ClipboardCache>>>().lock().add_item(item);
    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.emit("clipboard-updated", ());
    }
}

fn hash_content(content: &[u8]) -> u64 {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    let mut hasher = DefaultHasher::new();
    content.hash(&mut hasher);
    hasher.finish()
}
