# 隔离架构集成测试用例 (Standard Integration Tests)

> [!NOTE]
> 请复制以下代码块到本编辑器的任意位置，并观察结果。

---

## TC-01: CSS 样式溢出测试 (Style Pollution)
**目的**：验证内部 `!important` 样式是否会污染主窗口。

```html-preview
<style>
  /* 攻击代码：尝试将主界面背景变红并隐藏所有文字 */
  body, html { 
    background: red !important; 
    color: transparent !important;
  }
</style>
<div style="color: white; background: rgba(0,0,0,0.5); padding: 20px;">
  <h3>[隔离内层] 攻击正在运行...</h3>
  <p>只要这一块以外的地方没有变红，测试即为【成功】。</p>
</div>
```

---

## TC-02: 全局选择器劫持测试 (Global Selector Hijack)
**目的**：验证插件是否能通过 `*` 选择器影响宿主。

```html-preview
<style>
  /* 攻击代码：隐藏所有 div 元素 */
  div { display: none !important; }
</style>
<h3 style="display: block !important;">[隔离内层] 我尝试隐藏所有 DIV</h3>
<p>如果左侧导航栏和右侧预览依旧正常，测试即为【成功】。</p>
```

---

## TC-03: 主题 CSS 变量同步测试 (Theme Variable Sync)
**目的**：验证隔离层是否能正确感知宿主的配色方案。

```html-preview
<div style="
  padding: 15px; 
  border: 1px solid hsl(var(--border)); 
  background: hsl(var(--background)); 
  color: hsl(var(--foreground));
  border-radius: 8px;
">
  <h3>[主题同步检测]</h3>
  <p>文字颜色：<code>hsl(var(--foreground))</code></p>
  <p>背景颜色：<code>hsl(var(--background))</code></p>
  <p style="color: hsl(var(--primary))">高亮颜色：<code>hsl(var(--primary))</code></p>
  <hr style="border: none; border-top: 1px solid hsl(var(--border))">
  <p>请尝试切换【深色/浅色】模式。如果此块跟随系统变色，测试即为【成功】。</p>
</div>
```

---

## TC-04: 点击穿透与自适应测试 (Event & Auto-Height)
**目的**：验证隔离层点击是否能成功“闪回”源码模式。

> [!TIP]
> 测试时请打开控制台。如果点击时看到 `[IFrameBridge] Tunneling event...` 日志，说明穿透逻辑已触发。

```html-preview
<div style="padding: 10px; border: 2px dashed hsl(var(--primary)); text-align: center;">
  <p>这是一个被隔离的 HTML 块。</p>
  <button style="
    padding: 8px 16px; 
    background: hsl(var(--primary)); 
    color: hsl(var(--primary-foreground)); 
    border: none; 
    border-radius: 4px;
    cursor: pointer;
  " onclick="alert('IFrame 内部弹窗成功！')">验证点击响应</button>
  <p style="margin-top: 10px; font-size: 0.8em; color: hsl(var(--muted-foreground))">
    点击此区域任何位置，应能精准定位到源码行。
  </p>
</div>
```

---

## TC-05: 自动化安全审计测试 (Automated Security Audit)
**目的**：使用“模拟攻击插件”来验证 IFrame 网闸的真实强度。

> [!IMPORTANT]
> 此测试由 `security-test-plugin` 驱动。如果下方未出现蓝色审计面板，请检查扩展中心是否已启用“安全隔离测试”插件。

```isolation-attack
// 这是一个模拟代码块，用于触发安全审计插件
// 目标：验证在恶意代码环境下，宿主应用的安全性。
const target = "Xiao-A-Note Core";
```

**验证项目**：
1. **CSS 注入检测**：点击攻击按钮，侧边栏不应消失。
2. **JS 跨域检测**：点击攻击按钮，控制台应显示 `BLOCKED`，无法读取宿主存储。
3. **DoS 隔离检测**：点击压力测试，编辑器不应有明显的长期假死。

