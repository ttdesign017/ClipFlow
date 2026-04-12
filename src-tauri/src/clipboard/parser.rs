use arboard::ImageData;
use chrono::Utc;
use uuid::Uuid;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ClipboardItem {
    pub id: String,
    pub kind: ItemType,
    pub timestamp: u64,
    pub preview: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum ItemType {
    Text { content: String },
    Image { path: String, width: u32, height: u32 },
    File { paths: Vec<String> },
}

pub fn parse_clipboard_content(data: Vec<u8>) -> ClipboardItem {
    let content_str = String::from_utf8_lossy(&data);

    // 使用字符数量截取，避免 UTF-8 多字节字符导致的 panic
    let preview = if content_str.chars().count() > 100 {
        let truncated: String = content_str.chars().take(100).collect();
        format!("{}...", truncated)
    } else {
        content_str.to_string()
    };

    ClipboardItem {
        id: Uuid::new_v4().to_string(),
        kind: ItemType::Text {
            content: content_str.to_string(),
        },
        timestamp: Utc::now().timestamp_millis() as u64,
        preview,
    }
}

pub fn parse_image_content(image_data: ImageData<'static>) -> ClipboardItem {
    let width = image_data.width as u32;
    let height = image_data.height as u32;
    let id = Uuid::new_v4().to_string();

    println!("[Parser] Processing image: {}x{}, {} bytes, id={}", width, height, image_data.bytes.len(), id);

    // 保存图片到临时目录
    let path = match save_image_to_temp(&image_data, &id) {
        Ok(p) => {
            println!("[Parser] Image saved to: {}", p);
            p
        }
        Err(e) => {
            eprintln!("[Parser] Failed to save image: {}", e);
            String::new()
        }
    };

    let preview = format!("图片 {}x{}", width, height);

    ClipboardItem {
        id,
        kind: ItemType::Image { path, width, height },
        timestamp: Utc::now().timestamp_millis() as u64,
        preview,
    }
}

fn save_image_to_temp(image_data: &ImageData<'static>, id: &str) -> Result<String, String> {
    // 获取临时目录
    let temp_dir = std::env::temp_dir().join("ClipFlow").join("images");
    std::fs::create_dir_all(&temp_dir)
        .map_err(|e| format!("Failed to create temp dir: {}", e))?;

    // 检查数据长度是否匹配
    let expected_len = (image_data.width * image_data.height * 4) as usize;
    if image_data.bytes.len() != expected_len {
        return Err(format!(
            "Data size mismatch: expected {} bytes ({}x{}x4), got {} bytes",
            expected_len, image_data.width, image_data.height, image_data.bytes.len()
        ));
    }

    // 将 RGBA 数据转换为 PNG
    let img = image::RgbaImage::from_raw(
        image_data.width as u32,
        image_data.height as u32,
        image_data.bytes.to_vec(),
    ).ok_or("Failed to create RgbaImage from raw data")?;

    let file_path = temp_dir.join(format!("{}.png", id));

    // 保存为 PNG
    img.save(&file_path)
        .map_err(|e| format!("Failed to save PNG: {}", e))?;

    file_path.to_str()
        .map(|s| s.to_string())
        .ok_or("Invalid UTF-8 in file path".to_string())
}
