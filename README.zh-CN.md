# OpenContext

如果你第一次看到这个仓库，可能会有三个疑问：

- **这到底解决什么问题？**
- **对我有什么好处？**
- **我该怎么用？**

OpenContext 要解决的是：当你用 AI 助手做事时，**上下文会丢、历史决策会忘、跨天/跨仓库会断片**。你很容易重复解释背景、重复踩坑，甚至让 AI 在错误前提下继续执行。

OpenContext 是一个**面向 AI 助手（Agent）与 Cursor 用户**的“个人上下文/知识库”（Context Store）：把你日常做事过程中重要的背景、决策、规范、坑点沉淀成文档，并提供**可被工具调用**的读写入口，让 AI 助手能“先读历史再动手、做完再沉淀”。

它包含三类能力：

- **`oc` CLI**：初始化并管理你的全局 `contexts/` 文档库（创建目录/文档、生成清单、检索等）
- **`oc mcp`（给 IDE/Agent 平台用）**：启动 MCP Server（stdio），让 Cursor/Agent 通过工具调用读写 OpenContext
- **桌面版应用（可选）**：用桌面应用管理/搜索/编辑 contexts（基于 Tauri）
- **`oc ui`（可选）**：启动本地 Web UI 浏览/编辑文档（不装桌面版也能用）

你能获得的直接收益：

- **少解释**：AI 开始工作前先加载历史背景，不用你每次重复讲一遍
- **少踩坑**：把“已知坑/最佳实践/验收标准”沉淀为文档，后续自动复用
- **可追溯**：回答/决策可以带引用（稳定链接 `oc://doc/<stable_id>`），方便回溯
- **跨项目复用**：contexts 默认是全局的（`~/.opencontext/contexts`），切换仓库也能用同一套知识

## 安装

```bash
npm install -g opencontext
# 或者无需全局安装，直接用 npx：
# npx opencontext <command>
```

## 小白快速开始（先选一条路）

你可以按自己的使用方式选择：

- **我只是想要一个上下文/知识库管理工具** → 用 **桌面版应用（推荐）**（基础使用不需要 CLI / `oc init`）
- **我想和 Coding Agent / Cursor 配合**（slash commands / MCP tools）→ 安装 **CLI** 并运行 `oc init`

### 路径 A：桌面版应用（官方推荐）

桌面版适合大多数用户：像笔记软件一样管理 contexts（浏览/搜索/编辑），开箱即用。

- **直接使用**：从 GitHub Releases 下载桌面安装包
- **基础使用无需 `oc init`**

开发/本地运行（本仓库）：

```bash
npm run tauri:dev
```

构建桌面安装包（本仓库）：

```bash
npm run tauri:build
```

> 桌面版使用的是同一套 `contexts/` 与数据库。

### 路径 B：CLI + Coding Agent / Cursor 集成

如果你想让 IDE/Agent 平台通过 MCP 调用 OpenContext，并使用新手向 slash commands，建议使用 CLI。

#### 1) 运行 `oc init`（在“你要用的仓库”里跑一次就行）

`oc init` 每次都会同时做两件事：

- 准备 **全局** OpenContext 环境（contexts + 数据库）
- 同步 **当前仓库** 的集成产物（例如 `AGENTS.md`、`.cursor/commands`、`.cursor/mcp.json`）

所以你**不需要先单独做一次“全局 init”**。对小白来说，最简单的规则是：

- 第一次使用：在你要用 Cursor/Coding Agent 的那个仓库里运行一次 `oc init`，这一次就会把全局环境也准备好
- 之后如果你想在另一个仓库也用同样的 slash commands / MCP：就在那个仓库里再运行一次 `oc init`

重复执行是安全的（幂等）。当你更新了命令模板或想刷新项目产物时，也可以再跑一次。

```bash
oc init
```

默认会创建/使用：

- **文档库**：`~/.opencontext/contexts`
- **数据库**：`~/.opencontext/opencontext.db`

如需自定义位置，可设置环境变量（可选）：

