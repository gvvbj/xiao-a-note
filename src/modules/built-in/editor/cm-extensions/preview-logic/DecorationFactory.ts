import { Decoration } from "@codemirror/view";
import { Range } from "@codemirror/state";
import { SyntaxNodeRef } from "@lezer/common";
import { IDecorationContext, MarkdownDecorationRegistry, IDecorationResult } from "../../registries/MarkdownDecorationRegistry";
import { IsolatedFrameWidget } from "../../components/IsolatedFrameWidget";
import { loggerService } from '@/kernel/services/LoggerService';

const logger = loggerService.createLogger('DecorationFactory');

/**
 * 预览工厂 - 负责将语法树节点转换为装饰器 (解耦版)
 * 该工厂不再包含具体的 Widget 逻辑，而是作为分发器查询注册表。
 */
export class DecorationFactory {
    /**
     * 根据注册表处理节点
     */
    static handleNode(
        node: SyntaxNodeRef,
        context: IDecorationContext,
        registry: MarkdownDecorationRegistry
    ): IDecorationResult {
        const decorations: Range<Decoration>[] = [];
        let shouldSkipChildren = false;

        const { state } = context;
        // 仅在控制台保留最低限度的分发路径日志

        // 1. 优先检查隔离渲染提供者 (Phase 14: Hard Isolation)
        const isolatedProviders = registry.getIsolatedProvidersForType(node.name);

        if (isolatedProviders.length > 0) {

            for (let i = 0; i < isolatedProviders.length; i++) {
                const provider = isolatedProviders[i];
                try {
                    // 核心分发逻辑：
                    // 内核不再强制执行“进入即回退”原则，主权下放给插件提供者。
                    // 插件通过 getPayload(node, context) 接收 context.isLineActive，自定决策。

                    // 执行状态获取
                    const payload = provider.getPayload(node, context);

                    if (payload) {
                        return {
                            decorations: [Decoration.replace({
                                widget: new IsolatedFrameWidget(payload, node.name),
                                block: true
                            }).range(node.from, node.to)],
                            shouldSkipChildren: true
                        };
                    } else {
                        // console.debug(`[DecorationFactory] Provider #${i} skipped ${node.name}`);
                    }
                } catch (e) {
                    logger.error('Isolated provider failed', e);
                }
            }
        }

        // 2. 降级到传统提供者 (Tier 0 / Tier 1)
        const providers = registry.getProvidersForType(node.name);
        if (providers.length === 0) return { decorations: [], shouldSkipChildren };

        for (const provider of providers) {
            try {
                const result = provider.render(node, context);
                if (!result) continue;

                if (Array.isArray(result)) {
                    if (result.length > 0) decorations.push(...result);
                } else {
                    if (result.decorations.length > 0) decorations.push(...result.decorations);
                    if (result.shouldSkipChildren) shouldSkipChildren = true;
                }
            } catch (e) {
                logger.error(`Provider ${provider.constructor.name || 'Anonymous'} failed for node ${node.name}`, e);
            }
        }
        return { decorations, shouldSkipChildren };
    }
}
