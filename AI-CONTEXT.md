# ClipFlow - AI 交接文档

> 本文档用于记录项目当前状态、已完成/未完成事项，方便下次开启对话时快速接续。
> 
> **最后更新**: 2026-04-13

---

## 📋 项目概述

**ClipFlow** 是一款基于 Tauri 2.x + Rust 的 Windows 剪贴板管理工具。核心功能：自动监听剪贴板变化，将复制的文字/图片保存到独立缓存中，通过 Dock 面板展示（鼠标移到屏幕顶部自动滑入），支持快速复制和拖拽复用。

---

## ✅ 已完成事项

### 1. 项目基础架构
- [x] Tauri 2.x + React 18 + TypeScript + Tailwind CSS 项目搭建
- [x] 前后端 IPC 通信框架
- [x] 基础 UI 布局（左右分栏：文字列表 + 图片网格）
- [x] 搜索过滤功能
- [x] 设置面板（最大保留条数滑块 + 开机自启开关）
- [x] 系统托盘集成（右键菜单：显示面板/清空历史/设置/退出）
- [x] 应用图标配置
- [x] **非 Git 项目**（无 .git 目录）

### 2. 剪贴板监听（核心模块，经过多次迭代修复）
- [x] 后台线程轮询监听（300ms 间隔，`parking_lot::Mutex`）
- [x] **文字监听**：使用 `clipboard-win` 直接调用 Windows API（`get_clipboard::<String, _>(formats::Unicode)`），避免 arboard 死锁
- [x] **图片监听**：使用 `arboard` 读取图片，先用 `IsClipboardFormatAvailable(CF_DIB)` 检测格式，确认有图片才调用 arboard，避免不必要的剪贴板打开操作
- [x] **Windows 剪贴板序列号**检测新操作（`GetClipboardSequenceNumber`）
- [x] 文字去重逻辑（HashSet + 哈希，最多保留 20 个历史哈希）
- [x] 图片**不去重**（每次新序列号操作都添加）
- [x] 程序主动复制时跳过检测（`mark_skip_next_check`，跳过 5 次轮询）
- [x] UTF-8 中文字符串安全截取（使用 `.chars().take(100)` 而非字节切片）
- [x] 清空历史后状态重置（记录清空时的序列号，种下当前文本哈希，跳过 3 次轮询）

### 3. 数据存储
- [x] **文字和图片缓存独立**，各自 50 条限制（`SingleTypeCache`）
- [x] `ClipboardCache` 包含两个子缓存：`text_cache` 和 `image_cache`
- [x] FIFO 淘汰策略，满时自动移除最旧条目并清理临时文件
- [x] 清空历史时重置监听器状态（记录当前序列号，避免清空后重新拉取）
- [x] 程序退出时自动清理临时文件（`Drop for ClipboardCache`）