```bash
export OPENCONTEXT_CONTEXTS_ROOT="/path/to/contexts"
export OPENCONTEXT_DB_PATH="/path/to/opencontext.db"
```

#### 2) 在 Cursor 里怎么用（面向小白的 5 个命令）

`oc init` 会在当前项目生成 Cursor 命令模板：`.cursor/commands/opencontext-*.md`，你在 Cursor 里直接输入这些 slash command 即可：

- **`/opencontext-help`**：不知道用哪个就用它
- **`/opencontext-context`**：开始做事前先加载背景（安全路径）
- **`/opencontext-search`**：想找“以前写过什么”就用它（默认不自动建索引）
- **`/opencontext-create`**：要新建一篇文档/想法就用它
- **`/opencontext-iterate`**：做完把结果沉淀回 OpenContext（带 Iteration Log + 引用）

> 重要：这些命令读取/写入的都是全局 OpenContext（默认 `~/.opencontext/contexts`），**不会把文档复制到你的项目仓库里**。

#### 3) 不用 Cursor 也能用（CLI 最小用法）

```bash
# 创建目录与文档（文档必须用 oc 创建/注册）
oc folder create project-a -d "某个项目"
oc doc create project-a design.md -d "设计文档"

# 生成“上下文清单”（给 AI 助手批量读取用）
oc context manifest project-a
```

## 搜索（/opencontext-search）与“索引成本”怎么理解？

OpenContext 的推荐读取路径是：

1. **不知道读什么**：先搜索（`/opencontext-search` 或 `oc search ... --format json`）缩小范围  
2. **确定候选**：再用 manifest 列出文件并逐个读取（`/opencontext-context` 或 `oc context manifest ...`）  
3. **回答/实现时记得引用**：优先使用 `oc://doc/<stable_id>`（稳定链接）

### 索引为何可能“不可用”？

语义搜索通常需要先构建索引（`oc index build`）。索引构建可能涉及 embedding 等外部成本，且随文档体量变化而波动，所以默认策略是：

- **不让 AI 助手自动触发 `oc index build`**
- 如果搜索提示索引缺失：就先降级走 **manifest + 文档描述/文件名筛选**，必要时你再手动决定要不要建索引

### 检索配置（桌面/Web 设置 + CLI 配置命令）

#### 哪些检索模式需要 embeddings？

- **`--mode keyword`**：纯关键词检索，**不需要 embeddings / 不需要 API Key**
- **`--mode vector`**：纯向量语义检索，**需要 embeddings**
- **`--mode hybrid`（默认）**：关键词 + 向量混合，**需要 embeddings**

#### 在哪里配置 embeddings

混合/向量检索需要 embeddings 配置。你可以在以下入口配置：

- **桌面版 / Web UI**：系统设置 → 全局配置（修改后重建索引）
- **CLI**：`oc config ...`（见下方“CLI 命令清单”）

#### CLI 配置项（embeddings）

OpenContext 使用以下配置项：

- **`EMBEDDING_API_KEY`**（敏感）：Embedding 服务的 API Key  
- **`EMBEDDING_API_BASE`**：API Base（默认 `https://api.openai.com/v1`）  
- **`EMBEDDING_MODEL`**：模型名（默认 `text-embedding-3-small`）  

优先级顺序：**环境变量 > 配置文件 > 默认值**。  
可用 `oc config list` 查看当前生效配置。

#### 常见 CLI 配置流程

```bash
oc config list
oc config set EMBEDDING_API_KEY "<your_key>"
oc config set EMBEDDING_API_BASE "https://api.openai.com/v1"
oc config set EMBEDDING_MODEL "text-embedding-3-small"

# 查看配置文件路径：
oc config path

# 配置修改后重建索引：
oc index build
```

#### 验证配置与检索

```bash
# 检查索引是否存在/就绪：
oc index status

# 先跑一个纯关键词检索（不依赖 embeddings/索引）：
oc search "你的关键词" --mode keyword --format json

# 再跑混合检索（需要索引 + embeddings）：
oc search "你的关键词" --mode hybrid --format json
```

