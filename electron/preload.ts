import { contextBridge, ipcRenderer, webUtils } from 'electron';
import {
  AI_CONFIG_CHANNELS,
  AI_CHANNELS,
  CORE_CHANNELS,
  EXPORT_CHANNELS,
  IMAGE_CHANNELS,
  LOGGER_CHANNELS,
  PLUGIN_CHANNELS,
} from './constants/channels';

type IpcCallback<T> = (payload: T) => void;

function subscribeChannel<T>(channel: string, callback: IpcCallback<T>) {
  const listener = (_event: unknown, payload: T) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

const fsAPI = {
  openDirectory: () => ipcRenderer.invoke(CORE_CHANNELS.DIALOG_OPEN_DIRECTORY),
  openFile: () => ipcRenderer.invoke(CORE_CHANNELS.DIALOG_OPEN_FILE),
  readDirectoryTree: (path: string) => ipcRenderer.invoke(CORE_CHANNELS.FS_READ_DIRECTORY_TREE, path),
  showSaveDialog: (options: unknown) => ipcRenderer.invoke(CORE_CHANNELS.DIALOG_SHOW_SAVE, options),
  readDir: (path: string) => ipcRenderer.invoke('fs:readDir', path),
  readFile: (path: string) => ipcRenderer.invoke(CORE_CHANNELS.FS_READ_FILE, path),
  writeFile: (path: string, content: string) => ipcRenderer.invoke(CORE_CHANNELS.FS_WRITE_FILE, path, content),
  createFile: (path: string, content: string) => ipcRenderer.invoke(CORE_CHANNELS.FS_CREATE_FILE, path, content),
  createDirectory: (path: string) => ipcRenderer.invoke(CORE_CHANNELS.FS_CREATE_DIRECTORY, path),
  rename: (oldPath: string, newPath: string) => ipcRenderer.invoke(CORE_CHANNELS.FS_RENAME, oldPath, newPath),
  delete: (path: string, moveToTrash: boolean) => ipcRenderer.invoke(CORE_CHANNELS.FS_DELETE, path, moveToTrash),
  move: (srcPath: string, destPath: string) => ipcRenderer.invoke(CORE_CHANNELS.FS_MOVE, srcPath, destPath),
  copy: (srcPath: string, destPath: string) => ipcRenderer.invoke(CORE_CHANNELS.FS_COPY, srcPath, destPath),
  checkExists: (path: string) => ipcRenderer.invoke(CORE_CHANNELS.FS_CHECK_EXISTS, path),
  showItemInFolder: (path: string) => ipcRenderer.invoke(CORE_CHANNELS.FS_SHOW_IN_FOLDER, path),
  getAllMarkdownFiles: (dirPath: string) => ipcRenderer.invoke(CORE_CHANNELS.FS_GET_ALL_MARKDOWN, dirPath),
  getUserDataPath: () => ipcRenderer.invoke(CORE_CHANNELS.PATH_USER_DATA),
  saveImage: (dir: string, buffer: ArrayBuffer, name: string) => ipcRenderer.invoke(IMAGE_CHANNELS.FS_SAVE_IMAGE, dir, buffer, name),
  saveTempImage: (buffer: ArrayBuffer, name: string) => ipcRenderer.invoke(IMAGE_CHANNELS.FS_SAVE_TEMP_IMAGE, buffer, name),
  getFilePath: (file: File) => webUtils.getPathForFile(file),
  watch: (path: string) => ipcRenderer.invoke(CORE_CHANNELS.FS_WATCH, path),
  onWatchEvent: (callback: IpcCallback<{ eventType: string; filename: string }>) =>
    subscribeChannel(CORE_CHANNELS.FS_WATCH_EVENT, callback),
};

const windowAPI = {
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
  close: () => ipcRenderer.send('window:close'),
  newWindow: () => ipcRenderer.invoke('window:new'),
  onOpenFile: (callback: IpcCallback<string>) => subscribeChannel('open-file', callback),
  notifyReadyForFile: () => ipcRenderer.send('renderer:ready-for-file'),
  onBeforeClose: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('window:before-close', listener);
    return () => ipcRenderer.removeListener('window:before-close', listener);
  },
  confirmClose: () => ipcRenderer.send('window:confirm-close'),
  cancelClose: () => ipcRenderer.send('window:cancel-close'),
};

