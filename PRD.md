# 简易 AI 客户端工具需求文档 (类似 Cherry Studio)

## 1. 项目概述
本项目旨在开发一个轻量级的桌面 AI 客户端工具，核心功能聚焦于 **多模型对话** 与 **MCP (Model Context Protocol) 支持**。目标是提供一个简洁、高效的本地化工具，方便用户连接不同的 LLM 服务商并利用 MCP 扩展能力。

## 2. 核心功能需求

### 2.1 模型服务商配置 (Model Provider Configuration)
- **支持标准 OpenAI 兼容接口**：
  - 用户可配置 `Base URL` (例如：DeepSeek, SiliconFlow, OpenRouter, LocalAI 等)。
  - 用户可配置 `API Key`。
  - 用户可自定义添加/编辑/删除模型列表（Model List）。
- **当前选中模型切换**：在对话界面快速切换当前使用的模型。

### 2.2 对话功能 (Chat Interface)
- **基础对话交互**：
  - 用户输入与 AI 响应。
  - 支持 **Markdown 渲染** (表格、列表、数学公式等)。
  - 支持 **代码高亮** 及代码块复制。
  - 支持 **流式输出 (Streaming)**。
- **会话管理**：
  - 创建新会话。
  - 历史会话列表（按时间排序）。
  - 删除会话。
  - (可选) 会话标题自动生成。

### 2.3 MCP (Model Context Protocol) 支持
- **MCP Client 实现**：
  - 能够连接并管理本地 MCP Servers。
  - 支持 `stdio` 传输模式（运行本地脚本/可执行文件）。
- **工具调用 (Tool Use)**：
  - 模型可根据用户 prompt 自动调用已连接的 MCP 工具。
  - 界面需展示工具调用的状态（调用中、结果返回）。
- **配置界面**：
  - 添加/删除 MCP Server 配置（Command, Args, Environment Variables）。
  - 查看当前连接状态（Connected/Disconnected）。

### 2.4 设置与存储
- **本地数据存储**：所有配置（Key, URL, MCP Config）及聊天记录均存储在本地（如 JSON 文件或 SQLite）。
- **系统设置**：简单的主题切换（Light/Dark）。

## 3. 非功能性需求
- **平台支持**：Windows (优先), macOS, Linux。
- **性能**：启动快，资源占用低。
- **安全性**：API Key 仅本地存储，不上传至任何第三方服务器（除直接请求模型API外）。

## 4. 建议技术栈
考虑到需要通过 `stdio` 与本地 MCP Server 进程通信，以及跨平台桌面应用的需求：
- **框架**: [Electron](https://www.electronjs.org/) (成熟稳定，原生 Node.js 支持方便实现 stdio MCP 连接)
- **UI 库**: React + Vite + Tailwind CSS (现代、高效、美观)
- **语言**: TypeScript (全栈类型安全)
- **状态管理**: Zustand 或 React Context
- **数据持久化**: electron-store 或 lowdb

## 5. 开发计划 (Draft)
1. **初始化**: 搭建 Electron + Vite + React 基础脚手架。
2. **核心一**: 实现设置页面，支持配置 OpenAI 兼容的模型参数。
3. **核心二**: 开发聊天界面，打通 LLM 流式对话。
4. **核心三**: 实现 MCP Client 逻辑，支持配置和运行本地 MCP Server。
5. **集成**: 让 LLM 能够识别并调用 MCP 工具。
6. **优化与发布**: UI 美化、打包构建。
