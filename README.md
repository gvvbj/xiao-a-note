# 📝 Xiao-A-Note (小 A 笔记)

> 一个基于 Web 技术栈构建的多功能、现代化 Markdown 桌面笔记工具

[![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)](#)
[![Vite](https://img.shields.io/badge/Vite-B73BFE?style=flat-square&logo=vite&logoColor=FFD62E)](#)
[![Electron](https://img.shields.io/badge/Electron-47848F?style=flat-square&logo=electron&logoColor=white)](#)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](#)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](#)

## 🌟 项目简介

**Xiao-A-Note** 是一款追求极致体验的 Markdown 桌面笔记应用。我们希望打破传统笔记工具的限制，通过极其灵活的**插件机制**与**主题系统**，让你能够自由地打造最适合自己的思考与写作环境。

借助 Electron 的能力，小 A 笔记完美运行在 Windows、macOS 和 Linux 上，同时依靠 React + Vite + Tailwind CSS 带来了无与伦比的流畅度与现代感。

## ✨ 核心特性

- **✍️ 纯粹的 Markdown 体验**：专注于沉浸式写作，支持处理大体积文档而不卡顿。
- **🔌 强大的插件架构**：内置完整的 `plugins` 生态系统，轻松扩展无限功能。
- **🎨 深度的主题定制**：通过 `themes` 目录与 `theme.json`，轻松切换或编写符合你审美的界面外观。
- **🖥️ 真正的桌面级应用**：底层采用 Electron 构建，支持本地文件系统直读、图片快捷管理与离线可用。
- **⚡ 闪电般的响应速度**：告别臃肿，Vite 的加持让应用的启动与开发热更新如丝般顺滑。
- **🛡️ 稳定与高工程化**：内置完整的 Vitest 测试体系和严格的 ESLint 代码规范，为代码健壮性保驾护航。

## 🛠️ 技术栈选型

- **渲染引擎**：React 18+
- **应用骨架**：Electron
- **开发语言**：TypeScript
- **构建工具**：Vite
- **样式方案**：Tailwind CSS / PostCSS
- **测试框架**：Vitest


## 🚀 快速开始
如果你想在本地运行或参与小 A 笔记的开发，请按照以下步骤操作：
1. 环境准备
确保已安装 Node.js (推荐 v18 及以上版本)
建议使用 npm、yarn 或 pnpm。

2. 获取代码
```bash
git clone https://github.com/gvvbj/xiao-a-note.git
cd xiao-a-note
```
3. 安装依赖
```bash
npm install
```
4. 启动开发环境
```bash
# 同时启动 Vite 渲染服务与 Electron 主进程窗口
npm run dev
```
5. 编译打包
```bash
# 构建生产环境代码并生成对应的系统安装包
npm run build
```