const themeAPI = {
  getThemeList: () => ipcRenderer.invoke(CORE_CHANNELS.FS_GET_THEME_LIST),
  readThemeFile: (path: string) => ipcRenderer.invoke(CORE_CHANNELS.FS_READ_THEME_FILE, path),
  saveThemeId: (id: string) => ipcRenderer.invoke(CORE_CHANNELS.FS_SAVE_THEME_ID, id),
  loadThemeId: () => ipcRenderer.invoke(CORE_CHANNELS.FS_LOAD_THEME_ID),
};

const exportAPI = {
  exportToPDF: (html: string, savePath: string, options?: { basePath?: string }) =>
    ipcRenderer.invoke(EXPORT_CHANNELS.FS_EXPORT_PDF, html, savePath, options),
  exportToWord: (html: string, savePath: string, options?: { basePath?: string }) =>
    ipcRenderer.invoke(EXPORT_CHANNELS.FS_EXPORT_WORD, html, savePath, options),
  exportToZip: (
    files: Array<{ path: string; name: string; content: string }>,
    savePath: string,
    exportType: 'pdf' | 'word',
  ) => ipcRenderer.invoke(EXPORT_CHANNELS.FS_EXPORT_ZIP, files, savePath, exportType),
};

const pluginAPI = {
  getExternalPluginList: () => ipcRenderer.invoke(PLUGIN_CHANNELS.GET_EXTERNAL_PLUGIN_LIST),
  readPluginCode: (pluginPath: string) => ipcRenderer.invoke(PLUGIN_CHANNELS.READ_PLUGIN_CODE, pluginPath),
  readPluginDirectory: (pluginPath: string) => ipcRenderer.invoke(PLUGIN_CHANNELS.READ_PLUGIN_DIRECTORY, pluginPath),
  loadWasm: (name: string) => ipcRenderer.invoke(PLUGIN_CHANNELS.LOAD_WASM, name),
};

const loggerAPI = {
  writeLog: (entry: unknown) => ipcRenderer.invoke(LOGGER_CHANNELS.WRITE_LOG, entry),
  writeLogBatch: (entries: unknown[]) => ipcRenderer.invoke(LOGGER_CHANNELS.WRITE_LOG_BATCH, entries),
  readLogFile: () => ipcRenderer.invoke(LOGGER_CHANNELS.READ_LOG_FILE),
  clearLogs: () => ipcRenderer.invoke(LOGGER_CHANNELS.CLEAR_LOGS),
};

const aiAPI = {
  startTask: (request: { kind: 'chat' | 'plan' | 'edit' | 'workspace-change'; payload: unknown; pluginId?: string }) =>
    ipcRenderer.invoke(AI_CHANNELS.START_TASK, request),
  cancelTask: (taskId: string) => ipcRenderer.invoke(AI_CHANNELS.CANCEL_TASK, taskId),
  onTaskEvent: (
    callback: IpcCallback<{
      taskId: string;
      status: 'queued' | 'running' | 'streaming' | 'completed' | 'failed' | 'cancelled';
      chunk?: string;
      result?: unknown;
      error?: { code: string; message: string };
    }>,
  ) => subscribeChannel(AI_CHANNELS.TASK_EVENT, callback),
};

