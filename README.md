# ClipFlow - Windows 桌面剪贴板管理工具

一款基于 **Tauri 2.x + Rust** 的轻量级 Windows 剪贴板管理工具，自动捕获用户复制的文字/图片，通过鼠标触发的 Dock 面板展示，支持拖拽复用。

## ✨ 特性

- 🔄 **自动监听** - 自动捕获剪贴板变化（文字、图片）
- 📝 **文字历史** - 左侧显示最近复制的文字（独立 50 条缓存）
- 🖼️ **图片预览** - 右侧网格展示图片缩略图（独立 50 条缓存）
- 🔍 **搜索过滤** - 实时搜索历史内容
- 🖱️ **拖拽复用** - 支持拖拽文字到目标应用
- ⚙️ **系统托盘** - 托盘菜单快速访问
- 🚀 **开机自启** - 支持配置开机自动启动
- 🗑️ **清空历史** - 一键清空文字/图片历史

## 🛠️ 技术栈

| 模块 | 技术 |
|------|------|
| 框架 | Tauri 2.x |
| 前端 | React 18 + TypeScript |
| 样式 | Tailwind CSS |
| 拖拽 | @dnd-kit |
| 剪贴板 | clipboard-win + arboard |
| 图片处理 | image crate |
| Windows API | windows crate |

## 📦 安装和开发

### 环境要求

- Node.js 18+
- Rust 1.70+
- Windows 10/11
- Visual Studio Build Tools（含 C++ 桌面开发工作负载）

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run tauri dev
```

### 构建发布版本

```bash
npm run tauri build
```

## 📁 项目结构

```
ClipFlow/
├── src/
│   ├── components/
│   │   ├── DockPanel.tsx       # 主面板容器
│   │   ├── TextList.tsx        # 文字列表组件
│   │   ├── ImageGrid.tsx       # 图片网格组件
│   │   ├── ClipboardCard.tsx   # 剪贴板卡片组件
│   │   ├── SearchBar.tsx       # 搜索栏
│   │   └── Settings.tsx        # 设置面板
│   ├── utils/
│   │   └── formatTime.ts       # 时间格式化
│   ├── App.tsx
│   ├── main.tsx
│   └── types.ts
├── src-tauri/
│   ├── src/
│   │   ├── clipboard/
│   │   │   ├── mod.rs
│   │   │   ├── listener.rs     # 剪贴板监听（核心）
│   │   │   └── parser.rs       # 内容解析与图片保存
│   │   ├── storage/
│   │   │   ├── mod.rs
│   │   │   └── cache.rs        # 独立文字/图片缓存
│   │   ├── tray/
│   │   │   └── mod.rs          # 系统托盘
│   │   ├── window/
│   │   │   └── mod.rs          # 窗口管理
│   │   ├── commands/
│   │   │   └── mod.rs          # IPC 命令
│   │   ├── lib.rs
│   │   └── main.rs
│   ├── tauri.conf.json
│   └── Cargo.toml
├── package.json
└── vite.config.ts
```

## 🎯 使用说明

### 基本操作

1. **复制内容** - 正常复制文字或图片，ClipFlow 会自动捕获
2. **打开面板** - 将鼠标移动到屏幕顶部
3. **关闭面板** - 鼠标离开面板区域后自动收起
4. **复制历史** - 点击卡片上的"复制"按钮
5. **拖拽内容** - 拖拽文字卡片到目标应用

### 缓存说明

- **文字历史** 和 **图片历史** 各自独立，互不影响
- 默认各保留最近 **50 条** 记录
- 程序关闭后历史记录清空，临时图片文件自动清理

## ⚠️ 注意事项

1. **Webview2 依赖** - Windows 10/11 自带，Windows 7 需手动安装
2. **内存缓存** - 程序关闭后历史会清空
3. **拖拽兼容性** - 文字拖拽支持主流应用
4. **权限要求** - 不需要管理员权限

## 📄 许可证

MIT License
