# 编码规范

## TypeScript 规范

- 使用严格的 TypeScript 配置
- 为所有函数和变量提供明确的类型注解
- 优先使用接口 (interface) 而非类型别名 (type) 定义对象结构
- 使用枚举 (enum) 管理常量集合

## WXT 框架规范

- 使用 `defineContentScript()` 和 `defineBackground()` API
- 入口点文件名决定功能类型，遵循 WXT 约定
- 使用 `browser` API 而非 `chrome` API
- 消息通信使用 Promise 模式，避免回调地狱

## React 组件规范

- 使用函数组件和 Hooks
- 组件名使用 PascalCase
- Props 接口以组件名 + Props 命名
- 使用 TypeScript 严格类型检查

## 模块化设计

- 每个模块职责单一，功能内聚
- 平台特定逻辑分离到 `llm/` 目录
- 格式处理逻辑分离到 `export/` 目录
- 避免循环依赖

## 错误处理

- 使用 try-catch 包装异步操作
- 提供有意义的错误消息
- 在 popup 界面显示用户友好的错误信息
- 记录详细的调试信息

## 命名约定

- 文件名使用 kebab-case
- 变量和函数使用 camelCase
- 常量使用 UPPER_SNAKE_CASE
- 类和接口使用 PascalCase
