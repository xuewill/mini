# 技术架构设计文档 (Tech Specs)

## 1. 技术选型概述

本项目将构建一个基于 Web 技术的现代桌面应用，旨在提供流畅的 AI 对话体验及强大的 MCP 扩展能力。

### 核心技术栈

- **应用框架**: **Electron** (主进程管理与跨平台桌面能力)
- **UI 框架**: **React 19** + **Vite** (高性能前端构建)
- **样式方案**: **Tailwind CSS** (原子化 CSS) + **shadcn/ui** (基于 Radix UI 的组件库)
- **AI 交互层**: **Vercel AI SDK** (标准化 AI 流式交互)
  - `ai`: 核心 SDK，用于构建后端/主进程逻辑。
  - `@ai-sdk/react`: React Hooks (如 `useChat`, `useCompletion`)。
  - `@ai-sdk/openai`: OpenAI 兼容Provider (适用于 DeepSeek, Ollama 等)。

## 2. 系统架构设计

### 2.1 进程模型 (Process Model)

由于 AI SDK 设计初衷是为 Server/API 环境服务，我们将采用 **"内置本地服务器" (Local Server)** 模式来适配 Electron 架构。

- **Main Process (主进程)**
  - 启动并管理一个轻量级 HTTP Server (使用 **Hono** 或 **Express**)，监听本地随机端口。
  - 提供 `/api/chat` 等标准API路由，供前端 AI SDK 调用。
  - 负责 **MCP Client** 的核心逻辑（启动子进程、管理 stdio 通信）。
  - 处理原生系统交互（文件读写、窗口管理）。

- **Renderer Process (渲染进程)**
  - 运行 React 应用。
  - 使用 `useChat` Hook 直接连接 `http://localhost:<port>/api/chat`。
  - 专注于 UI 渲染与状态展示。

### 2.2 数据流向 (Data Flow)

1. **用户输入** -> Renderer (`useChat`) -> HTTP Request (POST /api/chat) -> Main Process (Local Server)。
2. **Main Process** 解析请求 -> 调用 `streamText` (AI SDK)。
3. **工具调用 (Tool Call)**:
   - 如果模型请求调用工具 -> Main Process 拦截 -> 查找对应的 MCP Client -> 通过 stdio 执行 MCP 工具 -> 获取结果。
   - 结果回传给模型 -> 模型生成最终回答。
4. **流式响应** -> HTTP Response (Streaming) -> Renderer (`useChat`) ->Markdown 渲染。

## 3. 详细模块设计

### 3.1 AI SDK 集成

- **Provider 适配**: 使用 `@ai-sdk/openai` 创建 openai provider 实例，但在 `baseURL` 处支持用户自定义配置（连接 DeepSeek, Ollama 等）。
- **Stream 实现**: 使用 `streamText`，并将 MCP 工具转换为 AI SDK 标准 `tools` 定义。

### 3.2 Model Context Protocol (MCP) Client

- **管理模块**: 实现一个 `McpManager` 类。
- **连接方式**: `stdio` transport。
- **Server 配置**:
  - 存储 MCP Server 配置（名称、命令、参数、环境变量）。
  - 启动时根据配置 spawn 子进程。
- **工具转换**: 将 MCP Server 暴露的 `tools/list` 转换为 AI SDK 的 `zod` schema 格式，实现 `execute` 方法的桥接。

### 3.3 本地数据持久化

- 使用 `electron-store` 存储：
  - 用户设置 (Settings): API Key, Base URL, Model List。
  - MCP 配置 (MCP Config): Servers list。
  - 会话历史 (Chat History): 本地存储聊天记录概要。

## 4. 关键交互流程

### 4.1 启动流程

1. Electron App 启动。
2. Main Process 初始化 `electron-store` 读取配置。
3. Main Process 启动本地 API Server (例如 port 3000 或随机)。
4. 创建 BrowserWindow 加载 React 应用。
5. React 应用初始化，通过 `preload` 获取 API Server 端口。

### 4.2 对话与工具调用流程

1. 用户在聊天框输入 "读取 user.txt 文件内容"。
2. `useChat` 发送请求至 `/api/chat`。
3. `streamText` 调用模型，传入系统提示词和 `tools` 定义（包含已连接的 MCP 工具）。
4. 模型判断需要调用 `read_file` 工具。
5. Main Process 接收到 `tool_call`，通过 MCP 连接发送 `tools/call` 请求。
6. MCP Server 执行文件读取，返回内容。
7. Main Process 将结果作为 `tool_result` 再次发送给模型。
8. 模型根据文件内容生成自然语言回答。
9. 前端实时渲染流式文本。

## 5. 项目结构规划 (Monorepo-like / Standard Electron structure)

```
/
├── electron/
│   ├── main.ts          # 主进程入口
│   ├── server.ts        # 本地 API Server (Hono/Express)
│   ├── mcp/             # MCP Client 核心逻辑
│   │   ├── manager.ts
│   │   └── client.ts
│   └── preload.ts
├── src/                 # React 源码
│   ├── components/      # UI 组件 (shadcn/ui)
│   ├── hooks/           # useChat, useSettings
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

## 6. 后续扩展考虑

- **插件系统**: 基于 MCP 的插件市场。
- **RAG 支持**: 集成向量数据库支持本地知识库。
- **多模态**: 支持图片/文件上传与解析。
