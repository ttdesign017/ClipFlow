use crate::storage::ClipboardCache;
use parking_lot::Mutex;
use std::sync::Arc;
use tauri::State;
use tauri::Manager;

#[tauri::command]
pub fn get_clipboard_history(cache: State<Arc<Mutex<ClipboardCache>>>) -> Result<Vec<crate::clipboard::parser::ClipboardItem>, String> {
    Ok(cache.lock().get_items())
}

#[tauri::command]
pub fn get_text_history(cache: State<Arc<Mutex<ClipboardCache>>>) -> Result<Vec<crate::clipboard::parser::ClipboardItem>, String> {
    Ok(cache.lock().get_text_items())
}

#[tauri::command]
pub fn get_image_history(cache: State<Arc<Mutex<ClipboardCache>>>) -> Result<Vec<crate::clipboard::parser::ClipboardItem>, String> {
    Ok(cache.lock().get_image_items())
}

#[tauri::command]
pub fn clear_clipboard_history(cache: State<Arc<Mutex<ClipboardCache>>>) -> Result<(), String> {
    cache.lock().clear();
    // 重置监听器状态，确保清空后可以继续添加新内容
    crate::clipboard::listener::reset_listener_state();
    Ok(())
}

#[tauri::command]
pub fn copy_to_clipboard(content: String) -> Result<(), String> {
    use arboard::Clipboard;
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;

    // 标记下一次检测应该跳过，避免程序复制的内容被再次添加到历史
    crate::clipboard::listener::mark_skip_next_check();

    clipboard.set_text(content).map_err(|e| e.to_string())
}

/// 拖拽结束处理：将文字写入系统剪贴板
#[tauri::command]
pub fn on_drag_end_text(content: String) -> Result<(), String> {
    use arboard::Clipboard;
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    // 标记跳过接下来的 N 次检测
    crate::clipboard::listener::mark_skip_next_check();
    clipboard.set_text(content).map_err(|e| e.to_string())
}

/// 拖拽结束处理：将图片以 CF_HDROP 格式写入系统剪贴板（支持拖拽到微信/QQ/浏览器等）
#[tauri::command]
pub fn on_drag_end_image(file_path: String) -> Result<(), String> {
    // 标记跳过接下来的 N 次检测
    crate::clipboard::listener::mark_skip_next_check();
    write_file_to_clipboard(&file_path)
}

#[derive(serde::Serialize)]
pub struct Settings {
    pub max_items: usize,
    pub auto_start: bool,
}

#[tauri::command]
pub fn get_settings() -> Result<Settings, String> {
    Ok(Settings {
        max_items: 50,
        auto_start: is_auto_start_enabled(),
    })
}

#[tauri::command]
pub fn update_settings(max_items: Option<usize>) -> Result<(), String> {
    if let Some(max) = max_items {
        if max < 10 || max > 200 {
            return Err("max_items must be between 10 and 200".to_string());
        }
    }
    Ok(())
}

#[tauri::command]
pub fn set_auto_start(enable: bool) -> Result<(), String> {
    if enable {
        enable_auto_start()
    } else {
        disable_auto_start()
    }
}

#[tauri::command]
pub fn get_temp_image_path(cache: State<Arc<Mutex<ClipboardCache>>>) -> Result<String, String> {
    let cache_lock = cache.lock();
    let temp_dir = cache_lock.get_temp_dir();
    Ok(temp_dir.to_string_lossy().to_string())
}

#[tauri::command]
pub fn delete_clipboard_item(id: String, cache: State<Arc<Mutex<ClipboardCache>>>) -> Result<(), String> {
    let mut cache_lock = cache.lock();
    if cache_lock.delete_item(&id) {
        Ok(())
    } else {
        Err("Item not found".to_string())
    }
}

#[tauri::command]
pub fn pin_clipboard_item(id: String, cache: State<Arc<Mutex<ClipboardCache>>>) -> Result<(), String> {
    let mut cache_lock = cache.lock();
    if cache_lock.pin_item(&id) {
        Ok(())
    } else {
        Err("Item not found".to_string())
    }
}