> 注意：修改 embeddings 配置后必须 `oc index build` 重建索引才会生效。API Key 不要写进 git，也不要粘贴进文档/issue。

## MCP（给 VibeCoding IDE / Agent 平台用）

如果你的 IDE/平台支持 MCP（例如 Cursor），OpenContext 提供 `oc mcp` 作为 MCP server（stdio）。

- **手动启动**：

```bash
oc mcp
```

- **自动配置（Cursor）**：从当前版本开始，`oc init` 会在项目里生成 `.cursor/mcp.json`，自动注册名为 `opencontext` 的 MCP server（指向 `oc mcp`）。

> 你一般不需要自己写 MCP 配置；先跑 `oc init`，再在 Cursor 里用 `/opencontext-*` 命令即可。

## CLI 命令清单（完整）

具体参数以 `oc <cmd> --help` 为准。

| 分类 | 命令 | 说明 |
|---|---|---|
| 初始化 | `oc init` | 初始化 contexts + 数据库，并生成项目侧产物 |
| 目录 | `oc folder ls [--all]` | 列出目录 |
| 目录 | `oc folder create <path> -d "<desc>"` | 创建目录 |
| 目录 | `oc folder rename <old_path> <new_name>` | 重命名目录 |
| 目录 | `oc folder rm <path> [--force]` | 删除目录（可递归） |
| 文档 | `oc doc ls <folder_path> [--recursive]` | 列出目录下文档 |
| 文档 | `oc doc create <folder_path> <name>.md -d "<desc>"` | 创建/注册文档 |
| 文档 | `oc doc mv <doc_path> <new_folder_path>` | 移动文档 |
| 文档 | `oc doc rename <doc_path> <new_name>` | 重命名文档 |
| 文档 | `oc doc rm <doc_path>` | 删除文档 |
| 文档 | `oc doc set-desc <doc_path> "<summary>"` | 更新文档描述（用于筛选/检索） |
| 文档 | `oc doc id <doc_path>` | 获取 stable_id（UUID） |
| 文档 | `oc doc resolve <stable_id>` | 解析 stable_id 到当前路径/元数据 |
| 文档 | `oc doc link <doc_path> [--label <label>]` | 生成 `oc://doc/<stable_id>` 稳定链接 |
| 文档 | `oc doc open <doc_path>` | 用编辑器打开文档 |
| Manifest | `oc context manifest <folder_path> [--limit N]` | 输出 JSON 文档清单（供批量读取） |
| 检索 | `oc search "<query>" --format json ...` | 搜索（可选 mode/type/limit） |
| 索引 | `oc index build [--force] [--folder <folder>]` | 构建/更新索引 |
| 索引 | `oc index status` | 查看索引状态 |
| 索引 | `oc index clean` | 清除/重置索引 |
| 配置 | `oc config set <KEY> <VALUE>` | 设置配置（如 embeddings） |
| 配置 | `oc config get <KEY>` | 读取配置 |
| 配置 | `oc config unset <KEY>` | 删除配置 |
| 配置 | `oc config list` | 列出配置（敏感值会脱敏） |
| 配置 | `oc config path` | 输出配置文件路径 |
| 服务 | `oc mcp [--test]` | 启动 MCP server（stdio） |
| UI | `oc ui [--port <port>] [--host <host>] [--no-open]` | 启动 Web UI |

## Web UI（实验功能）

运行：

```bash
oc ui
```

CLI 会直接使用已经打包好的 UI 资源，启动本地服务（默认 `http://127.0.0.1:4321`）并自动打开浏览器。界面支持：

- 浏览空间/文档列表；
- 预览、编辑并保存 Markdown 文档；
- 与 CLI 共用同一 `contexts/` 与数据库。

可用参数：

- `--port <port>`：自定义端口；
- `--host <host>`：自定义监听地址；
- `--no-open`：启动后不自动打开浏览器。

> 默认发布到 npm 的包已经包含 `dist/ui` 静态资源。仅当本地开发 UI 时，才需要手动运行 `npm run ui:dev` 或 `npm run ui:build`。