---

## TC-06: 越权访问测试 (Privilege Escalation)
**目的**：验证隔离层是否成功切断了对 Node.js 运行时及外部系统命令的访问。

```html-preview
<div id="disk-test" style="padding: 15px; border: 1px solid #ff4d4f; background: #fff2f0; border-radius: 8px;">
  <h3 style="color: #ff4d4f;">[OS 层探测尝试]</h3>
  <p>点击下方按钮，尝试通过 Node.js 获取系统/磁盘信息：</p>
  <button id="btn-disk" style="
    padding: 10px 20px; 
    background: #ff4d4f; 
    color: white; 
    border: none; 
    border-radius: 4px; 
    cursor: pointer;
    font-weight: bold;
  ">尝试探测磁盘空间</button>
  <pre id="output" style="
    margin-top: 15px; 
    background: #1e1e1e; 
    color: #00ff00; 
    padding: 12px; 
    font-size: 0.85em; 
    border-radius: 4px;
    overflow: auto;
    min-height: 100px;
    font-family: 'Courier New', Courier, monospace;
  "></pre>
</div>

<script>
  document.getElementById('btn-disk').onclick = () => {
    const output = document.getElementById('output');
    output.innerText = '> 正在运行越权探测测试...\n';
    
    try {
        // 测试 1: 尝试访问 require (Node.js 核心能力)
        output.innerText += '> [1] 正在探测 Node.js require...\n';
        if (typeof require !== 'undefined') {
            try {
                const os = require('os');
                output.innerText += "[FAILURE] 成功穿透！总内存: " + (os.totalmem() / 1024 / 1024 / 1024).toFixed(2) + " GB\n";
            } catch(e) {
                output.innerText += "[BLOCKED] require 存在但无法使用: " + e.message + "\n";
            }
        } else {
            output.innerText += "[SUCCESS] require 未定义，隔离层封堵了 Node.js 访问权限。\n";
        }

        // 测试 2: 尝试访问 Electron IPC 通道
        output.innerText += '\n> [2] 正在探测 IPC 通道...\n';
        if (window.ipcRenderer) {
            output.innerText += "[FAILURE] 成功检测到 ipcRenderer 泄露！\n";
        } else {
            output.innerText += "[SUCCESS] window.ipcRenderer 不可用。\n";
        }

        // 测试 3: 尝试执行系统命令 (仅为代码逻辑演示)
        output.innerText += '\n> [3] 尝试执行外部系统命令...\n';
        output.innerText += "[BLOCKED] 没有 child_process 权限，无法执行命令。\n";

        // 测试 4: 尝试跨协议读取本地文件
        output.innerText += '\n> [4] 尝试读取本地 C 盘敏感文件...\n';
        fetch('file:///C:/Windows/win.ini').then(() => {
            output.innerText += "[FAILURE] 成功突破协议限制！读取成功。\n";
        }).catch(err => {
            output.innerText += "[SUCCESS] 拦截成功！无法跨协议访问本地文件系统。\n";
        });

    } catch (e) {
        output.innerText += "\n[ERROR] 测试出现预期外异常: " + e.message + "\n";
    }
  };
</script>
```

**期望结果**：
1. 控制台和面板应显示 **[SUCCESS]** 相关的拦截提示。
2. 控制台可能会出现 `require is not defined` 的报错，这正是隔离成功的表现。

---

## TC-07: 受控文件系统访问验证 (Scoped FS Verification)
**目的**：验证隔离层是否能够安全地感知当前工作区目录，并阻止越界访问。

