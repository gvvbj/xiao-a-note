import { EditorView, Decoration } from '@codemirror/view';
import { IPlugin, PluginCategory, IPluginContext } from '@/kernel/system/plugin/types';
import { ImageIcon } from 'lucide-react';
import { EditorEvents } from '../../../../constants/EditorEvents';
import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';
import type { Kernel } from '@/kernel/core/Kernel';
import { ImageWidget } from './services/ImageService';
import { IMAGE_PLUGIN_CSS } from './styles/ImageStyles';
import { ImageController } from './services/ImageController';
import { AssetTransformer } from './services/AssetTransformer';
import { ImagePreviewModal } from './components/ImagePreviewModal';
import { UISlotId } from '@/kernel/core/Constants';

/**
 * 图片支持插件
 * 
 * 重构后的纯 wiring 入口
 * 
 * 职责：
 * 1. 提供图片插入命令和工具栏
 * 2. 处理图片粘贴
 * 3. 渲染图片装饰器
 * 
 * 遵循原则:
 * - Plugin-First: 业务逻辑在 ImageController
 * - 0 硬编码: Widget 在 services/ImageService
 */
export default class ImagePlugin implements IPlugin {
    id = 'image-support';
    name = 'Image Support';
    version = '1.1.0';
    category = PluginCategory.EDITOR;
    internal = true;

    // 懒加载配置
    lazy = true;
    activationTrigger = {
        type: 'syntax' as const,
        pattern: /!\[/  // 匹配 Markdown 图片标志
    };

    // 自动休眠超时 (15分钟)
    hibernationTimeout = 900000;

    // 静态 UI 定义（懒加载占位，PluginManager 代理 onClick 先激活再执行）
    staticToolbarItems = [{
        id: 'Image',
        label: '图片',
        icon: ImageIcon,
        type: 'button' as const,
        group: 'insert' as const,
        order: 52,
        onClick: () => {
            // PluginManager 代理流程: activateLazyPlugin → activate() → 注册 handleTrigger
            // 此时 handleTrigger 已就绪，emit 事件即可触发文件选择
            this._kernel?.emit(EditorEvents.TRIGGER_IMAGE_UPLOAD);
        }
    }];

    private _kernel?: Kernel;
    private controller?: ImageController;
    private cleanups: (() => void)[] = [];

    activate(context: IPluginContext) {
        // 保存 kernel 引用，供 staticToolbarItems.onClick 使用
        this._kernel = context.kernel;

        // 注册弹窗
        context.registerUI(UISlotId.EDITOR_MODALS, { id: 'image-preview', component: ImagePreviewModal });

        // 初始化控制器
        this.controller = new ImageController(context.kernel);

        // 注册 AssetTransformer 服务 (通过 context 注册，确保 dispose 追踪)
        const assetTransformer = new AssetTransformer(context.kernel);
        context.registerService(ServiceId.ASSET_TRANSFORMER, assetTransformer);

        // 注册样式
        context.registerStyle('image', IMAGE_PLUGIN_CSS);

        // 创建隐藏的文件输入器 (自管理，不依赖 EditorToolbar)
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);

        const controller = this.controller;

        fileInput.addEventListener('change', async (e) => {
            const input = e.target as HTMLInputElement;
            const file = input.files?.[0];
            if (file) {
                // 从 DOM 获取当前活跃的 EditorView
                const cmDom = document.querySelector('.cm-editor');
                const view = cmDom ? EditorView.findFromDOM(cmDom as HTMLElement) : null;
                if (view) {
                    controller.insertImage(view, file);
                }
            }
            input.value = ''; // 清空以便再次选择同一文件
        });

        // 监听 Kernel 事件 (替代 window CustomEvent)
        const handleTrigger = () => fileInput.click();
        context.kernel.on(EditorEvents.TRIGGER_IMAGE_UPLOAD, handleTrigger);

        // 清理回调
        this.cleanups.push(() => {
            context.kernel.off(EditorEvents.TRIGGER_IMAGE_UPLOAD, handleTrigger);
            if (document.body.contains(fileInput)) {
                document.body.removeChild(fileInput);
            }
        });

        // 2. 注册 INSERT_IMAGE 命令 (调用 Controller)
        context.registerCommand({
            id: 'INSERT_IMAGE',
            title: '插入图片',
            category: '编辑器',
            handler: (view: EditorView, params: unknown) => {
                if (params instanceof File) {
                    controller.insertImage(view, params);
                } else if (typeof params === 'string') {
                    controller.insertImageUrl(view, params);
                }
            }
        });

        // 3. 粘贴处理器 (调用 Controller)
        context.registerEditorExtension(EditorView.domEventHandlers({
            paste: (event, view) => controller.handlePaste(event, view)
        }));

        // 4. 装饰器提供器
        const onPreview = (src: string) => {
            context.kernel.emit(CoreEvents.PREVIEW_IMAGE, { src });
        };

        context.registerMarkdownDecorationProvider({
            nodeTypes: ['Image'],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            render: (node, { state, isRangeActive, basePath }: { state: any, isRangeActive: any, basePath: any }) => {
                const { from, to } = node;
                if (isRangeActive(from, to)) {
                    return [Decoration.mark({ class: "cm-md-mark" }).range(from, to)];
                }
                const text = state.sliceDoc(from, to);
                const imgMatch = /!\[(.*?)(?:\|(\d+))?\]\((.*?)\)/.exec(text);
                if (imgMatch) {
                    return [Decoration.replace({
                        widget: new ImageWidget(imgMatch[3], imgMatch[1], imgMatch[2], basePath, onPreview)
                    }).range(from, to)];
                }
                return [];
            }
        });
    }

    deactivate(): void {
        this.cleanups.forEach(fn => fn());
        this.cleanups = [];
    }
}
