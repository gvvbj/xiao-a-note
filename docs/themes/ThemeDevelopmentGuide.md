# 核心主题开发手册 v2.0 (Ultimate Theme Engine Spec)

本手册是系统视觉定制的最高准则。旨在通过 **CSS 变量注入** 与 **组件样式重塑**，在不触碰内核逻辑的前提下，实现应用气质的彻底改变。

---

## 1. 系统核心识别逻辑 (The Kernel Logic)

### 1.1 后缀决定论 (The Suffix Rule)
系统的编辑器核心及其配套插件根据主题文件名的 **后缀** 来强制设定文字的基本色调：
- **`*-light.css`**: 编辑器进入 **浅色模式**。默认应用黑色文字。
- **`*-dark.css`**: 编辑器进入 **深色模式**。默认应用白色/亮色文字。

> [!IMPORTANT]
> **语法优先级预警**：标题（H1-H6）、加粗（Bold）、斜体（Italic）是核心语法。为了保证阅读底线，这些样式的 CSS 优先级极高。如果你的文件名后缀与背景色不匹配（例如深色背景却用 `-light` 后缀），这些核心文字将因为判定为“浅色模式”而变为黑色，从而在深背景上“消失”。

### 1.2 HSL 颜色协议
为了实现动态透明度和视觉统一，所有颜色变量必须使用 **纯数字 HSL 格式**。
- **规范**：`--variable: H S L;` (如 `210 100% 50%`)
- **优势**：系统会自动将其嵌入 `hsla(var(--variable), alpha)` 模板中，实现磨砂玻璃等高级质感。

---

## 2. 全局 UI 变量清单 (UI Section)

| 变量名 | 对应 UI 区域 | 定制建议 |
| :--- | :--- | :--- |
| `--background` | 应用全局基础底色 | 玻璃主题下通常带 alpha 通道 |
| `--foreground` | 全局基础文字颜色 | 决定了普通段落的颜色 |
| `--primary` | 活动态颜色 | 侧边栏激活项、重点按钮、滚动条 |
| `--border` | 分割线与边框 | 建议使用透明度（如 `0 0% 100% / 0.1`） |
| `--radius` | 圆角弧度 | 推荐 `0.5rem` 或 `12px` |
| `--sidebar-background` | 侧边栏底色 | 与主编辑区产生色阶差 |
| `--popover` | 菜单与浮窗 | 建议调低亮度以产生悬浮感 |

---

## 3. Markdown 排版映射手册 (Typography Mapping)

### 3.1 基础文字与重点 (High Priority)
| 字词示例 | 核心变量 | 技术备注 |
| :--- | :--- | :--- |
| **加粗文字** | `--syntax-bold` | 对应 Markdown: `**text**` |
| *斜体文字* | `--syntax-italic` | 对应 Markdown: `*text*` |
| `[链接名称](url)` | `--syntax-link` | 支持定义独立色彩，建议使用主色调 |

### 3.2 标题系统 (Heading Scopes)
| 级别示例 | 核心变量 | 视觉排版建议 |
| :--- | :--- | :--- |
| `# Heading 1` | `--syntax-h1` | 文档最大标题，建议最亮、最大 |
| `## Heading 2` | `--syntax-h2` | 二级章节标题 |
| `### Heading 3` | `--syntax-h3` | 三级子标题 |
| `#### H4 - H6` | `--syntax-h4` 至 `--syntax-h6` | 低阶标题，颜色可趋向中庸 |

### 3.3 块级装饰 (Block Scopes)
- **引用块 (`> Text`)**:
  - `--syntax-blockquote`: 文字颜色。
  - `--syntax-blockquote-border`: 左侧垂直引导条颜色。
- **列表符号 (`*` / `1.` )**:
  - `--syntax-list-marker`: 序号或圆点的颜色。
- **分割线 (`---`)**:
  - `--syntax-hr`: 线条颜色。

---

## 4. 表格定制规范 (Table System)

表格采用标准化变量控制，确保在不同背景下均有极佳的辨识度。

### 4.1 Markdown 源码参考
```markdown
| 列名称 A | 列名称 B |
| :--- | :--- |
| 数据行 1 | 数据行 2 |
```

### 4.2 对应的色彩变量
- `--table-border`: 所有的内外框线颜色。
- `--table-header-bg`: 顶层表头的背景填充色。
- `--table-header-fg`: 顶层表头的文字颜色。
- `--table-row-hover`: 鼠标悬停在某一行时的背景高亮色。

---

## 5. 代码语法高亮参考 (Code & Syntax)

### 5.1 容器与行内
- **行内代码** (`` `code` ``):
  - `--code-inline-bg`: 背景色。
  - `--code-inline-fg`: 文字色。
- **代码块主体** (` ``` `):
  - 系统默认继承 `--card` 背景，你可以通过选择器进行重塑。

### 5.2 内部语法解析 (Tokens)
| 词法类型 | 核心变量 | 命中的保留字举例 |
| :--- | :--- | :--- |
| **关键字** | `--syntax-code-keyword` | `if`, `class`, `function`, `return` |
| **字符串** | `--syntax-code-string` | `"Content"`, `'Data'` |
| **数值** | `--syntax-code-number` | `1024`, `true`, `false` |
| **注释** | `--syntax-code-comment` | `// Comments` |
| **函数** | `--syntax-code-function`| `onSearch()`, `fetchData` |

---

## 6. ⚠️ 终极红线：布局偏移 Bug (The Pixel-Perfect Rule)

> [!DANGER]
> **严禁在代码块标题 (.cm-codeblock-header) 或 结尾行 (.cm-codeblock-last) 使用 `margin`**。

- **根本原因**：编辑器基于 DOM 节点的 **物理占位高度** 进行逻辑点击计算。`margin` 属于“外补白”，不被 CodeMirror 的测量引擎感知。
- **后果**：这会导致布局在视觉上被撑开了，但逻辑坐标还在原位，造成 **光标点击位置向上偏移**。
- **解决方案**：统一使用 **`padding`** 或 **`height`** 撑开空间。

---

## 7. 进阶：如何实现极致视觉效果 (High-End Paradigms)

### 7.1 毛玻璃层叠 (Layered Glass)
利用选择器针对性覆盖，开启背景模糊：
```css
[data-theme="glass-demo"] .cm-codeblock-header {
  background-color: hsla(0, 0%, 100%, 0.1) !important;
  backdrop-filter: blur(24px) !important;
}
```

### 7.2 动态渐变注入
在 `body::before` 中定义复杂的 Mesh Gradient 动画或静态背景。

---
*Last Updated: 2026-02-07*