/// 复制图片到剪贴板（通过文件路径）
#[tauri::command]
pub fn copy_image_to_clipboard(file_path: String) -> Result<(), String> {
    // 标记跳过接下来的 N 次检测
    crate::clipboard::listener::mark_skip_next_check();
    
    // 读取图片文件
    let image = image::open(&file_path)
        .map_err(|e| format!("Failed to open image: {}", e))?;
    
    let width = image.width() as u32;
    let height = image.height() as u32;
    let rgba = image.to_rgba8();
    
    // 转换为 BGR（DIB 格式需要 BGR，不包含 alpha）
    let mut bgr_data: Vec<u8> = Vec::with_capacity((width * height * 4) as usize);
    for pixel in rgba.chunks(4) {
        bgr_data.push(pixel[2]); // B
        bgr_data.push(pixel[1]); // G
        bgr_data.push(pixel[0]); // R
        bgr_data.push(0);        // 填充字节
    }
    
    write_dib_to_clipboard(width, height, bgr_data)
}

// Windows 注册表操作：开机自启
fn is_auto_start_enabled() -> bool {
    use std::process::Command;
    let output = Command::new("reg")
        .args(&["query", "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run", "/v", "ClipFlow"])
        .output();
    
    match output {
        Ok(out) => out.status.success(),
        Err(_) => false,
    }
}

fn enable_auto_start() -> Result<(), String> {
    use std::process::Command;
    let exe_path = std::env::current_exe()
        .map_err(|e| e.to_string())?;
    
    let output = Command::new("reg")
        .args(&["add", "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run", "/v", "ClipFlow", "/t", "REG_SZ", "/d", exe_path.to_str().unwrap_or(""), "/f"])
        .output()
        .map_err(|e| e.to_string())?;
    
    if output.status.success() {
        Ok(())
    } else {
        Err("Failed to set auto start".to_string())
    }
}

fn disable_auto_start() -> Result<(), String> {
    use std::process::Command;
    let output = Command::new("reg")
        .args(&["delete", "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run", "/v", "ClipFlow", "/f"])
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(())
    } else {
        Err("Failed to disable auto start".to_string())
    }
}

/// Windows 平台：将文件以 CF_HDROP 格式写入剪贴板
#[cfg(target_os = "windows")]
fn write_file_to_clipboard(file_path: &str) -> Result<(), String> {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use windows::Win32::Foundation::{BOOL, HANDLE, HWND};
    use windows::Win32::System::DataExchange::{
        CloseClipboard, EmptyClipboard, OpenClipboard, SetClipboardData,
    };
    use windows::Win32::System::Memory::{
        GlobalAlloc, GlobalLock, GlobalUnlock, GMEM_MOVEABLE, GMEM_ZEROINIT,
    };

    // CF_HDROP 格式 ID
    const CF_HDROP: u32 = 15;

    // 将文件路径转为 UTF-16 宽字符串（双 null 结尾）
    let wide_path: Vec<u16> = OsStr::new(file_path)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    // DROPFILES 结构大小（20 字节，实际对齐到 32）
    // struct DROPFILES { DWORD pFiles; POINT pt; BOOL fNC; BOOL fWide; }
    const DROPFILES_SIZE: usize = 32;

    // 分配全局内存
    let total_size = DROPFILES_SIZE + wide_path.len() * 2 + 2;
    let h_mem = unsafe { GlobalAlloc(GMEM_MOVEABLE | GMEM_ZEROINIT, total_size) }
        .map_err(|e| format!("Failed to allocate global memory: {}", e))?;

    unsafe {
        let mem_ptr = GlobalLock(h_mem);
        if mem_ptr.is_null() {
            return Err("Failed to lock global memory".to_string());
        }
        let mem_ptr = mem_ptr as *mut u8;

        // 写入 DROPFILES 结构
        // pFiles = 偏移量 (20)
        *(mem_ptr as *mut u32) = 20u32;
        // fWide = TRUE (偏移 16)
        *(mem_ptr.offset(16) as *mut BOOL) = BOOL(1);

        // 写入文件路径（UTF-16）
        let path_start = mem_ptr.add(DROPFILES_SIZE);
        std::ptr::copy_nonoverlapping(wide_path.as_ptr(), path_start as *mut u16, wide_path.len());
        // 双 null 结尾
        *(path_start.add(wide_path.len() * 2) as *mut u16) = 0;

        GlobalUnlock(h_mem).ok();

        // 打开剪贴板
        if OpenClipboard(HWND(std::ptr::null_mut())).is_ok() {
            let _ = EmptyClipboard();
            let result = SetClipboardData(CF_HDROP, HANDLE(h_mem.0 as _));
            let _ = CloseClipboard();

            result.map_err(|e| format!("Failed to set clipboard data: {}", e))?;
        } else {
            return Err("Failed to open clipboard".to_string());
        }
    }

    Ok(())
}

