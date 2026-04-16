import { EditorView } from "@codemirror/view";
import { IPlugin, PluginCategory, IPluginContext } from '@/kernel/system/plugin/types';
import { ServiceId } from '@/kernel/core/ServiceId';
import { createLivePreview } from '../../../../cm-extensions/livePreview';
import { decorationRegistryFacet } from '../../../../constants/Facets';
import { MarkdownDecorationRegistry } from '../../../../registries/MarkdownDecorationRegistry';
import { handleLinkClick } from './services/LinkClickHandler';

/**
 * 实时预览插件
 * 负责渲染 Markdown 语法的视觉增强（如图片预览、表格美化、数学公式等）
 * 该插件现在完全"灯光驱动"：它根据舞台（CodeMirrorEditor）提供的 Facets 信号自动切换渲染模式
 * 
 * 注意：本文件仅负责注册，链接点击逻辑在 services/LinkClickHandler.ts
 */
export default class PreviewPlugin implements IPlugin {
    id = 'preview';
    readonly name = 'Live Preview';
    readonly category = PluginCategory.CORE;
    readonly internal = true;
    readonly description = 'Handles complex live preview rendering (Mermaid, etc).';
    version = '1.0.0';
    readonly essential = true;

    activate(context: IPluginContext) {
        // 1. 获取装饰注册表并注入 Facet
        const registry = context.kernel.getService<MarkdownDecorationRegistry>(ServiceId.MARKDOWN_DECORATION_REGISTRY, false);
        if (registry) {
            context.registerEditorExtension(decorationRegistryFacet.of(registry));
        }

        // 2. 注册基础增强扩展
        context.registerEditorExtension(createLivePreview());

        // 3. 注册交互处理 (逻辑已抽离到 services/)
        context.registerEditorExtension(EditorView.domEventHandlers({
            click: handleLinkClick
        }));
    }

    deactivate() {
        // 插件停用时的逻辑由 registerEditorExtension 返回的销毁函数自动处理
    }
}
