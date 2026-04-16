# 插件开发规范 (Plugins QuickStart)

本目录用于存放“小A笔记”的外部扩展插件。

### 快速开始
1.  **内置 TS 支持**：你可以直接在此目录下新建文件夹，编写 `index.ts` 和 `manifest.json`。
2.  **热加载**：重启应用即可自动发现并编译新插件。
3.  **打包后开发**：即使应用已安装，你依然可以进入此文件夹进行插件开发。

### 核心规范
- **入口**：必须在 `manifest.json` 中指定 `main` 文件。
- **生命周期**：必须导出 `activate(context)` 方法。
- **性能**：推荐设置 `lazy: true` 以实现延迟激活。

### 详细文档
请查阅项目根目录下的 [docs/PluginDevelopmentGuide.md](../docs/PluginDevelopmentGuide.md) 获取完整的 API 参考和开发模式解析。