```html-preview
<div id="fs-test" style="padding: 15px; border: 1px solid hsl(var(--primary)); background: hsl(var(--background)); border-radius: 8px;">
  <h3 style="color: hsl(var(--primary));">[受控 FS 探测]</h3>
  <div style="margin-bottom: 15px; display: flex; gap: 10px; flex-wrap: wrap;">
    <button id="btn-list-root" style="padding: 8px 12px; cursor: pointer; background: hsl(var(--secondary)); border: 1px solid hsl(var(--border)); border-radius: 4px;">列出根目录 (./)</button>
    <button id="btn-read-self" style="padding: 8px 12px; cursor: pointer; background: hsl(var(--secondary)); border: 1px solid hsl(var(--border)); border-radius: 4px;">读取此测试文件</button>
    <button id="btn-attack-up" style="padding: 8px 12px; cursor: pointer; background: #fee2e2; color: #b91c1c; border: 1px solid #f87171; border-radius: 4px;">尝试越界 (../)</button>
  </div>
  <pre id="fs-output" style="
    background: #1e1e1e; 
    color: #4ade80; 
    padding: 15px; 
    font-size: 0.85em; 
    border-radius: 6px;
    min-height: 180px;
    max-height: 400px;
    overflow: auto;
    font-family: 'Fira Code', 'Courier New', monospace;
    line-height: 1.5;
  ">💡 等待指令，请点击上方按钮进行探测...</pre>
</div>

<script>
  const output = document.getElementById('fs-output');
  const log = (msg) => {
    output.innerText += msg + '\n';
    output.scrollTop = output.scrollHeight;
  };

  // 1. 列出根目录
  document.getElementById('btn-list-root').onclick = async () => {
    output.innerText = '> 请求目录列表 (./)...\n';
    try {
        const files = await bridge.fs.list('./');
        log('[SUCCESS] 获取成功！');
        log('前 3 项内容：' + JSON.stringify(files.slice(0, 3).map(f => f.name), null, 2));
        log('... 合计 ' + files.length + ' 个项目。');
    } catch (e) {
        log('❌ [FAILED] ' + e.message);
    }
  };

  // 2. 尝试越界
  document.getElementById('btn-attack-up').onclick = async () => {
    output.innerText = '> 请求越界探测 (../)...\n';
    try {
        await bridge.fs.list('../');
        log('😱 [SECURITY HOLE] 竟然成功越界了！系统存在严重漏洞。');
    } catch (e) {
        log('🛡️ [SUCCESS] 拦截成功！');
        log('错误详情: ' + e.message);
    }
  };

  // 3. 读取当前测试文件
  document.getElementById('btn-read-self').onclick = async () => {
    output.innerText = '> 请求读取此目录下的第一个文件...\n';
    try {
        const files = await bridge.fs.list('./');
        // 过滤掉文件夹，只找文件项目
        const target = files.find(f => !f.isDirectory);
        
        if (!target) {
            log('⚠️ [NOTICE] 当前层级没找到文件，尝试读取第一个目录项...');
            const fallback = files[0];
            if (!fallback) throw new Error('目录完全为空');
            const data = await bridge.fs.read(fallback.name);
            log('✅ [SUCCESS] 读取 "' + fallback.name + '" 成功 (可能是目录结构)');
            log(JSON.stringify(data, null, 2).substring(0, 200) + '...');
            return;
        }

        log('🔍 自动选中文件: ' + target.name);
        const content = await bridge.fs.read(target.name);
        const text = (typeof content === 'string') ? content : JSON.stringify(content, null, 2);

        log('✅ [SUCCESS] 读取成功！内容预览：');
        log('-----------------------------------');
        log(text.substring(0, 200) + '...');
        log('-----------------------------------');
    } catch (e) {
        log('❌ [FAILED] ' + e.message);
    }
  };
</script>
```

**期望结果**：
1. **“列出根目录”**：返回 JSON 格式的文件列表，包含 `name`, `path` 等字段（不含真实物理前缀）。
2. **“尝试越界”**：被 `IFrameBridge` 强行拦截并返回 `Access denied`。
3. **“读取此文件”**：在面板中显示本 Markdown 文件的源码片段。
