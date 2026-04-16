export interface IFileSystem {
  readFile(path: string): Promise<{ success: boolean; content?: string; error?: string }>;
  saveFile(path: string, content: string): Promise<{ success: boolean; error?: string }>;
  openDirectory(): Promise<{ path: string; tree: any[] } | null>;
  openFile(): Promise<Array<{ path: string; content: string }> | null>;
  readDirectoryTree(path: string): Promise<any[]>;
  showSaveDialog(options?: any): Promise<string | null>;

  saveImage(dir: string, buffer: ArrayBuffer, name: string): Promise<{ success: boolean; path?: string; error?: string }>;
  saveTempImage(buffer: ArrayBuffer, name: string): Promise<{ success: boolean; path?: string; url?: string; error?: string }>;
  getFilePath(file: File): string;

  createFile(path: string, content?: string): Promise<{ success: boolean; path?: string; error?: string }>;
  createDirectory(path: string): Promise<{ success: boolean; path?: string; error?: string }>;
  rename(oldPath: string, newPath: string): Promise<{ success: boolean; error?: string }>;
  delete(path: string, moveToTrash: boolean): Promise<{ success: boolean; error?: string }>;
  move(srcPath: string, destPath: string): Promise<{ success: boolean; error?: string }>;
  copy(srcPath: string, destPath: string): Promise<{ success: boolean; error?: string }>;

  checkExists(path: string): Promise<boolean>;
  showItemInFolder(path: string): Promise<void>;

  exportToPDF(html: string, savePath: string, options?: { basePath?: string }): Promise<{ success: boolean; error?: string }>;
  exportToWord(html: string, savePath: string, options?: { basePath?: string }): Promise<{ success: boolean; error?: string }>;
  exportToZip(files: Array<{ path: string; name: string; content: string }>, savePath: string, exportType: 'pdf' | 'word'): Promise<{ success: boolean; error?: string }>;
  getAllMarkdownFiles(dirPath: string): Promise<string[]>;
  getUserDataPath(): Promise<string>;

  getDirname(path: string): Promise<string>;
  pathJoin(...args: string[]): Promise<string>;
  openExternal(url: string): Promise<void>;

  // === 新增 ===
  getThemeList(): Promise<Array<{ id: string; name: string; path: string }>>;
  readThemeFile(path: string): Promise<string>;

  watch(path: string): Promise<void>;
  onWatchEvent(callback: (data: { eventType: string; filename: string }) => void): () => void;

  // === 外部插件系统 ===
  /** 获取外部插件列表 (扫描 %APPDATA%/plugins/) */
  getExternalPluginList(): Promise<Array<{ id: string; name: string; version: string; path: string; main: string }>>;
  /** 读取插件代码 */
  readPluginCode(pluginPath: string): Promise<{ success: boolean; code?: string; error?: string }>;
  /** 递归读取整个插件目录下的所有 JS 文件 */
  readPluginDirectory(pluginPath: string): Promise<Record<string, string>>;
  /** 加载 WASM 二进制文件 (用于 esbuild-wasm) */
  loadWasm(name: string): Promise<Uint8Array | null>;
}
