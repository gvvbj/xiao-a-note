/**
 * BlockModeManager - 交互式块三态管理器
 *
 * 从 HTML Preview 插件的 HtmlRenderService.blockModes 抽取而来。
 * 为所有需要源码/预览切换的块提供统一的模式管理。
 *
 * 使用场景：
 *   - Mermaid 图表块
 *   - HTML Preview 块
 *   - 未来的交互式块插件
 */

import { BlockMode } from './types';

/**
 * 块模式管理器
 * 维护每个块的三态（auto/source/preview），提供统一的 shouldRender 判断
 */
export class BlockModeManager {
    /** 块状态映射 (Pos -> Mode) */
    private blockModes = new Map<number, BlockMode>();

    /**
     * 设置指定块的模式
     * @param pos 块的文档起始位置
     * @param mode 目标模式
     */
    setMode(pos: number, mode: BlockMode): void {
        this.blockModes.set(pos, mode);
    }

    /**
     * 获取指定块的模式
     * @param pos 块的文档起始位置
     * @returns 当前模式（默认 auto）
     */
    getMode(pos: number): BlockMode {
        return this.blockModes.get(pos) || 'auto';
    }

    /**
     * 判断指定块是否应该渲染预览
     *
     * 规则：
     *   - preview 模式：总是渲染
     *   - source 模式：从不渲染
     *   - auto 模式：光标不在块区域内时渲染（两端都不活跃）
     *
     * @param pos 块的文档起始位置
     * @param from 块的起始偏移
     * @param to 块的结束偏移
     * @param isLineActive 判断某行是否有光标活跃
     */
    shouldRender(
        pos: number,
        from: number,
        to: number,
        isLineActive: (offset: number) => boolean
    ): boolean {
        const mode = this.getMode(pos);

        if (mode === 'preview') return true;
        if (mode === 'source') return false;

        // auto 模式：两端任一活跃则回退为源码
        return !(isLineActive(from) || isLineActive(to));
    }

    /**
     * 清除指定位置的模式记录
     */
    clearMode(pos: number): void {
        this.blockModes.delete(pos);
    }

    /**
     * 清除所有模式记录
     */
    clearAll(): void {
        this.blockModes.clear();
    }
}
