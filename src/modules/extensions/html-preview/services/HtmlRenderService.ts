import { SyntaxNodeRef } from "@lezer/common";
import { syntaxTree } from "@codemirror/language";
import { IDecorationContext, IDecorationResult } from "@/kernel/interfaces/editor-types";
import { IIsolatedRenderPayload } from "@/kernel/system/plugin/types";
import { EditorState, RangeSet, Range } from "@codemirror/state";
import { Decoration } from "@codemirror/view";
import {
    BlockModeManager,
    getCockpitHtmlForIFrame,
    COCKPIT_STYLES,
    CopyButtonWidget,
    BlockMode
} from "@/shared/interactive-block";
import { getVfsScript } from "../templates/VfsScript";
import { getModeChangeScript } from "../templates/ModeChangeScript";

/**
 * HTML 渲染服务 (重构版 - 使用共享交互式块基础设施)
 * 职责：计算渲染状态，填充 Payload，不含具体 UI 定义
 */
export class HtmlRenderService {
    /** 使用共享 BlockModeManager 替代内部 blockModes */
    private modeManager = new BlockModeManager();

    constructor(
        private readonly onSetMode?: (pos: number, mode: string) => void
    ) { }

    getPayload(node: SyntaxNodeRef, context: IDecorationContext): IIsolatedRenderPayload | null {
        const { state, isLineActive } = context;
        const { from, to } = node;

        // 1. 使用共享 shouldRender 逻辑
        const shouldRender = this.modeManager.shouldRender(from, from, to, isLineActive);
        if (!shouldRender) return null;

        // 2. 语言校验
        const firstLine = state.doc.lineAt(from);
        const firstLineText = firstLine.text;
        if (!firstLineText.startsWith('```html-preview')) return null;

        // 3. 提取内容
        const content = state.sliceDoc(from, to);
        const lines = content.split('\n');
        if (lines.length < 2) return null;
        const codeContent = lines.slice(1, lines.length - 1).join('\n');

        // 4. 获取当前模式用于 Cockpit
        const mode = this.modeManager.getMode(from);

        // 5. 组装 Payload（使用共享 Cockpit 模板）
        return {
            html: `
                ${getCockpitHtmlForIFrame({ from, mode, badge: 'HTML Preview' })}
                <div class="content-wrapper">${codeContent.trim()}</div>
            `,
            css: COCKPIT_STYLES,
            scripts: [getVfsScript(), getModeChangeScript()]
        };
    }

    /**
     * 设置特定块的运行模式（委托给共享 BlockModeManager）
     */
    setMode(pos: number, mode: BlockMode | string) {
        this.modeManager.setMode(pos, mode as BlockMode);
    }

    /**
     * 获取原子化范围集 (供编辑器扩展使用)
     */
    getAtomicRanges(state: EditorState): RangeSet<any> {
        const builder: Range<any>[] = [];
        syntaxTree(state).iterate({
            enter: (node) => {
                if (node.name === 'FencedCode' && this.modeManager.getMode(node.from) === 'preview') {
                    builder.push(Decoration.replace({}).range(node.from, node.to));
                }
            }
        });
        return RangeSet.of(builder.sort((a, b) => a.from - b.from));
    }

    /**
     * 获取源码态复制挂件（使用共享 CopyButtonWidget）
     */
    getCopyDecoration(node: SyntaxNodeRef, context: IDecorationContext): IDecorationResult {
        const { from, to } = node;
        const { state } = context;

        // 如果正在渲染预览，则不提供复制逻辑
        if (this.getPayload(node, context)) return { decorations: [] };

        const content = state.sliceDoc(from, to);
        const lines = content.split('\n');
        // 校验是否为 html-preview 块
        if (!lines[0]?.startsWith('```html-preview')) return { decorations: [] };

        const codeOnly = lines.slice(1, lines.length - 1).join('\n');

        return {
            decorations: [
                Decoration.widget({
                    widget: new CopyButtonWidget({
                        code: codeOnly,
                        pos: from,
                        onSetMode: this.onSetMode
                    }),
                    side: -1,
                    block: true
                }).range(from)
            ]
        };
    }
}
