import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { Range, StateField, StateEffect, EditorState } from "@codemirror/state";
import { syntaxTree, ensureSyntaxTree } from "@codemirror/language";
import { DecorationFactory } from "./preview-logic/DecorationFactory";
import { viewModeFacet, basePathFacet, decorationRegistryFacet } from "../constants/Facets";
import { IFrameBridge } from "../utils/IFrameBridge";
import { loggerService } from '@/kernel/services/LoggerService';
import type { IDecorationContext } from '@/kernel/interfaces/editor-types';

const logger = loggerService.createLogger('LivePreview');

type ReplaceDecorationLike = {
    widget?: unknown;
    spec?: { widget?: unknown };
};

const forceRefreshEffect = StateEffect.define<null>();

/**
 * 核心逻辑：基于 state 构建装饰器集
 */
function buildDecorations(state: EditorState, view?: EditorView): DecorationSet {
    const registry = state.facet(decorationRegistryFacet);
    const basePath = state.facet(basePathFacet);
    const viewMode = state.facet(viewModeFacet);

    // 关键修复：如果是源码模式，不进行任何装饰
    if (viewMode === 'source' || !registry) {
        return Decoration.none;
    }

    const builder: Range<Decoration>[] = [];
    const ranges = state.selection.ranges;
    const docLength = state.doc.length;

    // 尽量获取异步解析好的语法树
    const tree = ensureSyntaxTree(state, Math.min(docLength, 100000), 100) || syntaxTree(state);

    const isRangeActive = (from: number, to: number) => ranges.some(r => r.to >= from && r.from <= to);
    const isLineActive = (from: number) => {
        try {
            // 核心交互改进：语义化意图避让 (Semantic Pulse)
            // 只要全局存在活跃的 IFrame 交互脉冲（由 IFrameBridge 捕获），则在此刻锁定预览
            // 这解决了焦点抢占导致的 activeElement 不可靠问题
            if (IFrameBridge.hasGlobalInteractionPulse()) {
                return false;
            }

            const line = state.doc.lineAt(from);
            return ranges.some(r => r.head >= line.from && r.head <= line.to);
        } catch { return false; }
    };

    // context 不再强制依赖 view (部分 Widget 构建可能需要，设为可选)
    const context: IDecorationContext = {
        state,
        view: (view ?? undefined) as unknown as EditorView,
        isRangeActive,
        isLineActive,
        basePath
    };

    // 追踪物理替换装饰器的结束位置
    // 如果一个区域已经被 Replace 装饰器占据，其内部的子节点装饰通常是不被允许或无意义的
    let activeReplaceEnd = -1;

    tree.iterate({
        enter: (node) => {
            const { name: type, from, to } = node;
            // 0. 碰撞检测
            // 如果当前节点起始点已被物理替换拦截，则跳过该分支
            if (from < activeReplaceEnd) return false;

            // 1. 动态分发
            const result = DecorationFactory.handleNode(node, context, registry);

            if (result.decorations.length > 0) {
                result.decorations.forEach(deco => {
                    if (deco.from >= 0 && deco.to <= docLength && deco.from <= deco.to) {
                        builder.push(deco);

                        // 判定如果是 Replace 装饰器 (Widget 或彻底替换)，则更新拦截游标
                        // 在 CM6 中，Decoration.replace 生成的对象具有 .widget 或 spec.widget 属性
                        const decoValue = deco.value as ReplaceDecorationLike;
                        if (decoValue.widget || decoValue.spec?.widget) {
                            if (deco.to > activeReplaceEnd) activeReplaceEnd = deco.to;
                        }
                    }
                });
            }

            // 2. 接管协议
            if (result.shouldSkipChildren) {
                return false;
            }
        }
    });

    try {
        // 关键：必须排序并合并
        return Decoration.set(builder.sort((a, b) => a.from - b.from), true);
    } catch (e) {
        logger.error('Decoration set failed', e);
        return Decoration.none;
    }
}

/**
 * StateField 是 CM6 推荐的装饰器持有者。
 * 它能够安全地映射 (map) 文档变更，并且支持 block 装饰器。
 */
export const livePreviewStateField = StateField.define<DecorationSet>({
    create(state) {
        return buildDecorations(state);
    },
    update(decorations, tr) {
        // 如果文档、选区或 Facet 变更，重新构建
        if (tr.docChanged || tr.selection || tr.effects.some(e => e.is(forceRefreshEffect)) ||
            tr.reconfigured) {
            return buildDecorations(tr.state);
        }
        // 否则仅执行位置映射
        return decorations.map(tr.changes);
    },
    provide: f => EditorView.decorations.from(f)
});

/**
 * 语法树观察哨。
 * 当 Lezer 异步解析出更多节点时，触发 StateField 重绘。
 */
const syntaxWatchPlugin = ViewPlugin.fromClass(class {
    private lastTreeLen = 0;

    update(update: ViewUpdate) {
        const treeLen = syntaxTree(update.state).length;
        if (treeLen !== this.lastTreeLen) {
            this.lastTreeLen = treeLen;
            // 关键修复：绝对不能在 update 中同步 dispatch
            // 使用 requestAnimationFrame 避开当前更新周期
            requestAnimationFrame(() => {
                if (update.view.dom) { // 确保 view 仍然挂载
                    update.view.dispatch({
                        effects: forceRefreshEffect.of(null)
                    });
                }
            });
        }
    }
});

export const createLivePreview = () => [livePreviewStateField, syntaxWatchPlugin];
export { forceRefreshEffect };
