# DupDup - 重复文件管理工具

DupDup 是一个跨平台的桌面应用程序，帮助用户高效地识别和管理重复文件。使用 Tauri 和 Vue.js 构建，提供了直观的用户界面和强大的文件管理功能。

## ✨ 主要功能

- 🔍 智能文件扫描：快速识别重复文件
- 📁 灵活的文件类型过滤：支持图片、视频、音频、文档等多种文件类型
- 🎯 精确的文件比较：使用 SHA-256 哈希算法确保准确性
- 🗑️ 多种删除选项：支持移动到回收站或直接删除
- 📊 实时进度显示：文件处理过程可视化
- 💡 智能选择：支持保留每组第一个或最后一个文件

## 🚀 快速开始

### 截图

<img src="https://github.com/z4none/DupDup/blob/main/screenshot/1.png?raw=true" width="300" />
<img src="https://github.com/z4none/DupDup/blob/main/screenshot/2.png?raw=true" width="300" />

### 系统要求

- Windows 7 及以上
- macOS 10.13 及以上
- Linux (主流发行版)

### 安装

1. 从 [Releases](https://github.com/yourusername/DupDup/releases) 下载最新版本
2. 运行安装程序
3. 启动 DupDup

## 🛠️ 开发环境设置

```bash
# 克隆仓库
git clone https://github.com/yourusername/DupDup.git

# 安装依赖
cd DupDup
npm install

# 启动开发服务器
npm run tauri dev
```

### 技术栈

- 前端：Vue 3 + Vite
- UI 框架：Naive UI
- 后端：Rust + Tauri
- 状态管理：Pinia

## 📝 使用说明

1. 添加要扫描的文件夹
2. 选择要检查的文件类型
3. 点击"开始扫描"
4. 在预览页面查看重复文件
5. 选择要保留的文件
6. 选择删除方式（移动到回收站或直接删除）

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

[MIT](LICENSE)

## 🙏 鸣谢

- [Tauri](https://tauri.app/)
- [Vue.js](https://vuejs.org/)
- [Naive UI](https://www.naiveui.com/)
- [Vite](https://vitejs.dev/)
