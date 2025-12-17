# OpenContext

[中文文档](README.zh-CN.md)

If you’ve never heard of OpenContext, you’re probably wondering:

- What problem does this solve?
- What do I get out of it?
- How do I start using it (without learning a bunch of internals)?

OpenContext solves a very practical pain: when you use an AI assistant to build things, **context gets lost** (across days, repos, chats). You end up re-explaining background, repeating decisions, and sometimes the assistant continues with the wrong assumptions.

OpenContext is a lightweight **personal context / knowledge store** for AI assistants (Agents) and Cursor users. You write down important project context as documents, and OpenContext provides **tool-friendly read/write interfaces** so an assistant can “load history first, then act; ship, then persist”.

It comes with:

- **`oc` CLI**: manage a global `contexts/` library (folders/docs, manifests, search)
- **`oc mcp` (for IDEs/agent platforms)**: an MCP server (stdio) so Cursor/Agents can call OpenContext as tools
- **Desktop app (optional)**: manage/search/edit contexts as a Tauri desktop app
- **`oc ui` (optional)**: a local Web UI to browse/edit contexts (no desktop install required)

What you get as a user:

- **Less repeating yourself**: assistants can load your background automatically
- **Fewer repeated mistakes**: persist “known pitfalls / best practices / acceptance criteria” as reusable docs
- **Traceability**: cite sources via stable links like `oc://doc/<stable_id>`
- **Cross-repo reuse**: contexts are global by default (`~/.opencontext/contexts`)

## Install

```bash
npm install -g opencontext
# or use npx without global install:
# npx opencontext <command>
```

## Quick start (beginner-friendly)

Pick the path that matches how you work:

- **I just want a personal context/notes manager** → use the **Desktop app** (no CLI required)
- **I want to use OpenContext with a coding agent / Cursor slash commands / MCP** → install the **CLI** and run `oc init`

### Path A — Desktop app (recommended for most users)

If you want to manage contexts like a normal app (browse/search/edit), the desktop app is the easiest entry point.

- **Use it**: download from GitHub Releases (desktop installer)
- **No `oc init` needed** for basic usage

Developer notes (this repo):

```bash
npm run tauri:dev
```

```bash
npm run tauri:build
```

> The desktop app uses the same global `contexts/` and database described below.

### Path B — CLI + Cursor / Coding Agent integration

If you want your IDE / agent platform to call OpenContext as tools (MCP) and use beginner slash commands, use the CLI.

#### 1) Run `oc init` (do it in the repo you want to use)

`oc init` always does **both**:

- Prepares the **global** OpenContext environment (contexts + database)
- Syncs **this repo’s** Cursor/agent artifacts (e.g. `AGENTS.md`, `.cursor/commands`, `.cursor/mcp.json`)

So you **don’t need a separate “global init” step**. Just run it **inside the repo** where you want Cursor slash commands / coding-agent integration.

Rule of thumb:

- For your **first time** on a machine, run `oc init` in any repo you care about — that single run also prepares the global store.
- For **each additional repo** you want integrated, run `oc init` in that repo once.

It’s safe to run multiple times (idempotent). Re-run it whenever you want to refresh generated templates.

```bash
oc init
```

Defaults:

- **Contexts**: `~/.opencontext/contexts`
- **Database**: `~/.opencontext/opencontext.db`

Optional overrides:

```bash
export OPENCONTEXT_CONTEXTS_ROOT="/path/to/contexts"
export OPENCONTEXT_DB_PATH="/path/to/opencontext.db"
```

#### 2) Use it in Cursor (5 commands for beginners)

After `oc init`, your repo will have Cursor command templates under `.cursor/commands/opencontext-*.md`. In Cursor, use these slash commands:

- **`/opencontext-help`**: start here if you’re not sure which command to use
- **`/opencontext-context`**: load background/context before working (safe default)
- **`/opencontext-search`**: discover relevant existing docs (does **not** auto-build indexes)
- **`/opencontext-create`**: create a new doc/idea
- **`/opencontext-iterate`**: persist what you learned / decided (Iteration Log + citations)

> Important: these commands read/write your **global** OpenContext library (default `~/.opencontext/contexts`). They do **not** copy docs into your project repo.

#### 3) Minimal CLI usage (without Cursor)

```bash
# Create folders and docs (docs must be created/registered via oc)
oc folder create project-a -d "My project"
oc doc create project-a design.md -d "Design doc"

# Generate a “manifest” (a file list for assistants to batch-read)
oc context manifest project-a
```

## Search (/opencontext-search) and “index cost”

Recommended read flow:

1. **Not sure what to read**: search first (`/opencontext-search` or `oc search ... --format json`)  
2. **Confirm candidates**: use a manifest and read files one by one (`/opencontext-context` or `oc context manifest ...`)  
3. **Cite sources**: prefer `oc://doc/<stable_id>` stable links

### Why search may be “not available”

Semantic search typically requires building an index (`oc index build`). Index building may incur external embedding cost and varies with corpus size, so the default policy is:

- **Do not let an AI assistant auto-run `oc index build`**
- If the index is missing, **degrade gracefully**: use manifest + doc descriptions / filenames first; you can choose to build the index manually if needed

