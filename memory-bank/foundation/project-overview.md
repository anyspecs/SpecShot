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
- ChatGPT (chatgpt.com) - 直接DOM解析
- Claude AI (claude.ai) - 直接DOM解析
- Poe (poe.com) - 直接DOM解析
- Kimi (kimi.moonshot.cn) - 自动化操作模式

### 导出格式
- Markdown (.md)
- HTML (.html)
- 纯文本 (.txt)

## 架构设计

### WXT框架结构 (支持Kimi自动化)
```
📂 entrypoints/
├── 📄 background.ts          # 后台脚本 - 标签页管理、消息路由
├── 📄 content.ts             # 内容脚本 - 双模式协调层
├── 📂 popup/                 # 弹窗界面
│   ├── 📄 index.html
│   ├── 📄 main.tsx
│   ├── 📄 App.tsx           # React主组件(支持Kimi反馈)
│   └── 📄 App.css           # 样式文件
├── 📂 export/               # 格式转换模块 
│   ├── 📄 markdown.ts       # Markdown处理+下载
│   ├── 📄 html.ts          # HTML处理+下载
│   └── 📄 text.ts          # 纯文本处理+下载
├── 📂 llm/                  # 平台处理器
│   ├── 📄 chatgpt.ts       # ChatGPT DOM解析
│   ├── 📄 claude.ts        # Claude DOM解析
│   ├── 📄 poe.ts          # Poe DOM解析
│   ├── 📄 kimi.ts         # Kimi自动化操作
│   └── 📄 platform.ts      # 平台检测(含Kimi)
└── 📂 automation/           # 自动化操作模块
    ├── 📄 dom-clicker.ts   # DOM元素智能点击
    ├── 📄 error-handler.ts # 错误处理和用户指导
    └── 📄 parser-navigator.ts # 解析网站导航
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