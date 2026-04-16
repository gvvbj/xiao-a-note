# 通用开发规范 — 微内核 + 插件优先架构

> 本规范源自 xiao-a-note 项目多轮重构的实战总结。  
> 适用于所有中大型前端应用，尤其是功能密集型桌面/Web 应用。

---

## 一、核心原则（5 条铁律）

### 1. 微内核原则
> 核心（Kernel）只做框架，不写业务。

核心的**全部职责**：
- 事件总线（发布/订阅）
- 服务注册与发现（`registerService` / `getService`）
- UI 插槽系统（注册/渲染）
- 插件生命周期管理（加载/激活/销毁）
- 类型定义与接口契约

**判定标准**：删掉所有插件后，核心仍能启动（只是空壳）。

### 2. 插件优先原则
> 一切功能皆插件。

- 每个功能模块是独立插件，有 `activate()` / `deactivate()` 生命周期
- 插件之间**禁止直接 import**，只通过事件和服务接口通信
- 新功能 = 新插件，不修改已有插件的核心逻辑

### 3. 零核心修改原则
> 加功能不改核心，改核心只加扩展点。

- ✅ 正确做法：添加新插件、注册新服务、监听新事件
- ❌ 错误做法：在核心组件中写 `if (featureX)` 分支判断
- 如果无法通过插件实现某功能，说明核心缺少扩展点 → 先补扩展点，再写插件

### 4. 接口契约原则
> 依赖抽象（接口），不依赖实现（类）。

- 服务通过接口定义（`IFileSystem`、`ITabService`）
- 插件通过 `kernel.getService<IXxx>('serviceName')` 获取服务
- 替换实现时，只需注册新的服务实例，调用方无感知

### 5. 可溯源原则
> 常量化、集中化、零魔法字符串。

- 事件名 → `CoreEvents.ts`
- 服务 ID → 常量统一管理
- UI 插槽 ID → `Constants.ts`
- 任何人看一个文件就能知道系统的所有扩展点

---

## 二、项目结构规范

```
src/
├── kernel/              # 微内核（禁区：只增扩展点，不加业务）
│   ├── core/            # Kernel、Events、Constants
│   ├── interfaces/      # 服务接口定义
│   ├── services/        # 基础服务实现
│   ├── hooks/           # React Hooks（桥接层）
│   └── system/plugin/   # 插件管理器
├── modules/
│   ├── built-in/        # 内置模块（TS，编译时打包）
│   ├── extensions/      # 扩展模块（TS，可拆离）
│   ├── syntax/          # 语法插件
│   └── interfaces/      # 模块间接口
├── shared/              # 共享组件与工具
plugins/                 # 外部插件（JS，运行时加载）
themes/                  # 外部主题（CSS，运行时加载）
```

### 文件命名
- 插件入口：`index.ts`（导出 `default class XxxPlugin implements IPlugin`）
- 服务类：`XxxService.ts` / `XxxController.ts`
- Widget：`XxxWidgets.ts`
- 常量：`XxxConstants.ts`
- 组件：`XxxComponent.tsx`

---

## 三、编码规范

### 禁止事项
| 规则 | 原因 |
|---|---|
| 禁止 `console.log` | 必须使用 LoggerService |
| 禁止魔法字符串 | 事件、服务 ID 必须用常量 |
| 禁止跨插件直接 import | 使用事件或服务接口 |
| 禁止在核心中写业务逻辑 | 核心只做 wiring |
| 禁止硬编码配置值 | 使用 Constants 或 Settings |

### 插件编写模板

```typescript
import { IPlugin, IPluginContext } from '@/kernel/system/plugin/types';

export default class MyPlugin implements IPlugin {
    id = 'my-plugin';
    name = 'My Plugin';
    version = '1.0.0';
    
    private cleanup: (() => void)[] = [];

    activate(context: IPluginContext) {
        const logger = context.kernel.getService('loggerService')
            ?.createLogger('MyPlugin');
        
        // 注册服务
        const unregService = context.registerService('myService', new MyService());
        this.cleanup.push(unregService);

        // 监听事件
        const handler = (payload: any) => { /* ... */ };
        context.kernel.on(CoreEvents.SOME_EVENT, handler);
        this.cleanup.push(() => context.kernel.off(CoreEvents.SOME_EVENT, handler));
        
        // 注册 UI
        context.registerUI(UISlotId.TOOLBAR, {
            id: 'my-button',
            component: MyButton,
            order: 10
        });

        logger?.info('MyPlugin activated');
    }

    deactivate() {
        this.cleanup.forEach(fn => fn());
    }
}
```

---

## 四、AI 协作规范

### AI 修改准则
1. **只改插件层** — 核心文件列入禁区清单
2. **先查后写** — 修改前搜索所有相关引用，评估影响范围
3. **增量修改** — 不重写整个文件，只改必要部分
4. **编译验证** — 每次修改后执行 `tsc --noEmit`
5. **保持可逆** — 每个有意义的变更后 commit + tag

### 测试准则
1. **场景由人定义** — 用自然语言描述"输入→操作→预期"
2. **代码由 AI 生成** — 但必须通过"删除逻辑后测试是否仍通过"的校验
3. **优先级驱动** — P0（致命路径）必测，P1（核心流程）应测，其余选测
4. **TypeScript 编译 = 免费测试** — 严格模式 + `noEmit` 检查

---

## 五、版本管理规范

- **分支策略**：`master`（稳定）+ `dev/xxx`（开发）
- **Tag 格式**：`v{major}.{minor}.{patch}-{描述}`
- **Commit 格式**：`{类型}: {描述}`（类型：feat/fix/refactor/chore/docs）
- **合并后删除开发分支**

---

## 六、扩展能力矩阵

| 扩展类型 | 语言 | 位置 | 打包后可用 | 描述 |
|---|---|---|---|---|
| 内置插件 | TS | `src/modules/built-in/` | 编译进包 | 核心功能 |
| 扩展插件 | TS | `src/modules/extensions/` | 编译进包 | 可选功能 |
| 外部插件 | JS | `plugins/` | ✅ 运行时加载 | 用户/第三方扩展 |
| 主题 | CSS | `themes/` | ✅ 运行时加载 | 外观定制 |

---

> **记住**：好的架构不是加不了功能，而是加功能时不需要改已有代码。
