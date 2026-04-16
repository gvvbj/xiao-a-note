import { Facet } from '@codemirror/state';

/**
 * FacetBridge
 *
 * 说明：
 * - 契约层不直接依赖具体引擎包时，可通过该桥接创建当前默认引擎的 Facet。
 * - 当前实现仍落在 CodeMirror，后续可在引擎插件化阶段替换桥接实现。
 */
export function createEngineFacet<TInput, TOutput>(spec: {
    combine: (values: readonly TInput[]) => TOutput;
}): Facet<TInput, TOutput> {
    return Facet.define<TInput, TOutput>(spec);
}