### 4. 图片处理
- [x] 图片保存到 `%TEMP%\ClipFlow\images\` 目录
- [x] 使用 `image` crate 将 RGBA 数据保存为 PNG
- [x] 图片数据完整性验证（宽高 > 0，字节数 == expected_len）
- [x] 图片临时文件路径通过 Tauri asset protocol 暴露给前端
- [x] 前端使用 `convertFileSrc(path)` 显示缩略图
- [x] Tauri 配置启用 `protocol-asset` 功能

### 5. 前端功能
- [x] 文字列表展示（`TextList` 组件 + `ClipboardCard` 卡片）
- [x] 图片网格展示（`ImageGrid` 组件，2 列网格，支持缩略图）
- [x] 文字卡片复制按钮（修复 `useDraggable` 事件拦截问题，添加 `onPointerDown` 阻止冒泡 + `pointer-events: none`）
- [x] `@dnd-kit/core` 拖拽框架集成
- [x] `clipboard-updated` 事件监听，自动刷新列表
- [x] 并行加载文字/图片历史（`Promise.all`）
- [x] **Dock 面板动画** - 使用 CSS `translateY` + `cubic-bezier` 实现平滑滑入/滑出（0.25s）
- [x] **图片 Hover 预览** - 鼠标悬停时显示半透明浮层，展示放大缩略图
- [x] 搜索过滤（前端 `includes()` 匹配 preview 字段）

### 6. IPC 命令
- [x] `get_text_history` - 获取文字历史
- [x] `get_image_history` - 获取图片历史
- [x] `get_clipboard_history` - 获取合并历史（兼容旧接口）
- [x] `clear_clipboard_history` - 清空所有历史 + 重置监听器
- [x] `copy_to_clipboard` - 复制文字到剪贴板
- [x] `on_drag_end_text` - 文字拖拽结束处理（写入剪贴板）
- [x] `on_drag_end_image` - 图片拖拽结束处理（**CF_HDROP 格式**，支持拖拽到微信/QQ/浏览器）
- [x] `get_settings` / `update_settings` - 设置管理
- [x] `set_auto_start` - 开机自启开关（注册表操作）
- [x] `get_temp_image_path` - 获取图片临时目录

### 7. Bug 修复记录
| Bug | 原因 | 修复方案 |
|-----|------|----------|
| 复制内容重复添加到 50 条 | 去重逻辑使用 `||` 而非 `&&` | 改为只使用哈希去重 |
| 复制 4 条后不再添加 | `arboard::Clipboard::new()` 死锁 | 改用 `clipboard-win` 读文本，先检测图片格式再调 arboard |
| 图片无法添加 | 图片读取失败时无回退逻辑 | 添加重试和格式检测 |
| 清空历史后图片自动恢复 | `last_clipboard_sequence` 重置为 `None` | 记录清空时的序列号，种下当前文本哈希 |
| 复制长 Markdown 文档后崩溃 | `&content_str[..100]` 字节切片落在 UTF-8 字符中间 | 改用 `.chars().take(100)` |
| 复制按钮无效 | `useDraggable` 的 `{...listeners}` 拦截事件 | 添加 `onPointerDown` 阻止冒泡 + `pointer-events: none` 覆盖父元素 |
| 图片缩略图不显示 | Tauri 不允许前端访问本地文件 | 启用 `protocol-asset` + `convertFileSrc()` |

---

## 🚧 待完成事项

### 高优先级
- [ ] **文字拖拽到目标应用验证** - 目前 `on_drag_end_text` 已实现，但拖拽到微信/QQ 等应用的兼容性需实际测试
  - 当前方案：拖拽结束时将文字写入系统剪贴板，依赖目标应用自动粘贴
  - 可能需要改为 OLE 数据对象直接传递文字
- [ ] **图片拖拽导出验证** - `on_drag_end_image` 已实现 CF_HDROP，但需实际测试微信/QQ/浏览器兼容性
  - 注意：当前实现将文件句柄写入剪贴板，但部分应用可能期望直接读取文件内容
- [ ] **设置面板 max_items 未生效** - 前端滑块可调整 10-200，但后端缓存大小在 `lib.rs` 硬编码为 50
  - `update_settings` 命令只做了参数校验，没有实际更新缓存大小
  - 建议：将 `ClipboardCache::new(50)` 改为动态配置

### 中优先级
- [ ] **搜索增强** - 当前只支持简单的 `preview.includes(query)` 过滤
  - 建议：支持全文搜索（搜索 `Text.content` 而不仅 preview）
  - 建议：支持按类型过滤（只看文字/只看图片）
- [ ] **时间格式化优化** - 已有 `formatTime` 工具函数，需确认是否显示相对时间（"2 分钟前"）
- [ ] **错误处理优化** - 部分错误只打印日志，没有用户反馈
  - 建议：添加 Toast 通知（如复制失败、图片保存失败）
- [ ] **性能优化** - 大量历史记录时前端渲染可能卡顿
  - 建议：虚拟滚动（react-window）
- [ ] **窗口关闭行为** - 当前窗口 Y=0 固定在顶部，通过 `translateY(-100%)` 隐藏
  - 建议：考虑改为 `npm run tauri dev` 时不显示任务栏图标

### 低优先级
- [ ] **文件类型支持** - 监听复制的文件路径（`CF_HDROP`）
  - `parser.rs` 已有 `ItemType::File` 枚举，但 `listener.rs` 未实现文件读取
- [ ] **收藏功能** - 重要内容标记收藏，不被淘汰
- [ ] **深色/浅色主题切换**
- [ ] **持久化存储** - 程序关闭后保存历史到磁盘（SQLite/JSON）
- [ ] **打包发布** - 配置 Tauri 打包（MSI/NSIS）
- [ ] **单元测试** - Rust 和前端测试覆盖

---

## 🔧 关键技术细节

### 剪贴板监听架构

```
监听线程（独立线程，parking_lot::Mutex）
├── 每 300ms 轮询一次
├── 先读文本（clipboard-win，不会死锁）
├── 文本失败 → 检测图片格式（IsClipboardFormatAvailable）
├── 确认有图片 → 调用 arboard 读取
└── 检测到新内容 → 解析 → 添加到缓存 → 通知前端
```

### 缓存结构

```
ClipboardCache
├── text_cache: SingleTypeCache (max 50) - 文字记录
└── image_cache: SingleTypeCache (max 50) - 图片记录（含临时文件路径）

