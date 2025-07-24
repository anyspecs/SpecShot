# Project Overview

## 项目名称
AI Chat History Extractor - Browser Extension

## 技术栈
- **框架**: WXT (Web Extension Toolkit)
- **前端**: React + TypeScript
- **构建工具**: Vite (via WXT)
- **包管理**: npm

## 项目功能
浏览器扩展，支持从以下AI聊天平台提取对话历史:
- ChatGPT (chatgpt.com)
- Claude AI (claude.ai) 
- Poe (poe.com)

### 导出格式
- Markdown (.md)
- HTML (.html)
- 纯文本 (.txt)

## 架构设计

### WXT框架结构 (简化后)
```
📂 entrypoints/
├── 📄 background.ts          # 后台脚本 - 标签页管理、消息路由
├── 📄 content.ts             # 内容脚本 - 协调层，直接导入模块
├── 📂 popup/                 # 弹窗界面
│   ├── 📄 index.html
│   ├── 📄 main.tsx
│   ├── 📄 App.tsx           # React主组件
│   └── 📄 App.css           # 样式文件
├── 📂 export/               # 格式转换模块 (无index/types)
│   ├── 📄 markdown.ts       # Markdown处理+下载
│   ├── 📄 html.ts          # HTML处理+下载
│   └── 📄 text.ts          # 纯文本处理+下载
└── 📂 llm/                  # 平台提取器 (无index/types)
    ├── 📄 chatgpt.ts       # ChatGPT DOM解析
    ├── 📄 claude.ts        # Claude DOM解析
    ├── 📄 poe.ts          # Poe DOM解析
    └── 📄 platform.ts      # 平台检测
```

### 核心模块

#### 1. Background Script (background.ts)
- 监听标签页变化，启用/禁用扩展图标
- 处理popup与content script间的消息路由
- 支持的URL: chatgpt.com, claude.ai, poe.com

#### 2. Content Script (content.ts)
- 平台检测与DOM解析
- 对话内容提取与格式化
- 文件下载功能

#### 3. Popup Interface (React)
- 格式选择器 (markdown/html/plaintext)
- 提取按钮与调试日志
- 实时状态显示

## 开发规范

### WXT约定
- 入口点文件名决定功能类型
- defineContentScript/defineBackground API使用
- browser API (非chrome API) 优先使用
- TypeScript + 现代ES语法

### 消息通信
- Background ↔ Popup: runtime.sendMessage
- Background ↔ Content: tabs.sendMessage  
- 异步Promise模式，避免callback hell

### 模块化原则
- 平台特定逻辑分离 (llm/)
- 格式处理逻辑分离 (export/)
- 单一职责，松耦合设计