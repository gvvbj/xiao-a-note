# UI 主题设计文档 (UI Theme Design)

## 1. 设计概述 (Overview)
`xiao-a-note` 采用了 **"Deep Space Glass Fusion" (深空微光)** 设计语言。
该设计融合了 macOS 的通透感与现代科幻界面的霓虹点缀，旨在提供一个既高沉浸又具备呼吸感的写作环境。

### 核心特性
- **透明窗口 (Vibrancy)**: 利用 Electron 的 Mica/Acrylic 材质，使应用背景能够透出桌面壁纸的色彩，打破应用与系统的边界。
- **全屏通透 (Full-screen Immersion)**: 移除了多余的边框和背景遮罩，编辑器直接悬浮于毛玻璃之上。
- **电光点缀 (Electric Accents)**: 使用蓝紫渐变 (`#4f46e5` -> `#a855f7`) 作为视觉焦点，提升现代感。
- **高级排版**: 引入 **Inter** 字体，优化阅读体验。

## 2. 样式字典 (Style Dictionary)

### CSS 变量 (`themes/glass-fusion.css`)

| 变量名 | 默认值 | 描述 |
| :--- | :--- | :--- |
| `--bg-glass` | `rgba(20, 20, 25, 0.60)` | 主窗口背景遮罩，控制整体变暗程度 |
| `--bg-sidebar` | `rgba(30, 30, 35, 0.30)` | 侧边栏背景，比主区域更通透 |
| `--color-accent-start` | `#4f46e5` | 渐变色起始值 (Indigo) |
| `--color-accent-end` | `#a855f7` | 渐变色结束值 (Purple) |
| `--border-glass` | `rgba(255, 255, 255, 0.08)` | 极细微的分割线 |

### Tailwind 扩展类 (`tailwind.config.js`)

我们扩展了 `glass` 命名空间，可以直接使用：

- `bg-glass-bg`: 引用 `--bg-glass`
- `bg-glass-sidebar`: 引用 `--bg-sidebar`
- `border-glass-border`: 引用 `--border-glass`
- `from-glass-accent-start`: 渐变起始
- `to-glass-accent-end`: 渐变结束

**示例用法**:
```tsx
<div className="bg-gradient-to-r from-glass-accent-start to-glass-accent-end text-white">
  高亮按钮
</div>
```

## 3. 组件规范

### 侧边栏 (Sidebar)
- 必须使用 `bg-glass-sidebar`。
- 选中项使用圆角胶囊样式 (`rounded-md bg-gradient-to-r ...`)。
- 避免使用实线边框，尽量使用 `backdrop-blur` 或透明度区分层级。

### 编辑器 (Note Editor)
- 背景必须设为 `bg-transparent`。
- 顶部通过 `bg-glass-bg` + `backdrop-blur` 来保证滚动时标题栏的可读性。

## 4. 兼容性说明
- **Windows 11**: 完美支持 Mica 特效。
- **Windows 10**: 支持 Acrylic 特效（如果开启）。
- **Windows 7/8**: 自动回退（Electron 默认行为），可能显示为黑色背景。建议用户使用 Win10+ 以获得最佳体验。
