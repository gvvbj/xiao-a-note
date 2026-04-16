import { CoreEvents } from '@/kernel/core/Events';
import { ServiceId } from '@/kernel/core/ServiceId';

export const SANDBOX_ALLOWED_SERVICES: readonly string[] = [
    ServiceId.LOGGER,
    ServiceId.WORKSPACE,
] as const;

export const SANDBOX_PROXIED_SERVICES: readonly string[] = [
    ServiceId.FILE_SYSTEM,
    ServiceId.EDITOR,
] as const;

export const SANDBOX_DENIED_SERVICES: Record<string, string> = {
    [ServiceId.TAB]: '请使用 context.emit() 事件方式代替直接操作标签页',
    [ServiceId.SETTINGS]: '扩展插件不允许修改全局设置',
    [ServiceId.PLUGIN_MANAGER]: '扩展插件不允许控制其他插件的生命周期',
    [ServiceId.THEME]: '扩展插件不允许切换全局主题',
    [ServiceId.MENU]: '扩展插件不允许修改应用菜单',
    [ServiceId.LAYOUT]: '扩展插件不允许修改全局布局',
} as const;

export const SANDBOX_ALLOWED_EVENTS: readonly string[] = [
    CoreEvents.EDITOR_REQUEST_REFRESH,
    CoreEvents.DOCUMENT_CHANGED,
    CoreEvents.CURSOR_ACTIVITY,
    CoreEvents.TOOLBAR_STATE_CHANGED,
] as const;

export const SANDBOX_FS_ALLOWED_METHODS: readonly string[] = [
    'readFile',
    'readDirectoryTree',
    'pathJoin',
    'saveFile',
    'checkExists',
    'getBasename',
    'getDirname',
] as const;

export const SANDBOX_EDITOR_ALLOWED_METHODS: readonly string[] = [
    'getState',
    'getCurrentContent',
    'getEditorView',
    'getSelection',
] as const;
