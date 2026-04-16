import { EditorView } from '@codemirror/view';
import { Extension } from '@codemirror/state';

/**
 * 创建动态主题适配器
 * 
 * 核心逻辑：
 * 1. 设置编辑器主背景为 transparent，让底层 CSS 背景透上来
 * 2. 使用 var(--foreground) 等 CSS 变量配置基础颜色
 * 3. 这里的 syntaxHighlighting 仍然使用 JS 定义的颜色，但可以微调以适应 CSS 变量
 */
export const createDynamicTheme = (isDark: boolean): Extension[] => {

    // 基础编辑器样式（布局、背景、光标）
    const theme = EditorView.theme({
        "&": {
            color: "hsl(var(--editor-foreground, var(--foreground)))",
            backgroundColor: "transparent", // 关键：透明背景
        },
        ".cm-content": {
            color: "hsl(var(--editor-foreground, var(--foreground)))",
            caretColor: "hsl(var(--primary))",
            fontFamily: "var(--font-family, 'Segoe UI', system-ui, sans-serif)",
            paddingBottom: "50vh", // [优化] 提供超卷空间，确保末尾内容能滚动到视口中心
        },
        ".cm-line": {
            color: "inherit", // 继承 cm-content 的颜色
        },
        "&.cm-focused .cm-cursor": {
            borderLeftColor: "hsl(var(--primary))"
        },
        "&.cm-focused .cm-selectionBackground, ::selection": {
            backgroundColor: "hsla(var(--primary), 0.2)", // 使用系统主色调，加透明度
        },
        ".cm-gutters": {
            backgroundColor: "transparent", // 行号区域透明
            color: "hsl(var(--muted-foreground))", // 行号颜色
            borderRight: "1px solid transparent", // 去除分割线，显得更现代
        },
        ".cm-activeLineGutter": {
            backgroundColor: "hsla(var(--muted), 0.4)",
            color: "hsl(var(--foreground))",
        },
        ".cm-activeLine": {
            backgroundColor: "hsla(var(--muted), 0.2)", // 当前行高亮
        },

        // 搜索匹配高亮（所有匹配项 + 当前定位项）
        ".cm-searchMatch": {
            backgroundColor: "hsl(var(--search-match-bg, 48 96% 53%) / 0.35)",
            outline: "1px solid hsl(var(--search-match-bg, 48 96% 53%) / 0.6)",
            borderRadius: "2px"
        },
        ".cm-searchMatch.cm-searchMatch-selected": {
            backgroundColor: "hsl(var(--search-match-active-bg, 25 95% 53%) / 0.6)",
            outline: "2px solid hsl(var(--search-match-active-bg, 25 95% 53%) / 0.8)",
            borderRadius: "2px"
        }
    }, { dark: isDark });

    // 语法高亮 (Syntax Highlighting)
    // 这里我们定义一套通用的高亮规则，尽量使用 CSS 变量或硬编码的通用色
    // 如果需要完全跟随主题，这里的工作量会非常大（需要映射所有 tag 到 variable）。
    // 作为折衷，我们使用一套较为中性的高亮方案，或者根据 isDark 分别返回 githubLight/oneDark 的高亮部分

    // 简单起见，我们暂时手动定义一个中性高亮，或者直接沿用外部传入的 highlightStyle
    // 但为了演示“动态性”，我们这里定义一个基于变量的简单高亮（可选）
    // 目前 CodeMirrorEditor 还是会传入 basicSetup，里面可能包含 highlight。
    // 我们主要负责把“容器”变透明。

    return [theme];
};
