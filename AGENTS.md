# AGENTS.md

## Project Context

**contextd-vscode** is a VSCode extension for [contextd](https://github.com/sandy-sachin7/contextd), a local-first semantic context daemon for AI agents. It provides inline semantic search across your codebase through the VSCode UI — surfacing relevant code by meaning, not just keywords.

The extension talks to the contextd daemon over its REST API at `http://localhost:3030`. It also supports auto-detecting and configuring contextd as an MCP server for Claude Desktop, Claude Code, Cursor, GitHub Copilot, OpenCode, Continue, and Antigravity.

**Backend repo**: `~/Desktop/Code/contextd` (Rust)
**Extension repo**: `~/Desktop/Code/contextd-vscode` (TypeScript)

## Architecture

```
VSCode Extension (TypeScript)
├── extension.ts              # activate/deactivate entry, register commands
├── daemonManager.ts          # spawn contextd daemon, health check loop, restart
├── statusBarProvider.ts      # clickable status bar item (green/red + file count)
├── webviewPanel.ts           # rich HTML search panel (main UX surface)
├── webview/
│   ├── app.ts                # webview-side app (renders search UI)
│   ├── components/
│   │   ├── searchBar.ts      # query input + filters
│   │   ├── resultsList.ts    # scrollable result list
│   │   └── resultCard.ts     # single result: snippet + score + file path
│   └── styles.css
├── quickSearch.ts            # Ctrl+Shift+F quick pick search
├── treeDataProvider.ts       # sidebar: indexed files grouped by directory
├── restClient.ts             # typed HTTP client for REST API wrapper
├── config.ts                 # extension settings (host, port, binary path)
├── connect/                  # contextd connect for MCP config auto-setup
│   ├── tool.ts               # Tool trait + registry
│   ├── claudeDesktop.ts
│   ├── claudeCode.ts
│   ├── cursor.ts
│   ├── vscodeCopilot.ts
│   ├── copilotCli.ts
│   ├── opencode.ts
│   ├── continue.ts
│   └── antigravity.ts
└── test/
    ├── unit/
    │   ├── restClient.test.ts
    │   ├── daemonManager.test.ts
    │   ├── config.test.ts
    │   └── connect.test.ts
    └── integration/
        ├── setup.ts              # spawn contextd on random port
        ├── search.test.ts
        ├── statusBar.test.ts
        └── connect.test.ts
```

## contextd REST API (Backend Contract)

The contextd daemon exposes these endpoints on `http://127.0.0.1:3030`:

### GET /health
```json
{ "status": "ok", "uptime_secs": 3600 }
```

### GET /status
```json
{ "status": "ok", "uptime_secs": 3600, "indexed_files": 1500, "total_chunks": 45000, "database_size_bytes": 52428800 }
```

### POST /query
Request:
```json
{ "query": "auth system", "limit": 10, "file_types": [".rs", ".py"], "min_score": 0.5 }
```
Response:
```json
{ "results": [{ "content": "fn authenticate()...", "score": 0.92, "file_path": "src/auth.rs", "file_type": ".rs", "last_modified": 1700000000 }] }
```

## Build & Test

```bash
npm install
npm run compile          # tsc -p ./
npm run lint             # eslint src/ test/
npm run check-types      # tsc --noEmit
npm test                 # vitest run (unit + integration)
npm run package          # vsce package
```

## Testing Strategy

### Unit tests (vitest)
- `restClient.test.ts` — mock HTTP via `sinon` or `nock`, test all 3 endpoints, error handling, timeouts
- `daemonManager.test.ts` — state machine transitions: stopped→starting→running→crashed→restart→dead
- `config.test.ts` — read/write settings, defaults, invalid values
- `connect.test.ts` — test config file generation for each of 8 tools, merge logic, malformed JSON, permission errors

### Integration tests (@vscode/test-electron)
- `search.test.ts` — spawn real contextd on unique port + temp config, query, verify results shape
- `statusBar.test.ts` — verify text reflects daemon state (running/stopped/indexing)
- `connect.test.ts` — write configs to temp paths, assert correct JSON output

### Edge cases to test
- Daemon not installed → error notification + download link
- Daemon crashed → auto-restart with backoff (1s, 2s, 4s, max 3)
- Stuck indexing → show progress indicator
- Network timeout → graceful degradation message
- Empty results → "No results found" state
- Unicode/SQL injection/null bytes in query → sanitized
- Multiple VSCode windows → singleton daemon

## Commands & Keybindings

| Command ID | Default Key | Action |
|-----------|-------------|--------|
| `contextd.search` | `Ctrl+Shift+F` | Quick pick search |
| `contextd.searchPanel` | `Ctrl+Shift+Alt+F` | Webview search panel |
| `contextd.status` | — | Show daemon status notification |
| `contextd.toggle` | — | Start/stop contextd daemon |
| `contextd.connect` | — | Auto-configure MCP for detected tools |
| `contextd.reindex` | — | Force re-index of workspace |

## Features

### Status Bar
- Green `📡 contextd | 1,234 indexed` when healthy
- Red `📡 contextd – offline` when daemon unreachable
- Orange `📡 contextd – indexing...` during initial scan
- Click → context menu: Search, Status, Toggle, Connect

### Quick Search (Ctrl+Shift+F)
1. Type query → dropdown shows top 10 results live
2. Each result shows: score bar, file path, first line of snippet
3. Enter → open file at match location
4. Escape → dismiss

### Webview Panel (Ctrl+Shift+Alt+F)
```
┌──────────────────────────────────────────┐
│ [🔍 Search codebase by meaning...] [Search] │
│ Filters: [.rs] [.py] [Score ≥ 0.5]        │
├──────────────────────────────────────────┤
│ 12 results (0.34s)                        │
│                                           │
│ ┌── src/auth.rs ──────────────────────┐  │
│ │ fn authenticate()                    │  │
│ │ pub async fn authenticate(          │  │
│ │     credentials: &Credentials       │  │
│ │ ) -> Result<Session> {              │  │
│ │     ...                             │  │
│ │ Score: 0.92  ██████████░░ [Open]   │  │
│ └────────────────────────────────────┘  │
│                                           │
│ ┌── src/middleware.rs ────────────────┐  │
│ │ Score: 0.78  ████████░░░░ [Open]   │  │
│ └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

### Tree View (sidebar)
```
contextd Index
├── src/ (342 files)
│   ├── auth.rs
│   ├── middleware.rs
│   └── ...
├── tests/ (89 files)
└── docs/ (45 files)
```

### Daemon Manager Lifecycle

```
Binary not found?
  → Show "Install contextd" notification with download link
     ↓ installed
Check GET /health (timeout: 3s)
  ├── 200 OK → use existing daemon, start health poll (every 10s)
  └── timeout/refused
       → Spawn contextd daemon as child process
       → Wait for health (retry 5x, 1s apart)
       → Start health poll
       → On crash: restart with backoff (max 3)
       → After 3 crashes: show error, stop trying
```

## MCP Connect — Config Format Reference

For the `contextd connect` feature (both in the extension and the Rust CLI):

### Claude Desktop
**File**: `~/.config/Claude/claude_desktop_config.json`
**Key**: `mcpServers` (object)
```json
{ "mcpServers": { "contextd": { "command": "/path/to/contextd", "args": ["mcp"] } } }
```
**Detect**: `fs.existsSync(configPath)`

### Claude Code
**File**: `.mcp.json` (project) or `~/.claude.json` (user)
**Key**: `mcpServers` (object)
```json
{ "mcpServers": { "contextd": { "command": "/path/to/contextd", "args": ["mcp"] } } }
```
**Detect**: Check for `claude` in PATH, or `~/.claude.json` exists

### Cursor
**File**: `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (global)
**Key**: `mcpServers` (object)
```json
{ "mcpServers": { "contextd": { "command": "/path/to/contextd", "args": ["mcp"] } } }
```
**Detect**: Check for cursor binary in PATH or `~/.cursor/` exists

### VSCode Copilot
**File**: `.vscode/mcp.json` (workspace) or user profile
**Key**: `servers` (object — NOTE: not `mcpServers`)
```json
{ "servers": { "contextd": { "command": "/path/to/contextd", "args": ["mcp"] } } }
```
**Detect**: Always available in VSCode (this extension itself)

### GitHub Copilot CLI
**File**: `~/.copilot/mcp-config.json`
**Key**: `mcpServers` (object)
```json
{ "mcpServers": { "contextd": { "command": "/path/to/contextd", "args": ["mcp"] } } }
```
**Detect**: Check for `github-copilot-cli` or `copilot` in PATH

### OpenCode
**File**: `opencode.json` / `opencode.jsonc` (project root or `~/.config/opencode/`)
**Key**: `mcp` (object — NOTE: not `mcpServers`)
```json
{ "$schema": "https://opencode.ai/config.json", "mcp": { "contextd": { "type": "local", "command": ["/path/to/contextd", "mcp"] } } }
```
**Detect**: Check for `opencode` in PATH or `~/.config/opencode/` exists

### Continue
**File**: `~/.continue/config.json` or `.continuerc.json`
**Key**: `mcpServers` (ARRAY — NOTE: not object)
```json
{ "mcpServers": [{ "name": "contextd", "command": "/path/to/contextd", "args": ["mcp"] }] }
```
**Detect**: Check for Continue VSCode extension or `~/.continue/` exists

### Antigravity (agy)
**File**: `~/.antigravity/plugins/mcp.json`
**Key**: `mcpServers` (object)
```json
{ "mcpServers": { "contextd": { "command": "/path/to/contextd", "args": ["mcp"] } } }
```
**Detect**: Check for `agy` in PATH

## CI

`.github/workflows/ci.yml`:
```yaml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run lint
      - run: npm run check-types
      - run: npm test
      - name: Package VSIX
        run: npx vsce package -o contextd-vscode.vsix
      - uses: actions/upload-artifact@v4
        with: { name: vsix, path: "*.vsix" }
  release:
    if: startsWith(github.ref, 'refs/tags/')
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx vsce publish -p ${{ secrets.VSCE_PAT }}
```

## Implementation Order

### Sprint 1 — VSCode Extension MVP
1. `package.json`, `tsconfig.json`, `.vscode/launch.json`, `eslint.config.js`
2. `src/extension.ts` — activate, register commands, create providers
3. `src/restClient.ts` — typed HTTP wrapper for /health, /status, /query
4. `src/daemonManager.ts` — spawn, health poll, restart logic
5. `src/statusBarProvider.ts` — status bar item with click menu
6. `src/quickSearch.ts` — quick pick search command
7. `src/webviewPanel.ts` + `webview/app.ts` + components — rich panel
8. `src/treeDataProvider.ts` — sidebar tree
9. `src/config.ts` — settings
10. Tests for all modules
11. `.github/workflows/ci.yml`

### Sprint 2 — Zero-Config in contextd (Rust repo)
1. `src/daemon.rs` — auto-download model on first run if missing
2. `tests/zero_config_test.rs` — test missing model, partial download, network failure

### Sprint 3 — contextd connect (both repos)
1. `src/connect/tool.ts` — Tool trait + registry
2. Implement all 8 tool config generators
3. Wire into `contextd.connect` command
4. Tests: unit + integration for each tool

### Sprint 4 — Launch Prep
1. `scripts/playground.sh` — one-line install → index → query
2. Asciicast demo + README badge
3. Comparison matrix in README
4. Publish extension to VSCode Marketplace
5. Update Homebrew + Docker
6. Coordinated launch

## Conventions

- TypeScript strict mode, ES2020 target, Node module
- Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, `style:`, `refactor:`
- 100% test coverage for `restClient.ts` and `daemonManager.ts`
- All new code needs tests + error handling
- Use `vscode` namespace API, avoid DOM manipulation
- Webview: `nonce` CSP, no inline scripts, `asWebviewUri` for assets
- `contextd connect` — when writing configs: backup originals, merge don't overwrite, validate JSON
- Pre-commit: `npm run lint && npm run check-types && npm test`

## References

- **contextd REST API**: `http://127.0.0.1:3030/health`, `/status`, `/query`
- **contextd MCP**: stdio JSON-RPC 2.0, tools: `search_context`, `get_status`
- **contextd repo**: `~/Desktop/Code/contextd`
- **VSCode Extension API**: https://code.visualstudio.com/api
- **MCP Specification**: https://modelcontextprotocol.io
