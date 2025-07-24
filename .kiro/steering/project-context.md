# 项目上下文

## 项目概述

这是一个基于 WXT 框架的浏览器扩展项目，用于从 AI 聊天平台（ChatGPT、Claude、Poe）提取对话历史并导出为多种格式。

## 技术栈

- **框架**: WXT (Web Extension Toolkit)
- **前端**: React + TypeScript
- **构建工具**: Vite (通过 WXT)
- **包管理**: npm

## 项目结构

- `entrypoints/` - WXT 入口点文件
  - `background.ts` - 后台脚本
  - `content.ts` - 内容脚本
  - `popup/` - 弹窗界面 (React)
  - `llm/` - 各平台的 DOM 解析器
  - `export/` - 导出格式处理器
- `memory-bank/` - 项目文档和上下文
- `public/` - 静态资源

## 开发规范

- 使用 TypeScript 严格模式
- 遵循 WXT 框架约定
- 模块化设计，单一职责原则
- 使用现代 ES 语法和 Promise 模式
- 优先使用 browser API 而非 chrome API

## 构建命令

- `npm run dev` - 开发模式 (Chrome)
- `npm run dev:firefox` - 开发模式 (Firefox)
- `npm run build` - 生产构建
- `npm run zip` - 打包扩展
