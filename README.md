<div align="center">
  <img src="https://raw.githubusercontent.com/sandy-sachin7/contextd/main/assets/logo.png" alt="contextd logo" width="120" />

  <h1>contextd - Semantic Search</h1>
  <p><b>The local-first semantic code search layer for AI-assisted development.</b></p>

  [![Version](https://vsmarketplacebadges.dev/version/SanthoshSachin.contextd-semantic-search.png)](https://marketplace.visualstudio.com/items?itemName=SanthoshSachin.contextd-semantic-search)
  [![Installs](https://vsmarketplacebadges.dev/installs/SanthoshSachin.contextd-semantic-search.png)](https://marketplace.visualstudio.com/items?itemName=SanthoshSachin.contextd-semantic-search)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-blue)](https://modelcontextprotocol.io)

</div>

---

**contextd** is a high-performance, completely local semantic search engine designed specifically for codebases. This extension automatically manages the `contextd` background daemon and connects your VSCode environment directly to your AI agents (Claude, Cursor, Roo Code, Continue) via the **Model Context Protocol (MCP)**.

## ✨ Features

- 🔒 **100% Privacy-First:** Your code never leaves your machine. Embeddings are generated and queried entirely locally using ONNX runtime and `sqlite-vec`.
- ⚡ **Instant Semantic Search:** Query your entire codebase in milliseconds. Find "authentication logic" even if the code only says "login" or "OAuth".
- 🤖 **Universal MCP Backend:** Instantly configure Claude Desktop, Cursor, Roo Code, or Continue to query your local codebase with a single click.
- 🌳 **Smart Code Chunking:** Uses AST tree-sitter parsing to chunk code semantically (by functions, classes, and traits) rather than arbitrary line counts.
- 🧠 **Hybrid Retrieval:** Blends Dense Vector Embeddings with Full-Text Search (FTS5) for pinpoint accuracy.

## 🚀 Getting Started

### 1. Install the Extension
Install `contextd - Semantic Search` from the VSCode Marketplace.

### 2. Install the Daemon
The extension requires the `contextd` core daemon to run in the background. If you don't have it installed, open your terminal and run:

**macOS / Linux:**
```bash
curl -sSL https://raw.githubusercontent.com/sandy-sachin7/contextd/main/scripts/install.sh | sh
```

### 3. Connect to AI Agents
Open the Command Palette (`Cmd/Ctrl + Shift + P`) and run:
👉 **`contextd: Configure MCP for AI Tools`**

This will automatically detect installed AI assistants (like Claude Desktop or Roo Code) and inject the `contextd` MCP configuration, giving them instant semantic search capabilities over your active workspace.

## ⌨️ Usage & Commands

| Command | Keyboard Shortcut | Description |
|---------|------------------|-------------|
| **Search Panel** | `Cmd/Ctrl+Shift+Alt+F` | Opens the dedicated contextd semantic search UI panel. |
| **Quick Search** | `Cmd/Ctrl+Shift+F` | Opens the quick-pick semantic search dropdown. |
| **Re-index** | - | Forces a manual re-index of the current VSCode workspace. |
| **Toggle Daemon** | - | Starts or stops the background `contextd` process. |

## 📊 Benchmarks

`contextd` is built in Rust with a highly optimized `sqlite-vec` storage layer, allowing it to easily handle enterprise-scale monorepos on standard laptop hardware.

**Tested on Apple M2 Pro (16GB RAM) - 10,000 files, ~500,000 LOC:**
*   **Initial Indexing:** ~2.5 minutes
*   **Vector Search Latency:** < 35ms (p99)
*   **Incremental Update:** < 50ms per changed file
*   **Memory Footprint:** ~120MB background usage

## ⚙️ Extension Settings

You can customize the daemon's behavior in your VSCode `settings.json`:

*   `contextd.autoStartDaemon`: Auto-start indexing when opening a folder (Default: `true`)
*   `contextd.minScore`: The minimum cosine similarity threshold for search results (Default: `0.3`)
*   `contextd.searchLimit`: The default number of code chunks returned per query (Default: `10`)
*   `contextd.binaryPath`: Absolute path to the contextd binary (Leave blank to use `$PATH`)

## 🛡️ Privacy & Security

**We believe your code is your business.**
`contextd` operates entirely on your local file system. It does not phone home, it does not send telemetry, and it does not upload your proprietary code to any external APIs for embedding generation. Everything runs locally on your CPU/GPU.

## 🤝 Contributing & Core Repo

This repository only houses the VSCode extension client.
The core Rust daemon, AST chunker, and MCP server implementation live in the main repository:

🔗 **[github.com/sandy-sachin7/contextd](https://github.com/sandy-sachin7/contextd)**

Issues, pull requests, and feature ideas are more than welcome!

---
*Built with 🦀 Rust and ❤️ for local-first AI.*