const aiConfigAPI = {
  listProviders: () => ipcRenderer.invoke(AI_CONFIG_CHANNELS.LIST_PROVIDERS),
  upsertProvider: (request: {
    id?: string;
    name: string;
    kind: 'openai-compatible' | 'ollama';
    baseUrl: string;
    modelIds: string[];
    defaultModelId?: string;
    enabled?: boolean;
    apiKey?: string;
    clearSecret?: boolean;
  }) => ipcRenderer.invoke(AI_CONFIG_CHANNELS.UPSERT_PROVIDER, request),
  deleteProvider: (providerId: string) => ipcRenderer.invoke(AI_CONFIG_CHANNELS.DELETE_PROVIDER, providerId),
  clearProviderSecret: (providerId: string) => ipcRenderer.invoke(AI_CONFIG_CHANNELS.CLEAR_PROVIDER_SECRET, providerId),
  testProviderConnection: (request: { providerId: string; modelId?: string }) =>
    ipcRenderer.invoke(AI_CONFIG_CHANNELS.TEST_PROVIDER_CONNECTION, request),
  discoverOllamaModels: (baseUrl: string) =>
    ipcRenderer.invoke(AI_CONFIG_CHANNELS.DISCOVER_OLLAMA_MODELS, { baseUrl }),
};

const systemAPI = {
  getSystemUsage: () => ipcRenderer.invoke('system:get-usage'),
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  getDirname: (path: string) => ipcRenderer.invoke(CORE_CHANNELS.PATH_DIRNAME, path),
  pathJoin: (...args: string[]) => ipcRenderer.invoke(CORE_CHANNELS.PATH_JOIN, ...args),
};

const electronAPI = {
  fs: fsAPI,
  window: windowAPI,
  theme: themeAPI,
  export: exportAPI,
  plugin: pluginAPI,
  logger: loggerAPI,
  ai: aiAPI,
  aiConfig: aiConfigAPI,

  openDirectory: fsAPI.openDirectory,
  openFile: fsAPI.openFile,
  readDirectoryTree: fsAPI.readDirectoryTree,
  showSaveDialog: fsAPI.showSaveDialog,
  readDir: fsAPI.readDir,
  readFile: fsAPI.readFile,
  writeFile: fsAPI.writeFile,
  createFile: fsAPI.createFile,
  createDirectory: fsAPI.createDirectory,
  rename: fsAPI.rename,
  delete: fsAPI.delete,
  move: fsAPI.move,
  copy: fsAPI.copy,
  checkExists: fsAPI.checkExists,
  showItemInFolder: fsAPI.showItemInFolder,
  saveImage: fsAPI.saveImage,
  saveTempImage: fsAPI.saveTempImage,
  getFilePath: fsAPI.getFilePath,
  exportToPDF: exportAPI.exportToPDF,
  exportToWord: exportAPI.exportToWord,
  exportToZip: exportAPI.exportToZip,
  getAllMarkdownFiles: fsAPI.getAllMarkdownFiles,
  getUserDataPath: fsAPI.getUserDataPath,
  getDirname: systemAPI.getDirname,
  pathJoin: systemAPI.pathJoin,
  openExternal: systemAPI.openExternal,
  getSystemUsage: systemAPI.getSystemUsage,
  minimize: windowAPI.minimize,
  maximize: windowAPI.maximize,
  toggleMaximize: windowAPI.toggleMaximize,
  close: windowAPI.close,
  newWindow: windowAPI.newWindow,
  onOpenFile: windowAPI.onOpenFile,
  notifyReadyForFile: windowAPI.notifyReadyForFile,
  onBeforeClose: windowAPI.onBeforeClose,
  confirmClose: windowAPI.confirmClose,
  cancelClose: windowAPI.cancelClose,
  getThemeList: themeAPI.getThemeList,
  readThemeFile: themeAPI.readThemeFile,
  saveThemeId: themeAPI.saveThemeId,
  loadThemeId: themeAPI.loadThemeId,
  watch: fsAPI.watch,
  onWatchEvent: fsAPI.onWatchEvent,
  getExternalPluginList: pluginAPI.getExternalPluginList,
  readPluginCode: pluginAPI.readPluginCode,
  readPluginDirectory: pluginAPI.readPluginDirectory,
  loadWasm: pluginAPI.loadWasm,
  writeLog: loggerAPI.writeLog,
  writeLogBatch: loggerAPI.writeLogBatch,
  readLogFile: loggerAPI.readLogFile,
  clearLogs: loggerAPI.clearLogs,
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
