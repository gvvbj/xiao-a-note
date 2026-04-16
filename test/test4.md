```html-preview
<div id="security-a-result">A 运行中...</div>
<script>
(function () {
  const output = document.getElementById('security-a-result');
  try {
    const title = window.parent.document.title;
    console.log('[TEST][A] parent title =', title);
    output.textContent = 'A 失败：拿到了父窗口 DOM';
  } catch (error) {
    console.log('[TEST][A] blocked =', error.name, error.message);
    output.textContent = 'A 成功：父窗口 DOM 访问被拦截';
  }
})();
</script>
```


```html-preview
<div id="security-b-result">B 运行中...</div>
<script>
(function () {
  const output = document.getElementById('security-b-result');
  try {
    const api = window.top.electronAPI;
    console.log('[TEST][B] top.electronAPI =', api);
    if (api) {
      output.textContent = 'B 失败：拿到了 electronAPI';
      return;
    }
    output.textContent = 'B 成功：未暴露 electronAPI';
  } catch (error) {
    console.log('[TEST][B] blocked =', error.name, error.message);
    output.textContent = 'B 成功：访问 electronAPI 被拦截';
  }
})();
</script>
```


```html-preview
<div id="security-c-result">C 运行中...</div>
<script>
(async function () {
  const output = document.getElementById('security-c-result');
  if (!window.bridge || !window.bridge.fs || typeof window.bridge.fs.list !== 'function') {
    console.log('[TEST][C] bridge.fs unavailable');
    output.textContent = 'C 失败：bridge.fs 不可用';
    return;
  }

  try {
    const entries = await window.bridge.fs.list('.');
    console.log('[TEST][C] entries =', Array.isArray(entries) ? entries.length : entries);
    output.textContent = 'C 成功：bridge.fs.list(.) 返回工作区内容';
  } catch (error) {
    console.log('[TEST][C] error =', error.message);
    output.textContent = 'C 失败：工作区内受控读取未成功';
  }
})();
</script>
```


```html-preview
<div id="security-d-result">D 运行中...</div>
<script>
(async function () {
  const output = document.getElementById('security-d-result');
  try {
    await window.bridge.fs.read('../../../../outside.txt');
    console.log('[TEST][D] unexpected success');
    output.textContent = 'D 失败：越界路径被读取';
  } catch (error) {
    console.log('[TEST][D] blocked =', error.message);
    output.textContent = 'D 成功：越界路径被拒绝';
  }
})();
</script>
```


```html-preview
<div id="security-c-result">C 运行中...</div>
<script>
(async function () {
  const output = document.getElementById('security-c-result');
  const waitForBridge = async (retry = 20) => {
    for (let i = 0; i < retry; i += 1) {
      if (window.bridge && window.bridge.fs && typeof window.bridge.fs.list === 'function') {
        return window.bridge;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return null;
  };

  const bridge = await waitForBridge();
  if (!bridge) {
    console.log('[TEST][C] bridge.fs unavailable after wait');
    output.textContent = 'C 失败：bridge.fs 在等待后仍不可用';
    return;
  }

  try {
    const entries = await bridge.fs.list('.');
    console.log('[TEST][C] entries =', Array.isArray(entries) ? entries.length : entries);
    output.textContent = 'C 成功：bridge.fs.list(.) 返回工作区内容';
  } catch (error) {
    console.log('[TEST][C] error =', error.message);
    output.textContent = 'C 失败：工作区内受控读取未成功';
  }
})();
</script>
```
