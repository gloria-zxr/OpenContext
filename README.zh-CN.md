<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/logo-dark.png">
    <source media="(prefers-color-scheme: light)" srcset="docs/images/logo-light.png">
    <img alt="OpenContext Logo" src="docs/images/logo-light.png" width="350">
  </picture>

  <p>
    <strong>给你的 AI 助手一个持久记忆。</strong><br>
    不再重复解释，专注高效构建。
  </p>

  <!-- Demo GIF -->
  <img src="docs/images/folder-refer-git.gif" alt="OpenContext Demo" width="700">

  <p>
    <a href="https://www.npmjs.com/package/@aicontextlab/cli"><img src="https://img.shields.io/npm/v/@aicontextlab/cli.svg?style=flat-square&color=cb3837" alt="npm version"></a>
    <a href="https://github.com/0xranx/OpenContext/blob/main/LICENSE"><img src="https://img.shields.io/github/license/0xranx/OpenContext?style=flat-square" alt="license"></a>
  </p>

  <p>
    <a href="https://0xranx.github.io/OpenContext/zh/"><strong>🌐 官网</strong></a> · 
    <a href="https://0xranx.github.io/OpenContext/zh/usage/"><strong>📖 使用指南</strong></a> · 
    <a href="https://github.com/0xranx/OpenContext/releases"><strong>⬇️ 下载桌面版</strong></a>
  </p>

  <p><a href="README.md">English</a></p>
</div>

---

## 痛点

当你用 AI 助手做事时，**上下文会丢、历史决策会忘、跨天/跨仓库会断片**。你很容易重复解释背景、重复踩坑，甚至让 AI 在错误前提下继续执行。

## 解决方案

OpenContext 是一个面向 AI 助手（Agent）与 Cursor 用户的「个人上下文/知识库」。把重要的背景、决策、规范沉淀成文档，让 AI 助手能「先读历史再动手、做完再沉淀」。

| 使用前 | 使用后 |
|-------|-------|
| 📂 跨 repo/会话 共享上下文很难 | ✅ 全局知识库，跨项目复用 |
| 🤷 自己的想法无法快速被 Agent 感知到 | ✅ Agent 自动加载你的背景和决策 |
| 🔒 现有知识内容无法直接通过 Coding Agent 操作 | ✅ Agent 可以直接读写你的知识库 |

## 包含什么

- **`oc` CLI** — 管理全局 `contexts/` 文档库（目录/文档、清单、检索）
- **MCP Server** — 让 Cursor/Agent 通过工具调用 OpenContext
- **桌面版应用** — 用原生 UI 管理/搜索/编辑 contexts
- **Web UI** — 本地浏览/编辑文档（无需安装桌面版）

## 快速开始

### 安装 CLI

```bash
npm install -g @aicontextlab/cli
```

### 选择你的路径

| 路径 | 适合人群 | 开始使用 |
|-----|---------|---------|
| 🖥️ **桌面版应用** | 喜欢图形界面的用户 | [从 Releases 下载](https://github.com/0xranx/OpenContext/releases) |
| ⌨️ **CLI + Cursor** | 使用 Cursor/AI Agent 的开发者 | `npm install -g @aicontextlab/cli && oc init` |
| 🔧 **仅 CLI** | 高级用户、自动化场景 | `npm install -g @aicontextlab/cli` |

### 30 秒上手（CLI + Cursor）

```bash
# 1. 安装
npm install -g @aicontextlab/cli

# 2. 在你的项目中初始化
cd your-project
oc init

# 3. 在 Cursor 中使用斜杠命令
#    /opencontext-context  — 开始工作前加载背景
#    /opencontext-search   — 查找相关文档
#    /opencontext-create   — 创建新文档
#    /opencontext-iterate  — 沉淀学到的内容
```

> 📖 **详细使用指南、搜索配置和常见问题，请访问[官网](https://0xranx.github.io/OpenContext/zh/usage/)。**

---

## CLI 命令（快速参考）

运行 `oc <cmd> --help` 查看详情。

| 命令 | 说明 |
|-----|------|
| `oc init` | 在项目中初始化 OpenContext |
| `oc folder ls` | 列出目录 |
| `oc folder create <path> -d "desc"` | 创建目录 |
| `oc doc create <folder> <name>.md -d "desc"` | 创建文档 |
| `oc doc ls <folder>` | 列出文档 |
| `oc context manifest <folder>` | 生成文档清单供 AI 读取 |
| `oc search "query"` | 搜索文档 |
| `oc mcp` | 启动 MCP Server（给 Cursor 用） |
| `oc ui` | 启动本地 Web UI |

> 📖 **完整命令参考请访问[官网](https://0xranx.github.io/OpenContext/zh/usage/)。**

---

## 开发

```bash
# 克隆并安装
git clone https://github.com/0xranx/OpenContext.git
cd OpenContext && npm install

# 桌面版应用
npm run tauri:dev    # 开发模式
npm run tauri:build  # 生产构建

# Web UI
npm run ui:dev       # 开发模式
npm run ui:build     # 生产构建
```

---

## 许可证

MIT © [OpenContext](https://github.com/0xranx/OpenContext)