### Search configuration (Desktop/Web settings + CLI config commands)

#### Which search modes need embeddings?

- **`--mode keyword`**: keyword-only search, **no embeddings / API key needed**
- **`--mode vector`**: vector-only semantic search, **requires embeddings**
- **`--mode hybrid` (default)**: combines keyword + vector, **requires embeddings**

#### Where to configure embeddings

Hybrid / vector search uses embeddings. You can configure embedding settings in:

- **Desktop app / Web UI**: System Settings → Global Config (then rebuild the index)
- **CLI**: `oc config ...` (see “CLI command reference” below)

#### Embedding config keys (CLI)

OpenContext uses these config keys:

- **`EMBEDDING_API_KEY`** (sensitive): your embedding provider key  
- **`EMBEDDING_API_BASE`**: API base URL (default `https://api.openai.com/v1`)  
- **`EMBEDDING_MODEL`**: model name (default `text-embedding-3-small`)  

Priority order is: **environment variables > config file > defaults**.  
You can inspect the active config with `oc config list`.

#### Typical CLI setup

```bash
oc config list
oc config set EMBEDDING_API_KEY "<your_key>"
oc config set EMBEDDING_API_BASE "https://api.openai.com/v1"
oc config set EMBEDDING_MODEL "text-embedding-3-small"

# Check where config is stored:
oc config path

# Rebuild index after config changes:
oc index build
```

#### Validate configuration & search

```bash
# Check if an index exists / is ready:
oc index status

# Try a keyword-only search (works without embeddings/index):
oc search "your query" --mode keyword --format json

# Try hybrid (requires index + embeddings):
oc search "your query" --mode hybrid --format json
```

> Note: After changing embedding config, you must rebuild the index for changes to take effect (`oc index build`). Keep API keys out of git and never paste secrets into docs.

## MCP (for VibeCoding IDEs / agent platforms)

OpenContext provides `oc mcp` as an MCP server (stdio).

- **Start manually**:

```bash
oc mcp
```

- **Cursor auto-config**: `oc init` generates `.cursor/mcp.json` and registers an MCP server named `opencontext` pointing to `oc mcp`.

> In most cases you don’t need to touch MCP config. Run `oc init`, then use `/opencontext-*` in Cursor.

## CLI command reference (complete list)

Run `oc <cmd> --help` for details.

| Category | Command | What it does |
|---|---|---|
| Environment | `oc init` | Initialize contexts + database and generate project artifacts |
| Folders | `oc folder ls [--all]` | List folders |
| Folders | `oc folder create <path> -d "<desc>"` | Create a folder |
| Folders | `oc folder rename <old_path> <new_name>` | Rename a folder |
| Folders | `oc folder rm <path> [--force]` | Remove a folder (optionally recursive) |
| Documents | `oc doc ls <folder_path> [--recursive]` | List docs in a folder |
| Documents | `oc doc create <folder_path> <name>.md -d "<desc>"` | Create/register a doc |
| Documents | `oc doc mv <doc_path> <new_folder_path>` | Move a doc to another folder |
| Documents | `oc doc rename <doc_path> <new_name>` | Rename a doc |
| Documents | `oc doc rm <doc_path>` | Remove a doc |
| Documents | `oc doc set-desc <doc_path> "<summary>"` | Update doc description (for triage/search) |
| Documents | `oc doc id <doc_path>` | Print stable_id (UUID) |
| Documents | `oc doc resolve <stable_id>` | Resolve a stable_id to current path/meta |
| Documents | `oc doc link <doc_path> [--label <label>]` | Generate an `oc://doc/<stable_id>` link |
| Documents | `oc doc open <doc_path>` | Open doc in your editor |
| Manifest | `oc context manifest <folder_path> [--limit N]` | Output a JSON file list for batch reading |
| Search | `oc search "<query>" --format json ...` | Search with `mode` and `type` options |
| Index | `oc index build [--force] [--folder <folder>]` | Build/update the search index |
| Index | `oc index status` | Show index status |
| Index | `oc index clean` | Clean/reset the index |
| Config | `oc config set <KEY> <VALUE>` | Set config (e.g., embeddings) |
| Config | `oc config get <KEY>` | Get config value |
| Config | `oc config unset <KEY>` | Remove config value |
| Config | `oc config list` | List config values (masked if sensitive) |
| Config | `oc config path` | Print config file path |
| Servers | `oc mcp [--test]` | Start MCP server (stdio) |
| UI | `oc ui [--port <port>] [--host <host>] [--no-open]` | Start the Web UI server |

## Web UI (experimental)

Run:

```bash
oc ui
```

The CLI serves the bundled UI assets and starts a local server (default `http://127.0.0.1:4321`) and opens your browser. It supports:

- Browsing folders/docs
- Previewing/editing/saving Markdown docs
- Sharing the same `contexts/` and database with the CLI

Options:

- `--port <port>`: set port
- `--host <host>`: set host
- `--no-open`: do not open the browser automatically

> The published npm package includes the `dist/ui` bundle. Only local UI development requires `npm run ui:dev` / `npm run ui:build`.