SingleTypeCache
├── items: VecDeque<ClipboardItem>
├── max_items: usize
└── temp_dir: PathBuf
```

### 图片保存流程

```
arboard.get_image() → ImageData (RGBA)
→ 验证数据完整性（bytes.len() == width * height * 4）
→ image::RgbaImage::from_raw()
→ img.save("%TEMP%/ClipFlow/images/{uuid}.png")
→ 记录路径到 ClipboardItem
→ 前端通过 convertFileSrc(path) 显示
```

### 防止重复添加策略

| 类型 | 策略 |
|------|------|
| 文字 | 哈希去重（HashSet，最近 20 个） |
| 图片 | 序列号检测（`GetClipboardSequenceNumber`），不去重 |
| 程序主动复制 | 跳过 5 次轮询（`mark_skip_next_check`） |
| 清空历史后 | 记录清空时的序列号，种下当前文本哈希，跳过 3 次轮询 |

### Dock 面板动画

```css
/* 滑入 */
transform: translateY(0);
transition: transform 0.25s cubic-bezier(0.4, 0.0, 0.2, 1);

/* 滑出 */
transform: translateY(-100%);
```

### 已知限制

1. **arboard 在 Windows 上可能死锁** - 所以文字读取改用 `clipboard-win`，图片只在确认有格式时才调用
2. **UTF-8 字符串切片** - 必须使用 `.chars()` 方法，不能用字节索引
3. **内存缓存** - 程序关闭后历史清空，无持久化存储
4. **图片格式** - 只支持 DIB 格式（Windows 截图/截图工具），部分应用可能使用其他格式
5. **非 Git 项目** - 无版本控制，建议使用 `git init` 初始化

---

## 🚀 启动和调试

### 启动命令
```bash
npm run tauri dev
```

### 构建发布版本
```bash
npm run tauri build
```

### 查看调试日志
日志输出到运行 `npm run tauri dev` 的终端窗口。保存到文件：
```bash
npm run tauri dev > clipflow.log 2>&1
# 另一个终端实时查看（PowerShell）
Get-Content clipflow.log -Wait
```

### 常见日志模式
- `[Clipboard] Text read success: N chars` - 文字读取成功
- `[Clipboard] New text content detected` - 新文字添加到缓存
- `[Clipboard] Image read success: WxH, N bytes` - 图片读取成功
- `[Clipboard] New image operation detected (seq: X -> Y)` - 新截图操作
- `[Clipboard] Requesting reset, current sequence: N` - 清空历史
- `[Parser] Image saved to: path/to/file.png` - 图片保存成功

---

## 📝 代码位置速查

| 功能 | 文件路径 |
|------|----------|
| 剪贴板监听 | `src-tauri/src/clipboard/listener.rs` |
| 内容解析 | `src-tauri/src/clipboard/parser.rs` |
| 缓存管理 | `src-tauri/src/storage/cache.rs` |
| IPC 命令 | `src-tauri/src/commands/mod.rs` |
| 应用入口 | `src-tauri/src/lib.rs` |
| 系统托盘 | `src-tauri/src/tray/mod.rs` |
| 窗口管理 | `src-tauri/src/window/mod.rs`（当前为空，窗口逻辑在前端） |
| 前端主组件 | `src/App.tsx` |
| Dock 面板 | `src/components/DockPanel.tsx` |
| 文字卡片 | `src/components/ClipboardCard.tsx` |
| 图片网格 | `src/components/ImageGrid.tsx` |
| 文字列表 | `src/components/TextList.tsx` |
| 搜索栏 | `src/components/SearchBar.tsx` |
| 设置面板 | `src/components/Settings.tsx` |
| 类型定义 | `src/types.ts` |
| Tauri 配置 | `src-tauri/tauri.conf.json` |
| Rust 依赖 | `src-tauri/Cargo.toml` |

---

## 💡 给 AI 的建议

1. **修改剪贴板相关代码时务必小心** - 这里的 bug 最容易导致程序死锁/崩溃
2. **每次修改后运行 `cargo check` 确保编译通过**
3. **字符串操作优先使用 `.chars()` 而非字节索引**
4. **`arboard::Clipboard::new()` 调用次数越少越好**（可能死锁）
5. **测试时建议复制 10+ 条不同内容**，验证不会出现"僵死"状态
6. **图片相关功能建议实际截图测试**（Win+Shift+S）
7. **拖拽功能修改后需在微信/QQ/浏览器中实际测试**
8. **本项目无 Git 版本控制**，重大修改前建议提醒用户备份
