/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface IElectronFileSystemAPI {
  openDirectory: () => Promise<{ path: string; tree: any[] } | null>;
  openFile: () => Promise<Array<{ path: string; content: string }> | null>;
  readDirectoryTree: (path: string) => Promise<any[]>;
  showSaveDialog: (options?: any) => Promise<string | null>;
  readDir: (path: string) => Promise<Array<{ name: string; isDirectory: boolean; path: string }>>;
  readFile: (path: string) => Promise<{ success: boolean; content?: string; error?: string }>;
  writeFile: (path: string, content: string) => Promise<{ success: boolean; error?: string }>;
  createFile: (path: string, content: string) => Promise<{ success: boolean; path?: string; error?: string }>;
  createDirectory: (path: string) => Promise<{ success: boolean; path?: string; error?: string }>;
  rename: (oldPath: string, newPath: string) => Promise<{ success: boolean; error?: string }>;
  delete: (path: string, moveToTrash: boolean) => Promise<{ success: boolean; error?: string }>;
  move: (srcPath: string, destPath: string) => Promise<{ success: boolean; error?: string }>;
  copy: (srcPath: string, destPath: string) => Promise<{ success: boolean; error?: string }>;
  checkExists: (path: string) => Promise<boolean>;
  showItemInFolder: (path: string) => Promise<void>;
  getUserDataPath: () => Promise<string>;
  saveImage: (dir: string, buffer: ArrayBuffer, name: string) => Promise<{ success: boolean; path?: string; error?: string }>;
  saveTempImage: (buffer: ArrayBuffer, name: string) => Promise<{ success: boolean; path?: string; url?: string; error?: string }>;
  getFilePath: (file: File) => string;
  getAllMarkdownFiles: (dirPath: string) => Promise<string[]>;
  watch: (path: string) => Promise<void>;
  onWatchEvent: (callback: (data: { eventType: string; filename: string }) => void) => () => void;
}

interface IElectronWindowAPI {
  minimize: () => void;
  maximize: () => void;
  toggleMaximize: () => void;
  close: () => void;
  newWindow: () => Promise<{ success: boolean }>;
  onOpenFile: (callback: (path: string) => void) => () => void;
  notifyReadyForFile: () => void;
  onBeforeClose: (callback: () => void) => () => void;
  confirmClose: () => void;
  cancelClose: () => void;
}

interface IElectronThemeAPI {
  getThemeList: () => Promise<Array<{ id: string; name: string; path: string }>>;
  readThemeFile: (path: string) => Promise<string>;
  saveThemeId: (id: string) => Promise<void>;
  loadThemeId: () => Promise<string | null>;
}

interface IElectronExportAPI {
  exportToPDF: (html: string, savePath: string, options?: { basePath?: string }) => Promise<{ success: boolean; error?: string }>;
  exportToWord: (html: string, savePath: string, options?: { basePath?: string }) => Promise<{ success: boolean; error?: string }>;
  exportToZip: (
    files: Array<{ path: string; name: string; content: string }>,
    savePath: string,
    exportType: 'pdf' | 'word'
  ) => Promise<{ success: boolean; error?: string }>;
}

interface IElectronPluginAPI {
  getExternalPluginList: () => Promise<Array<{ id: string; name: string; version: string; path: string; main: string }>>;
  readPluginCode: (pluginPath: string) => Promise<{ success: boolean; code?: string; error?: string }>;
  readPluginDirectory: (pluginPath: string) => Promise<Record<string, string>>;
  loadWasm: (name: string) => Promise<Uint8Array | null>;
}

interface IElectronLoggerAPI {
  writeLog: (entry: { timestamp: string; level: number; namespace: string; message: string; data?: any }) => Promise<{ success: boolean }>;
  writeLogBatch: (entries: Array<{ timestamp: string; level: number; namespace: string; message: string; data?: any }>) => Promise<{ success: boolean }>;
  readLogFile: () => Promise<{ success: boolean; content?: string; error?: string }>;
  clearLogs: () => Promise<{ success: boolean; error?: string }>;
}

interface IElectronAIAPI {
  startTask: (request: { kind: 'chat' | 'plan' | 'edit' | 'workspace-change'; payload: unknown; pluginId?: string }) => Promise<{ taskId: string }>;
  cancelTask: (taskId: string) => Promise<void>;
  onTaskEvent: (
    callback: (event: {
      taskId: string;
      status: 'queued' | 'running' | 'streaming' | 'completed' | 'failed' | 'cancelled';
      chunk?: string;
      result?: unknown;
      error?: { code: string; message: string };
    }) => void
  ) => () => void;
}

interface IElectronAIProviderSummary {
  id: string;
  name: string;
  kind: 'openai-compatible' | 'ollama';
  baseUrl: string;
  modelIds: string[];
  defaultModelId: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
  hasSecret: boolean;
  maskedSecret: string | null;
}

interface IElectronAIConfigAPI {
  listProviders: () => Promise<{
    success: boolean;
    providers: IElectronAIProviderSummary[];
    encryptionAvailable: boolean;
    strictSecretMode: boolean;
    error?: string;
  }>;
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
  }) => Promise<{
    success: boolean;
    providerId?: string;
    code?: string;
    error?: string;
    providers?: IElectronAIProviderSummary[];
    encryptionAvailable: boolean;
    strictSecretMode: boolean;
  }>;
  deleteProvider: (providerId: string) => Promise<{
    success: boolean;
    providers?: IElectronAIProviderSummary[];
    encryptionAvailable: boolean;
    strictSecretMode: boolean;
    error?: string;
  }>;
  clearProviderSecret: (providerId: string) => Promise<{
    success: boolean;
    providers?: IElectronAIProviderSummary[];
    encryptionAvailable: boolean;
    strictSecretMode: boolean;
    error?: string;
  }>;
  testProviderConnection: (request: {
    providerId: string;
    modelId?: string;
  }) => Promise<{
    success: boolean;
    latencyMs?: number;
    code?: string;
    error?: string;
  }>;
  discoverOllamaModels: (baseUrl: string) => Promise<{
    success: boolean;
    models: string[];
    code?: string;
    error?: string;
  }>;
}

// 定义 Electron 暴露给前端的 API
interface IElectronAPI extends IElectronFileSystemAPI, IElectronWindowAPI, IElectronThemeAPI, IElectronExportAPI, IElectronPluginAPI, IElectronLoggerAPI {
  fs: IElectronFileSystemAPI;
  window: IElectronWindowAPI;
  theme: IElectronThemeAPI;
  export: IElectronExportAPI;
  plugin: IElectronPluginAPI;
  logger: IElectronLoggerAPI;
  ai: IElectronAIAPI;
  aiConfig: IElectronAIConfigAPI;

  getUserDataPath: () => Promise<string>;
  getDirname: (path: string) => Promise<string>;
  pathJoin: (...args: string[]) => Promise<string>;
  openExternal: (url: string) => Promise<void>;
  getSystemUsage: () => Promise<{ cpu: number; memory: Electron.ProcessMemoryInfo }>;
}

interface Window {
  electronAPI: IElectronAPI;
}
