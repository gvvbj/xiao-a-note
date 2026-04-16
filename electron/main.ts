/**
 * Electron Main Process
 * 
 * 设计原则：
 * - 模块化：Handler 单独初始化，main.ts 只负责协调
 * - 扩展性：支持多窗口，窗口管理使用 Set
 * - 解耦性：窗口控制与窗口创建分离
 */

import { app, BrowserWindow, protocol, net, shell, ipcMain, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import fs from 'fs';
import { CoreFileHandler } from './handlers/CoreFileHandler';
import { ImageHandler } from './handlers/ImageHandler';
import { ExportHandler } from './handlers/ExportHandler';
import { WindowControlHandler } from './handlers/windowControl';
import { MainLoggerHandler } from './handlers/MainLoggerHandler';
import { AIHandler } from './handlers/AIHandler';
import { AIConfigHandler } from './handlers/AIConfigHandler';
import { pathToFileURL } from 'url';

// 设置 AppUserModelId 确保 Windows 任务栏图标正确层叠
app.setAppUserModelId('com.xiaoanote.app');

const logger = MainLoggerHandler.initialize();
const NS = 'Main';

// 1. 注册特权协议
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local-resource',
    privileges: {
      secure: true,
      supportFetchAPI: true,
      standard: true,
      bypassCSP: true,
      stream: true,
      cors: true // 关键：开启 CORS 特权，允许渲染进程 fetch
    } as any
  }
]);

// 窗口管理
const windows: Set<BrowserWindow> = new Set();
let tray: Tray | null = null;
let isQuitting = false;


// 辅助函数：从命令行参数中寻找文件路径
const findFileFromArgs = (argv: string[], workingDirectory?: string): string | null => {
  // 从 argv[1] 开始遍历（argv[0] 是可执行文件路径，直接跳过）
  // 过滤 -- 开头的 Electron/Chromium 标志位和 '.'(开发环境标志)
  const args = argv.slice(1).filter(arg => !arg.startsWith('--') && arg !== '.');

  for (const arg of args) {
    // 获取绝对路径用于判断
    let absPath = arg;
    if (workingDirectory && !path.isAbsolute(arg)) {
      absPath = path.resolve(workingDirectory, arg);
    }

    // 必须是存在的文件
    try {
      if (!fs.existsSync(absPath) || !fs.statSync(absPath).isFile()) {
        continue;
      }
    } catch (e) {
      continue;
    }

    // 排除任何 .exe 文件（笔记软件不应该打开 exe）
    if (absPath.toLowerCase().endsWith('.exe')) {
      continue;
    }

    // 如果是 .md 或 .markdown，直接返回
    if (absPath.toLowerCase().endsWith('.md') || absPath.toLowerCase().endsWith('.markdown')) {
      return absPath;
    }

    // 或者返回其他有效文件（但已排除了 exe）
    return absPath;
  }
  return null;
};

// 单实例锁 - 防止启动多个进程
const gotTheLock = app.requestSingleInstanceLock();
const isTestMode = process.env.NODE_ENV === 'test' || process.argv.includes('--test-mode');

if (!gotTheLock && !isTestMode) {
  // 如果获取不到锁，说明已有实例在运行，直接退出
  app.quit();
} else {
  // 当第二个实例被启动时，聚焦到已有窗口
  app.on('second-instance', (_event, argv, workingDirectory) => {
    // 找到第一个窗口并聚焦
    const existingWindow = windows.values().next().value;
    if (existingWindow) {
      if (existingWindow.isMinimized()) {
        existingWindow.restore();
      }
      if (!existingWindow.isVisible()) {
        existingWindow.show();
      }
      existingWindow.focus();

      // 解析并发送文件路径
      const filePath = findFileFromArgs(argv, workingDirectory);
      if (filePath) {
        // 热启动时渲染进程已就绪，无需等待
        existingWindow.webContents.send('open-file', filePath);
      }
    }
  });
}

// 设置 App User Model ID (Windows 任务栏图标分组)
const APP_ID = 'com.xiaoanote.app';
app.setAppUserModelId(APP_ID);
app.setName('小A笔记'); // 显式设置应用名称

