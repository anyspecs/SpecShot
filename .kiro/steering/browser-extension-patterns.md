---
inclusion: fileMatch
fileMatchPattern: "entrypoints/**"
---

# 浏览器扩展开发模式

## WXT 框架模式

- 使用 `defineContentScript()` 定义内容脚本
- 使用 `defineBackground()` 定义后台脚本
- 入口点文件放在 `entrypoints/` 目录下
- 文件名决定扩展组件类型

## 消息通信模式

```typescript
// Background 到 Content Script
const response = await browser.tabs.sendMessage(tabId, {
  action: "extract",
  format: "markdown",
});

// Popup 到 Background
const response = await browser.runtime.sendMessage({ action: "getCurrentTab" });

// Content Script 响应
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 处理消息并返回响应
  return Promise.resolve(response);
});
```

## DOM 解析模式

- 使用 `querySelector` 和 `querySelectorAll` 选择元素
- 实现平台特定的选择器策略
- 处理动态加载的内容
- 提供降级方案处理 DOM 变化

## 文件下载模式

```typescript
// 创建下载链接
const blob = new Blob([content], { type: "text/plain" });
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = filename;
a.click();
URL.revokeObjectURL(url);
```

## 权限管理

- 在 manifest 中声明必要的权限
- 使用 `activeTab` 权限访问当前标签页
- 避免请求过多权限

## 平台兼容性

- 支持 Chrome 和 Firefox
- 使用 `browser` API 而非 `chrome` API
- 测试不同浏览器的行为差异