/// Windows 平台：将位图数据以 CF_DIB 格式写入剪贴板
#[cfg(target_os = "windows")]
fn write_dib_to_clipboard(width: u32, height: u32, bgr_data: Vec<u8>) -> Result<(), String> {
    use windows::Win32::Foundation::HANDLE;
    use windows::Win32::Foundation::HWND;
    use windows::Win32::Graphics::Gdi::BITMAPINFOHEADER;
    use windows::Win32::Graphics::Gdi::BI_RGB;
    use windows::Win32::System::DataExchange::{
        CloseClipboard, EmptyClipboard, OpenClipboard, SetClipboardData,
    };
    use windows::Win32::System::Memory::{
        GlobalAlloc, GlobalLock, GlobalUnlock, GMEM_MOVEABLE, GMEM_ZEROINIT,
    };

    // CF_DIB 格式 ID
    const CF_DIB: u32 = 8;

    // BITMAPINFOHEADER 大小（40 字节）
    const HEADER_SIZE: usize = 40;

    // 行大小（4 字节对齐）
    let row_size = ((width * 4 + 3) / 4) * 4;
    let image_size = (row_size * height) as usize;

    // 总内存大小：header + pixel data
    let total_size = HEADER_SIZE + image_size;

    let h_mem = unsafe { GlobalAlloc(GMEM_MOVEABLE | GMEM_ZEROINIT, total_size) }
        .map_err(|e| format!("Failed to allocate global memory: {}", e))?;

    unsafe {
        let mem_ptr = GlobalLock(h_mem);
        if mem_ptr.is_null() {
            return Err("Failed to lock global memory".to_string());
        }
        let mem_ptr = mem_ptr as *mut u8;

        // 写入 BITMAPINFOHEADER
        let header = &mut *(mem_ptr as *mut BITMAPINFOHEADER);
        header.biSize = HEADER_SIZE as u32;
        header.biWidth = width as i32;
        header.biHeight = height as i32; // 正数 = 自底向上
        header.biPlanes = 1;
        header.biBitCount = 32;
        header.biCompression = BI_RGB.0;
        header.biSizeImage = image_size as u32;

        // 写入像素数据（需要垂直翻转，因为 DIB 是自底向上）
        let pixel_start = mem_ptr.add(HEADER_SIZE);
        for y in 0..height {
            let src_row = bgr_data.chunks(4).skip(((height - 1 - y) * width) as usize).take(width as usize);
            let dst_row = pixel_start.offset((y * row_size) as isize) as *mut u8;
            for (i, pixel) in src_row.enumerate() {
                std::ptr::copy_nonoverlapping(pixel.as_ptr(), dst_row.add(i * 4), 4);
            }
        }

        GlobalUnlock(h_mem).ok();

        // 打开剪贴板
        if OpenClipboard(HWND(std::ptr::null_mut())).is_ok() {
            let _ = EmptyClipboard();
            let result = SetClipboardData(CF_DIB, HANDLE(h_mem.0 as _));
            let _ = CloseClipboard();

            result.map_err(|e| format!("Failed to set clipboard data: {}", e))?;
        } else {
            return Err("Failed to open clipboard".to_string());
        }
    }

    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn write_file_to_clipboard(_file_path: &str) -> Result<(), String> {
    Err("File clipboard is not supported on this platform".to_string())
}

#[tauri::command]
pub async fn set_ignore_cursor_events(app: tauri::AppHandle, ignore: bool) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("main") {
        win.set_ignore_cursor_events(ignore)
            .map_err(|e| format!("Failed to set ignore cursor events: {}", e))?;
    }
    Ok(())
}
