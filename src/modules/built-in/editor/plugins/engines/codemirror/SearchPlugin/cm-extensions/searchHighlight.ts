import { StateEffect, StateField } from '@codemirror/state';
import { EditorView, Decoration, DecorationSet } from '@codemirror/view';

// ─── 全匹配高亮 ────────────────────────────────────────────
// 用于高亮所有搜索结果（黄色/金色背景，由 CSS 变量控制）

/** 设置所有匹配项位置的 Effect */
export const setAllMatchesEffect = StateEffect.define<{ from: number, to: number }[]>();

const allMatchMark = Decoration.mark({ class: "cm-searchMatch" });

/**
 * allMatchesField — 管理所有搜索匹配项的高亮装饰
 * 
 * 通过 setAllMatchesEffect 接收匹配位置数组，
 * 为每个位置创建 .cm-searchMatch 装饰。
 * 样式由 CSS 变量 --search-match-bg 控制，零硬编码。
 */
export const allMatchesField = StateField.define<DecorationSet>({
    create() {
        return Decoration.none;
    },
    update(underlying, tr) {
        let deco = underlying.map(tr.changes);
        for (const effect of tr.effects) {
            if (effect.is(setAllMatchesEffect)) {
                const matches = effect.value;
                if (matches.length > 0) {
                    // Decoration.set 要求按 from 升序排列
                    const sorted = [...matches].sort((a, b) => a.from - b.from);
                    deco = Decoration.set(
                        sorted.map(m => allMatchMark.range(m.from, m.to))
                    );
                } else {
                    deco = Decoration.none;
                }
            }
        }
        return deco;
    },
    provide: f => EditorView.decorations.from(f)
});

// ─── 当前匹配高亮 ──────────────────────────────────────────
// 用于高亮当前定位的搜索结果（橙色背景，由 CSS 变量控制）

/** 设置当前选中匹配项位置的 Effect */
export const setActiveMatchEffect = StateEffect.define<{ from: number, to: number } | null>();

const activeMatchMark = Decoration.mark({ class: "cm-searchMatch-selected" });

/**
 * activeMatchField — 管理当前定位匹配项的高亮装饰
 * 
 * 通过 setActiveMatchEffect 接收当前匹配位置，
 * 创建 .cm-searchMatch-selected 装饰以区分当前项。
 * 样式由 CSS 变量 --search-match-active-bg 控制，零硬编码。
 */
export const activeMatchField = StateField.define<DecorationSet>({
    create() {
        return Decoration.none;
    },
    update(underlying, tr) {
        let deco = underlying.map(tr.changes);
        for (const effect of tr.effects) {
            if (effect.is(setActiveMatchEffect)) {
                if (effect.value) {
                    deco = Decoration.set([
                        activeMatchMark.range(effect.value.from, effect.value.to)
                    ]);
                } else {
                    deco = Decoration.none;
                }
            }
        }
        return deco;
    },
    provide: f => EditorView.decorations.from(f)
});
