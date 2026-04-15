use log::info;
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use tauri::Emitter;
use tauri::Manager;

static MONITORING: AtomicBool = AtomicBool::new(false);

#[cfg(target_os = "windows")]
pub fn start(app_handle: tauri::AppHandle) {
    if MONITORING.swap(true, Ordering::SeqCst) {
        return;
    }

    info!("Starting global mouse position monitor");

    // 获取窗口初始位置
    let mut initial_rect: Option<(i32, i32, i32, i32)> = None;

    if let Some(win) = app_handle.get_webview_window("main") {
        if let Ok(pos) = win.outer_position() {
            if let Ok(size) = win.outer_size() {
                let left = pos.x;
                let top = pos.y;
                let right = pos.x + size.width as i32;
                let bottom = pos.y + size.height as i32;
                initial_rect = Some((left, top, right, bottom));
                info!("Window rect: ({}, {}, {}, {})", left, top, right, bottom);
            }
        }
    }

    thread::spawn(move || {
        use windows::Win32::Foundation::POINT;
        use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;

        let mut was_in_window = false;
        let mut was_at_top = false;
        let mut window_rect = initial_rect;

        loop {
            if !MONITORING.load(Ordering::SeqCst) {
                break;
            }

            unsafe {
                let mut point = POINT::default();
                if GetCursorPos(&mut point).is_ok() {
                    let is_at_top = point.y <= 5;

                    let mut in_window = false;
                    if let Some((left, top, right, bottom)) = window_rect {
                        let px = point.x;
                        let py = point.y;
                        in_window = px >= left && px <= right && py >= top && py <= bottom;
                    }

                    // 触碰顶端且在面板水平范围内 → 触发
                    let in_panel_x = if let Some((left, _top, right, _bottom)) = window_rect {
                        point.x >= left && point.x <= right
                    } else {
                        false
                    };
                    if is_at_top && in_panel_x && !was_at_top {
                        let _ = app_handle.emit("mouse-at-top", &());
                        was_at_top = true;
                    } else if !is_at_top {
                        was_at_top = false;
                    }

                    // 离开窗口 → 触发
                    if was_in_window && !in_window {
                        let _ = app_handle.emit("mouse-left-window", &());
                        was_in_window = false;
                    } else if in_window && !was_in_window {
                        was_in_window = true;
                    }
                }
            }

            std::thread::sleep(std::time::Duration::from_millis(50));
        }
    });
}

#[cfg(not(target_os = "windows"))]
pub fn start(_app_handle: tauri::AppHandle) {
    info!("Mouse monitor not supported on this platform");
}
