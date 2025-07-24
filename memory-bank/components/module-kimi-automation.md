# Kimi 自动化模块

## 模块概述
- **功能**: Kimi聊天页面的自动导出流程
- **策略**: 自动点击分享按钮 → 导出Word → 跳转解析网站
- **技术栈**: DOM操作 + 事件模拟 + 错误处理
- **状态**: 已完成核心功能，支持多域名检测和智能按钮选择

## 核心组件

### 1. 平台检测 (`platform.ts`)
```typescript
export function detectKimi(): boolean  // 支持3个域名变体
export function isKimiChatReady(): boolean  // 放宽检测条件
```

### 2. 自动化引擎 (`kimi.ts`)  
```typescript
export class KimiAutomation {
  async automateExport(): Promise<KimiAutomationResult>
  // 支持13个分享按钮选择器 + 9个导出按钮选择器
}
```

### 3. DOM点击器 (`dom-clicker.ts`)
```typescript
export class DOMClicker {
  static async findAndClick(selectors: string[]): Promise<ClickResult>
  // 增强多按钮智能选择 + 4种点击方法递进
}
```

### 4. 错误处理 (`error-handler.ts`)
```typescript
export class KimiErrorHandler {
  static createError(type: KimiError): ErrorResult
}
```

## 选择器策略(已验证)

### 分享按钮选择器 ✅ 
```typescript
'svg[name="Share_a"]'  // 最精确 - 已验证找到5个元素
'*[class*="icon"] svg[name="Share_a"]'  // 父容器匹配
'svg path[d*="M434.176 236.99456c0-66.92864"]'  // 路径特征
// 移除不支持的 :contains() 伪选择器
```

### 导出Word按钮选择器 ✅
```typescript
'div[data-v-182d5fe2][data-v-de32dd08].simple-button.main-button'  // 精确匹配
'svg[name="Document"]'  // SVG名称匹配
'.simple-button.main-button'  // 类名匹配
// 修复: 移除 :has()/:contains() 伪选择器语法错误
```

## 自动化流程(当前状态)

1. **平台检测** ✅ → 支持kimi.com/www.kimi.com/kimi.moonshot.cn
2. **页面准备** ✅ → 放宽聊天界面检测条件  
3. **分享按钮** ✅ → 成功点击(5个元素中选择合适的)
4. **等待弹窗** ✅ → 1秒延时等待分享面板
5. **导出Word** 🔧 → 智能选择第4个/最后一个按钮
6. **文件下载** ⏳ → 等待用户测试验证
7. **页面跳转** ⏳ → 解析网站导航

## 关键修复记录

### CSS选择器语法修复
- **问题**: `:has()` 和 `:contains()` 在某些浏览器不支持
- **修复**: 使用标准CSS选择器 `div[data-v-*].simple-button.main-button`
- **影响**: 从SyntaxError到成功元素定位

### 多按钮智能选择
- **发现**: 导出面板有4个相同的导出按钮
- **策略**: 自动选择最后一个(第4个)按钮
- **实现**: `shouldClickLast = description.includes('导出') && elements.length > 1`

### 点击方法增强
- **SVG元素优化**: 优先点击父容器而非SVG本身
- **递进策略**: 直接点击 → 父容器点击 → 事件派发 → 键盘事件
- **详细日志**: 每种点击方法的成功/失败状态

## 调试与日志(增强版)

### 详细控制台输出
```
🔍 开始寻找 导出Word按钮，选择器数量: 9
🎯 选择器 1/9 [div[data-v-182d5fe2][data-v-de32dd08].simple-button.main-button] 找到 4 个元素
🎯 找到4个导出按钮，将点击最后一个
📋 最后一个元素: 可点击=true {tagName: 'DIV', className: 'simple-button main-button'}
🖱️ 尝试点击最后一个导出按钮
✅ 点击方法 2 成功
✅ 导出Word按钮 点击成功！
```

## 技术债务与优化

### 已解决问题
- ❌ CSS伪选择器不兼容 → ✅ 标准选择器语法
- ❌ 单一按钮选择逻辑 → ✅ 多按钮智能选择  
- ❌ 简单点击方法 → ✅ 4种递进点击策略
- ❌ 缺少调试信息 → ✅ 详细元素查找日志

### 待优化项
- 解析网站跳转功能完善
- 下载状态检测与反馈
- 用户手动干预恢复机制
- 选择器的长期维护策略