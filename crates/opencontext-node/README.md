# @aicontextlab/core-native

OpenContext 核心功能的 Native 绑定（Rust via napi-rs）。

## 功能

提供与 Node.js 版本完全相同的 API，但使用 Rust 实现，性能更好：

- **Searcher** - 语义搜索（向量 + 关键词 + 混合）
- **Indexer** - 索引构建与管理
- 文件夹/文档操作

## 构建

```bash
# 安装依赖
npm install

# 构建 debug 版本
npm run build:debug

# 构建 release 版本
npm run build
```

构建完成后会生成 `.node` 文件（如 `opencontext-node.darwin-arm64.node`）。

## 使用示例

```javascript
const { Searcher, Indexer, loadSearchConfig } = require('@aicontextlab/core-native');

// 搜索
async function search() {
  const searcher = await Searcher.create();
  const results = await searcher.search({
    query: 'context retrieval',
    limit: 10,
    mode: 'hybrid',        // 'vector' | 'keyword' | 'hybrid'
    aggregateBy: 'doc'     // 'content' | 'doc' | 'folder'
  });
  console.log(results);
}

// 构建索引
async function buildIndex() {
  const indexer = await Indexer.create();
  const stats = await indexer.buildAll();
  console.log('Index built:', stats);
}

// 单文件索引
async function indexSingleFile() {
  const indexer = await Indexer.create();
  const chunkCount = await indexer.indexFile('path/to/doc.md');
  console.log(`Indexed ${chunkCount} chunks`);
}
```

## CLI 集成

替换 `src/core/search/` 中的实现：

```javascript
// src/core/search/index.js (迁移后)
const { Searcher, Indexer } = require('@aicontextlab/core-native');

// 完全相同的 API！无需改动上层代码
```

## 架构

```
┌─────────────────────────────────────────┐
│         opencontext-core (Rust)         │
│  搜索 / 索引 / 嵌入 / Chunking / 配置   │
└─────────────────────────────────────────┘
         │                    │
         ▼                    ▼
┌─────────────────┐    ┌─────────────────┐
│  Tauri Desktop  │    │  Node.js CLI    │
│  (直接调用)     │    │  (via napi-rs)  │
└─────────────────┘    └─────────────────┘
```

## 跨平台支持

| 平台 | Target |
|------|--------|
| macOS ARM64 | `aarch64-apple-darwin` |
| macOS x64 | `x86_64-apple-darwin` |
| Linux x64 | `x86_64-unknown-linux-gnu` |
| Windows x64 | `x86_64-pc-windows-msvc` |

