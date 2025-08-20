# 🔥 SpecShot

> 完成 Spec 保存的浏览器插件，辅助导出多个模型平台的会话上下文，可以跳转到 [官网](https://anyspecs.com) 进行分析和压缩，实现跨模型平台的上下文衔接。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Chrome Extension](https://img.shields.io/badge/platform-Chrome-green.svg)
![Version](https://img.shields.io/badge/version-latest-brightgreen.svg)

## 🎬 功能演示

<div align="center">
  <img src="./assets/PixPin_2025-08-13_10-03-39.gif" alt="SpecShot 功能演示" width="800">
</div>

## ✨ 功能特性

- 🚀 **一键导出**：以 Markdown 格式快速导出聊天记录
- 🖼️ **图片保存**：完整保存聊天过程中的图片内容
- 🔄 **跨平台衔接**：实现不同 AI 模型平台间的上下文无缝切换
- 📊 **数据分析**：配合官网进行会话数据分析和压缩
- 🎯 **多平台支持**：覆盖主流 AI 对话平台

## 🌐 支持平台

| 平台 | 状态 | 功能 |
|------|------|------|
| 🤖 ChatGPT | ✅ 支持 | 完整导出 |
| 🧠 Claude | ✅ 支持 | 完整导出 |
| 💎 Gemini | ✅ 支持 | 完整导出 |
| 🚀 豆包 (Doubao) | ✅ 支持 | 完整导出 |

## 📦 安装方式

### 方式一：Chrome 扩展商店（推荐）
1. 打开 Chrome 扩展商店
2. 搜索 `SpecShot`
3. 点击"添加至 Chrome"

### 方式二：手动安装
1. 前往 [Releases](https://github.com/anyspecs/SpecShot/releases) 页面
2. 下载最新版本的压缩包
3. 解压文件
4. 打开 Chrome 扩展管理页面 (`chrome://extensions/`)
5. 开启"开发者模式"
6. 点击"加载已解压的扩展程序"
7. 选择解压后的文件夹

## 🚀 使用方法

### 基本操作
1. **打开支持的 AI 平台**（GPT、Claude、Gemini、豆包）
2. **开始对话**，进行正常的聊天交互
3. **点击插件图标**，一键导出当前页面聊天    - 🖼️ 包含图片的完整记录！
4. **保存文件**到本地或上传到 [官方处理站](https://hub.anyspecs.cn/processor) 进行进一步处理

### 高级功能
- **上下文分析**：将导出的数据上传到官网进行智能分析
- **数据压缩**：优化长对话内容，提取核心信息
- **跨平台迁移**：在不同 AI 平台间无缝切换对话上下文

## 🎯 使用场景

- 📚 **学习记录**：保存与 AI 的学习对话，建立知识库
- 💼 **工作备份**：备份重要的工作相关 AI 对话
- 🔄 **平台切换**：在不同 AI 平台间保持对话连续性
- 📊 **数据分析**：分析对话模式，优化提问策略

## 🛠️ 技术栈

- **前端**：ts、html、css、js
- **架构**：wxt+react
- **数据格式**：Markdown, JSON
- **图片处理**：Base64 编码

## 🤝 贡献指南

我们欢迎所有形式的贡献！

### 贡献方式
- 🐛 报告 Bug
- 💡 提出新功能建议
- 📝 改进文档
- 🔧 提交代码修复

## 📋 开发计划

- [ ] 🌍 支持更多 AI 平台
- [ ] 📱 开发移动端支持
- [ ] 🔐 增加数据加密功能
- [ ] 🌐 多语言支持

## ❓ 常见问题

<details>
<summary>Q: 插件无法正常工作怎么办？</summary>

A: 请检查：
1. Chrome 版本是否为最新
2. 插件是否已启用
3. 目标网站是否在支持列表中
4. 尝试刷新页面后重新操作

</details>

<details>
<summary>Q: 导出的图片显示不正常？</summary>

A: 某些平台的图片可能有加载延迟，建议等待图片完全加载后再进行导出。

</details>

<details>
<summary>Q: 如何联系技术支持？</summary>

A: 可以通过以下方式联系我们：
- GitHub Issues
- 官网客服
- 邮箱支持

</details>

## 🔗 相关链接

- 🌐 [官方网站](https://anyspecs.com)
- 📖 [使用文档](https://docs.anyspecs.com)
- 🛒 [Chrome 扩展商店](https://chrome.google.com/webstore)
- 💬 [用户社区](https://community.anyspecs.com)

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

感谢所有用户的支持和反馈，让 SpecShot 变得更加完善！

---

<div align="center">
  <p>⭐ 如果这个项目对你有帮助，请给我们一个 Star！</p>
  <p>Made with ❤️ by <a href="https://anyspecs.com">AnySpecs Team</a></p>
</div>
