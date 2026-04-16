import { IFileSystem } from '@/kernel/interfaces/IFileSystem';

export class ElectronAdapter implements IFileSystem {
  private get api() { return window.electronAPI; }

  async readFile(path: string) { return await this.api.readFile(path); }
  async saveFile(path: string, content: string) { return await this.api.writeFile(path, content); }
  async openDirectory() { return await this.api.openDirectory(); }
  async openFile() { return await this.api.openFile() as Array<{ path: string; content: string }> | null; }
  async readDirectoryTree(path: string) { return await this.api.readDirectoryTree(path); }
  async showSaveDialog(options?: any) { return await this.api.showSaveDialog(options); }
  async saveImage(dir: string, buffer: ArrayBuffer, name: string) { return await this.api.saveImage(dir, buffer, name); }
  async saveTempImage(buffer: ArrayBuffer, name: string) { return await this.api.saveTempImage(buffer, name); }
  getFilePath(file: File) { return this.api.getFilePath(file); }
  async createFile(path: string, content = '') { return await this.api.createFile(path, content); }
  async createDirectory(path: string) { return await this.api.createDirectory(path); }
  async rename(oldPath: string, newPath: string) { return await this.api.rename(oldPath, newPath); }
  async delete(path: string, moveToTrash: boolean) { return await this.api.delete(path, moveToTrash); }
  async move(srcPath: string, destPath: string) { return await this.api.move(srcPath, destPath); }
  async copy(srcPath: string, destPath: string) { return await this.api.copy(srcPath, destPath); }
  async checkExists(path: string) { return await this.api.checkExists(path); }
  async showItemInFolder(path: string) { return await this.api.showItemInFolder(path); }
  async exportToPDF(html: string, savePath: string, options?: { basePath?: string }) { return await this.api.exportToPDF(html, savePath, options); }
  async exportToWord(html: string, savePath: string, options?: { basePath?: string }) { return await this.api.exportToWord(html, savePath, options); }
  async exportToZip(files: Array<{ path: string; name: string; content: string }>, savePath: string, exportType: 'pdf' | 'word') { return await this.api.exportToZip(files, savePath, exportType); }
  async getAllMarkdownFiles(dirPath: string) { return await this.api.getAllMarkdownFiles(dirPath); }
  async getUserDataPath() { return await this.api.getUserDataPath(); }
  async getDirname(path: string) { return await this.api.getDirname(path); }
  async pathJoin(...args: string[]) { return await this.api.pathJoin(...args); }
  async openExternal(url: string) { return await this.api.openExternal(url); }

  async getThemeList() { return await this.api.getThemeList(); }
  async readThemeFile(path: string) { return await this.api.readThemeFile(path); }
  async saveThemeId(id: string) { return await this.api.saveThemeId(id); }
  async loadThemeId() { return await this.api.loadThemeId(); }

  async watch(path: string) { return await this.api.watch(path); }
  onWatchEvent(callback: (data: { eventType: string; filename: string }) => void): () => void {
    const maybeDispose = this.api.onWatchEvent(callback);
    return typeof maybeDispose === 'function' ? maybeDispose : () => { };
  }

  // 外部插件系统
  async getExternalPluginList() { return await this.api.getExternalPluginList(); }
  async readPluginCode(pluginPath: string) { return await this.api.readPluginCode(pluginPath); }
  async readPluginDirectory(pluginPath: string) { return await this.api.readPluginDirectory(pluginPath); }
  async loadWasm(name: string) { return await this.api.loadWasm(name); }
}
