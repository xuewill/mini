# 详细开发计划 (Todo List)

## Phase 1: 项目初始化与基础架构

### 1.1 脚手架搭建

- [x] 初始化 Electron + Vite + React TypeScript 项目。
- [x] 配置 Tailwind CSS。
- [x] 安装并配置 shadcn/ui (Button, Input, ScrollArea, Dialog 等基础组件)。
- [x] 配置 `electron-vite` 或手动配置 Main/Renderer 进程构建流程。
- [x] 配置路径别名 (@/ -> src/)。

### 1.2 核心依赖安装

- [x] 安装 Vercel AI SDK: `ai`, `@ai-sdk/react`, `@ai-sdk/openai`。
- [x] 安装 Zod (Schema 定义)。
- [x] 安装 electron-store (本地持久化)。
- [x] 安装 Lucide React (图标库)。

### 1.3 Main Process 基础服务

- [x] 实现本地 HTTP Server (Hono/Express) 运行在 Main Process。
- [x] 打通 IPC 通信 (Renderer -> Main) 用于窗口控制、文件选择等原生能力。

## Phase 2: 设置与配置管理 (Settings & Config)

### 2.1 数据存储层

- [x] 封装 `StorageService` (基于 electron-store)。
  - `settings`: API BaseURL, API Key, Model List。
  - `mcp_servers`: MCP Server 配置列表。

### 2.2 设置界面开发

- [x] 实现设置侧边栏/弹窗路由。
- [x] **模型配置**:
  - [x] Base URL 输入框 (默认预设几个常用)。
  - [x] API Key 输入框 (加密存储或仅本地保存)。
  - [x] 模型列表管理 (Add/Edit/Delete)。
- [x] **MCP Server 配置**:
  - [x] Server 列表展示。
  - [x] 添加 Server 表单 (Name, Command, Args, Env)。
  - [x] Server 连接状态检测按钮。

## Phase 3: 核心对话功能 (Chat Core)

### 3.1 界面布局

- [x] 侧边栏: 历史会话列表 (使用 sticky layout)。
- [x] 主区域: 对话流展示 (ScrollArea)。
- [x] 输入区域: Auto-resizing Textarea, Send Button, Stop Button。

### 3.2 AI SDK 集成

- [x] Main Process:
  - [x] 实现 `/api/chat` 路由。
  - [x] 集成 `streamText`，连接用户配置的 OpenAI compatible API。
- [x] Renderer Process:
  - [x] 使用 `useChat` hook。
  - [x] 实现消息列表渲染 (`UserMessage`, `AssistantMessage` 组件)。
  - [x] Markdown 渲染组件 (`react-markdown` + `remark-gfm` + 代码高亮)。

### 3.3 会话管理

- [x] 实现新建会话、删除会话逻辑。
- [x] 历史记录持久化 (存储在本地 JSON)。

## Phase 4: MCP Client 集成 (Model Context Protocol)

### 4.1 MCP Client 核心 (Main Process)

- [x] 实现 `McpClientManager` 单例 (`mcp-manager.ts`)。
- [x] 支持 `stdio` transport 启动子进程 (`StdioClientTransport`)。
- [x] 实现 `connect()`, `disconnect()`, `listTools()` 方法。
- [x] 将 MCP Tools 转换为 AI SDK `tools` 格式 (`jsonSchema()` + `tool()`)。
- [x] 应用启动时自动初始化连接，退出时优雅关闭。
- [x] Settings 页面增加 Reconnect 按钮和实时连接状态。

### 4.2 工具调用流程

- [x] 在 `/api/chat` 中注入 `tools` 参数。
- [x] 使用 `streamText` + `stepCountIs(5)` 实现服务端透明工具执行：
  - [x] LLM 返回 tool call → AI SDK 自动路由到 MCP Client 执行。
  - [x] 获取结果后自动追加到上下文，继续生成回复。
  - [x] 最终仅将文本流式传输到前端 (`toTextStreamResponse`)。

### 4.3 UI 反馈

- [x] 聊天界面显示 "Using tool..." 状态指示器。
- [x] (可选) 展示工具调用的输入输出详情 (折叠面板)。

## Phase 5: 优化与打包 (Polish & Build)

- [x] 错误处理 (API 错误, 网络超时, MCP 进程崩溃)。
- [x] UI/UX 细节优化 (Toast 提示, Loading 动画, 自动滚动)。
- [x] Dark Mode 适配。
- [ ] 打包构建 (electron-builder)。

## Phase 6: Future Roadmap & Improvements

### 6.1 Security & Architecture

- [ ] **Enable Context Isolation**: Currently `contextIsolation` is disabled. We should enable it and use `contextBridge` properly in `preload/index.ts`.
- [ ] **Secure IPC**: Refactor `ipcRenderer` usage in React components to use a strongly-typed `window.api` object instead of direct `ipcRenderer.invoke`.
- [ ] **Type Safety**: Remove `any` usage in `mcp-manager.ts` and `useSimpleChat.ts`. Define proper Zod schemas or interfaces for all data structures.

### 6.2 Features & UX

- [ ] **Markdown Improvements**: Add support for Tables, Math (KaTeX), and Mermaid diagrams in the chat interface.
- [ ] **Stop Generation**: Verify backend support for abort signals ensures the LLM actually stops generating tokens to save costs/time.
- [ ] **Auto-Scroll Control**: Add a "Scroll to Bottom" button when the user scrolls up during generation.

### 6.3 Reliability & DevOps

- [ ] **Log Rotation**: Implement log rotation for `electron-log` to prevent large log files.
- [ ] **CI/CD**: Set up GitHub Actions for automated build and release of Electron binaries.
- [ ] **Unit Tests**: Add Vitest for unit testing utility functions and hooks.。