/**
 * 获取图标路径
 * 
 * 生产环境：图标通过 extraResources 复制到 process.resourcesPath/icons/ (asar 外部)
 * 开发环境：直接使用项目根目录的 resources/icons/
 */
function getIconPath(): string {
  const isDev = process.env.NODE_ENV === 'development';

  const possiblePaths = isDev
    ? [
      // 开发环境：项目根目录
      path.join(process.cwd(), 'resources/icons/app图标.ico'),
      path.join(process.cwd(), 'resources/icons/app图标.png'),
    ]
    : [
      // 生产环境：extraResources 输出位置（asar 外部，nativeImage 可读取）
      path.join(process.resourcesPath, 'icons/app图标.ico'),
      path.join(process.resourcesPath, 'icons/app图标.png'),
    ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return ''; // fallback 使用 Electron 默认图标
}

/**
 * 创建窗口（支持多窗口）
 * @param isNewWindow - 是否是新窗口（决定是否清除状态）
 */
const createWindow = (isNewWindow = false): BrowserWindow => {
  // main.cjs 在 electron/dist/main.cjs
  // preload.cjs 在 electron/dist/preload.cjs (同目录)
  const preloadPath = path.resolve(__dirname, 'preload.cjs');
  const iconPath = getIconPath();

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    titleBarStyle: 'hidden',
    icon: iconPath || undefined,
    title: '小A笔记', // 显式设置标题
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: true // 保持开启
    },
    // 开启毛玻璃特效 (Windows 11 Mica / Acrylic)
    transparent: false,
    backgroundMaterial: 'mica',
    // 移除纯白背景，避免遮挡特效
    // backgroundColor: '#00000000'
  });

  // 禁用默认菜单（防止 Ctrl+R 刷新、Ctrl+N 新建窗口等默认行为干扰）
  win.setMenu(null);

  // 加载页面，新窗口传递标识
  const baseUrl = process.env.NODE_ENV === 'development'
    ? 'http://localhost:5173'
    : `file://${path.join(__dirname, '../../dist/index.html')}`; // 修正路径：electron/dist -> root -> dist

  const url = isNewWindow ? `${baseUrl}?newWindow=true` : baseUrl;

  if (process.env.NODE_ENV === 'development') {
    win.loadURL(url);
    win.webContents.openDevTools();
  } else {
    // 生产环境加载文件
    const indexPath = path.join(__dirname, '../../dist/index.html');
    if (isNewWindow) {
      win.loadFile(indexPath, { query: { newWindow: 'true' } });
    } else {
      win.loadFile(indexPath);
    }
  }

  // 处理首次启动时的文件参数（ready-signal 握手机制）
  // 缓存待打开的文件路径，等渲染进程插件初始化完成后发送通知
  if (!isNewWindow) {
    const pendingFilePath = findFileFromArgs(process.argv, process.cwd());

    if (pendingFilePath) {
      // 监听渲染进程发来的 ready 信号
      ipcMain.once('renderer:ready-for-file', () => {
        logger.info(NS, `冷启动 收到 renderer ready 信号，发送文件: ${pendingFilePath}`);
        win.webContents.send('open-file', pendingFilePath);
      });
    }
  }

  // 为每个窗口创建独立的 FileSystemHandler 实例
  // (已重构为单例模式，在 app.whenReady 中初始化)

  windows.add(win);

  // 关闭前检查未保存内容
  win.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      // 如果只有一个窗口且有托盘，隐藏到托盘
      if (windows.size === 1 && tray) {
        win.hide();
      } else {
        // 发送检查事件到对应窗口
        win.webContents.send('window:before-close');
      }
    }
  });

  win.on('closed', () => {
    windows.delete(win);
  });

  return win;
};

/**
 * 创建托盘图标
 */
