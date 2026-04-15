use parking_lot::Mutex;
use std::sync::Arc;
use tauri::Manager;

pub mod clipboard;
pub mod storage;
pub mod tray;
pub mod window;
pub mod commands;
pub mod mouse_monitor;

use storage::ClipboardCache;

pub fn run() {
    env_logger::init();

    let cache = Arc::new(Mutex::new(ClipboardCache::new(50)));

    println!("ClipFlow starting up...");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(cache)
        .setup(|app| {
            println!("Setup: Initializing app");

            // 窗口居中，Y=0 固定在顶部
            if let Some(win) = app.get_webview_window("main") {
                if let Ok(monitor) = win.current_monitor() {
                    if let Some(m) = monitor {
                        let size = m.size();
                        if let Ok(outer) = win.outer_size() {
                            let x = ((size.width - outer.width) / 2) as i32;
                            let _ = win.set_position(tauri::Position::Physical(
                                tauri::PhysicalPosition::new(x, 0)
                            ));
                            println!("Setup: Window positioned at x={}, y=0", x);
                        }
                    }
                }
            }

            tray::setup(app);
            println!("Setup: Tray icon created successfully");

            clipboard::start_listening(app.handle().clone());
            
            // 启动全局鼠标监控
            mouse_monitor::start(app.handle().clone());

            println!("Setup: All initialization complete");

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_clipboard_history,
            commands::get_text_history,
            commands::get_image_history,
            commands::clear_clipboard_history,
            commands::copy_to_clipboard,
            commands::on_drag_end_text,
            commands::on_drag_end_image,
            commands::get_settings,
            commands::update_settings,
            commands::set_auto_start,
            commands::get_temp_image_path,
            commands::set_ignore_cursor_events,
            commands::delete_clipboard_item,
            commands::pin_clipboard_item,
            commands::unpin_clipboard_item,
            commands::copy_image_to_clipboard,
        ])
        .run(tauri::generate_context!())
        .expect("error while running ClipFlow");
}
