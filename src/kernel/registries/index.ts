/**
 * Registry 统一导出
 * 
 * 合并原 kernel/registry 与 kernel/registries 目录
 * 所有 Registry 类型从此处统一导出
 */

export { AppRegistry } from './AppRegistry';
export { MarkdownPluginRegistry, type IMarkdownPlugin } from './MarkdownPluginRegistry';
export { CommandRegistry, type CommandHandler } from './CommandRegistry';
export { EditorExtensionRegistry } from './EditorExtensionRegistry';
export { EditorPanelRegistry, type IEditorPanel } from './EditorPanelRegistry';
export { ShortcutRegistry, type IShortcutItem, type ShortcutGroup } from './ShortcutRegistry';
export {
    MarkdownDecorationRegistry,
    type IDecorationContext,
    type IDecorationResult,
    type IDecorationProvider,
    type IIsolatedProvider
} from './MarkdownDecorationRegistry';