const createTray = () => {
  const iconPath = getIconPath();
  if (!iconPath) {
    logger.warn(NS, 'No icon available, skipping tray creation');
    return;
  }

  try {
    const icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) {
      logger.warn(NS, 'Icon is empty, skipping tray creation');
      return;
    }

    // 调整尺寸以适应托盘
    const resizedIcon = icon.resize({ width: 16, height: 16 });

    tray = new Tray(resizedIcon);
    tray.setToolTip('小A笔记');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示窗口',
        click: () => {
          const win = windows.values().next().value;
          if (win) {
            win.show();
            win.focus();
          } else {
            createWindow();
          }
        }
      },
      { type: 'separator' },
      {
        label: '新建窗口',
        click: () => createWindow(true)
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ]);

    tray.setContextMenu(contextMenu);

    // 点击托盘图标显示窗口
    tray.on('click', () => {
      const win = windows.values().next().value;
      if (win) {
        if (win.isVisible()) {
          win.focus();
        } else {
          win.show();
        }
      } else {
        createWindow();
      }
    });

    logger.info(NS, 'Tray created successfully');
  } catch (error) {
    logger.error(NS, 'Tray creation failed:', error);
  }
};

app.whenReady().then(() => {
  // 初始化处理器（单例，只需调用一次）
  // [Phase 9] 后端架构重构：拆分为三个独立的 Handler
  WindowControlHandler.initialize();
  CoreFileHandler.initialize();
  ImageHandler.initialize();
  ExportHandler.initialize();
  AIHandler.initialize();
  AIConfigHandler.initialize();
  // [Phase 10 P4] 日志系统
  MainLoggerHandler.initialize();

  // 禁用全局菜单
  Menu.setApplicationMenu(null);

  // 协议处理器
  protocol.handle('local-resource', async (request) => {
    let urlPath = request.url.replace(/^local-resource:\/*/, '');
    urlPath = decodeURIComponent(urlPath);
    const originalUrl = request.url;

    if (process.platform === 'win32') {
      // 1. 补全可能缺失的冒号
      if (/^(\/)?[a-zA-Z]\//.test(urlPath) && !urlPath.includes(':')) {
        urlPath = urlPath.replace(/^(\/)?([a-zA-Z])\//, '$1$2:/');
      }

      // 2. 移除前导斜杠
      if (urlPath.startsWith('/') && /^\/[a-zA-Z]:/.test(urlPath)) {
        urlPath = urlPath.slice(1);
      }
    } else {
      if (!urlPath.startsWith('/')) {
        urlPath = '/' + urlPath;
      }
    }

    try {
      // 关键修复：直接使用 fs 读取文件，绕过 net.fetch
      const data = await fs.promises.readFile(urlPath);

      const ext = path.extname(urlPath).toLowerCase();
      let mimeType = 'application/octet-stream';
      if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
      else if (ext === '.gif') mimeType = 'image/gif';
      else if (ext === '.svg') mimeType = 'image/svg+xml';

      return new Response(data, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': mimeType
        }
      });
    } catch (error) {
      logger.error(NS, `[Protocol] Error reading ${urlPath}:`, error);
      return new Response('Not Found', { status: 404 });
    }
  });

  // 处理打开外部链接
  ipcMain.handle('shell:openExternal', async (_, url) => {
    await shell.openExternal(url);
  });

  // [New] System Info Handler
  ipcMain.handle('system:get-usage', async () => {
    return {
      cpu: process.getCPUUsage().percentCPUUsage,
      memory: process.getSystemMemoryInfo()
    };
  });

  // 渲染进程确认可以关闭
  ipcMain.on('window:confirm-close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      windows.delete(win);
      win.destroy();
    }
  });

  // 渲染进程取消关闭
  ipcMain.on('window:cancel-close', () => {
    // 保持窗口打开
  });

  // 创建新窗口 IPC
  ipcMain.handle('window:new', () => {
    createWindow(true);
    return { success: true };
  });

  // 创建托盘
  createTray();

  // 创建主窗口
  createWindow(false);
});

// 所有窗口关闭时的行为
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && isQuitting) {
    app.quit();
  }
});

app.on('activate', () => {
  if (windows.size === 0) {
    createWindow();
  }
});

// 应用退出前清理
app.on('before-quit', () => {
  isQuitting = true;
});
