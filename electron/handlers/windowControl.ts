/**
 * WindowControlHandler - 窗口控制处理器
 * 
 * 设计原则：
 * - 单例模式：确保 IPC 事件只注册一次
 * - 解耦性：通过 event.sender 识别发送窗口，不依赖闭包绑定
 * - 扩展性：支持任意数量的窗口实例
 */

import { ipcMain, BrowserWindow } from 'electron';

export class WindowControlHandler {
  private static instance: WindowControlHandler | null = null;
  private static isRegistered = false;

  /**
   * 初始化窗口控制处理器（单例）
   * 应该在 app.whenReady 后调用一次
   */
  static initialize() {
    if (WindowControlHandler.isRegistered) {
      return WindowControlHandler.instance;
    }

    WindowControlHandler.instance = new WindowControlHandler();
    WindowControlHandler.isRegistered = true;
    return WindowControlHandler.instance;
  }

  private constructor() {
    this.registerHandlers();
  }

  private registerHandlers() {
    // 最小化：通过 event.sender 获取对应窗口
    ipcMain.on('window:minimize', (event) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win && !win.isDestroyed()) {
        win.minimize();
      }
    });

    // 最大化/还原
    ipcMain.on('window:maximize', (event) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win && !win.isDestroyed()) {
        if (win.isMaximized()) {
          win.unmaximize();
        } else {
          win.maximize();
        }
      }
    });

    // 显式切换最大化 (用于双击标题栏)
    ipcMain.on('window:toggle-maximize', (event) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win && !win.isDestroyed()) {
        if (win.isMaximized()) {
          win.unmaximize();
        } else {
          win.maximize();
        }
      }
    });

    // 关闭：触发关闭流程（会先走 before-close 确认）
    ipcMain.on('window:close', (event) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win && !win.isDestroyed()) {
        win.close();
      }
    });
  }
}