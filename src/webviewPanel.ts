import * as vscode from "vscode";
import { DaemonManager, DaemonStatus } from "./daemonManager";
import { loadConfig } from "./config";

export function createWebviewPanel(
  context: vscode.ExtensionContext,
  manager: DaemonManager,
): vscode.WebviewPanel {
  const panel = vscode.window.createWebviewPanel(
    "contextdSearch",
    "contextd Semantic Search",
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "out", "webview")],
    },
  );

  panel.webview.html = getWebviewHtml();

  panel.webview.onDidReceiveMessage(async (msg) => {
    switch (msg.type) {
      case "search": {
        const config = loadConfig();
        const client = manager.getClient();
        try {
          const t0 = Date.now();
          const resp = await client.query({
            query: msg.query,
            limit: msg.limit ?? config.searchLimit,
            min_score: msg.minScore ?? config.minScore,
          });
          const duration = Date.now() - t0;
          panel.webview.postMessage({
            type: "searchResults",
            results: resp.results,
            duration,
          });
        } catch (err) {
          panel.webview.postMessage({
            type: "error",
            message: err instanceof Error ? err.message : String(err),
          });
        }
        break;
      }
      case "openFile": {
        const doc = await vscode.workspace.openTextDocument(msg.filePath);
        const editor = await vscode.window.showTextDocument(doc);
        if (msg.line !== undefined) {
          const line = Math.max(0, msg.line);
          editor.selection = new vscode.Selection(line, 0, line, 0);
          editor.revealRange(
            new vscode.Range(line, 0, line, 0),
            vscode.TextEditorRevealType.InCenter,
          );
        }
        break;
      }
    }
  });

  const onStateChange = (status: DaemonStatus) => {
    panel.webview.postMessage({
      type: "daemonStatus",
      state: status.state,
      indexedFiles: status.indexedFiles,
    });
  };
  manager.on("stateChange", onStateChange);
  panel.onDidDispose(() => {
    manager.removeListener("stateChange", onStateChange);
  });

  return panel;
}

function getWebviewHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
<title>contextd Search</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg: #1e1e1e; --surface: #252526; --border: #3c3c3c;
  --text: #cccccc; --text-dim: #6e6e6e; --accent: #4fc1ff;
  --score-high: #4fc1ff; --score-mid: #cca700; --score-low: #6e6e6e;
  --hover: #2a2d2e;
}
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: var(--bg); color: var(--text); padding: 16px; font-size: 13px; line-height: 1.5; }
.search-container { display: flex; gap: 8px; margin-bottom: 12px; }
#searchInput { flex: 1; background: var(--surface); border: 1px solid var(--border); color: var(--text); padding: 8px 12px; border-radius: 4px; font-size: 14px; outline: none; }
#searchInput:focus { border-color: var(--accent); }
#searchBtn { background: var(--accent); color: #000; border: none; padding: 8px 20px; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 13px; }
#searchBtn:hover { opacity: 0.9; }
#searchBtn:disabled { opacity: 0.5; cursor: not-allowed; }
.filters { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.filters label { color: var(--text-dim); font-size: 12px; display: flex; align-items: center; gap: 4px; }
.filters input, .filters select { background: var(--surface); border: 1px solid var(--border); color: var(--text); padding: 4px 8px; border-radius: 3px; font-size: 12px; width: 60px; }
.status-bar { font-size: 12px; color: var(--text-dim); margin-bottom: 12px; min-height: 18px; }
#results { display: flex; flex-direction: column; gap: 8px; }
.result-card { background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 12px; cursor: pointer; transition: background 0.15s; }
.result-card:hover { background: var(--hover); }
.result-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.result-path { color: var(--accent); font-family: 'SF Mono', 'Fira Code', monospace; font-size: 12px; }
.result-score { font-size: 12px; font-weight: 600; }
.score-bar { height: 3px; border-radius: 2px; margin-bottom: 8px; transition: width 0.3s; }
.result-snippet { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 12px; color: var(--text); white-space: pre-wrap; word-break: break-all; max-height: 80px; overflow: hidden; }
.no-results { text-align: center; color: var(--text-dim); padding: 40px 0; font-size: 14px; }
.error-msg { background: #5a1d1d; border: 1px solid #8a3a3a; color: #ff8080; padding: 8px 12px; border-radius: 4px; margin-bottom: 12px; font-size: 13px; }
</style>
</head>
<body>
<div class="search-container">
  <input type="text" id="searchInput" placeholder="Search codebase by meaning..." />
  <button id="searchBtn">Search</button>
</div>
<div class="filters">
  <label>Limit: <input type="number" id="limitInput" value="10" min="1" max="100" /></label>
  <label>Min score: <input type="number" id="scoreInput" value="0.3" min="0" max="1" step="0.1" /></label>
</div>
<div class="status-bar" id="statusBar">Ready</div>
<div id="results"></div>
<script>
(function() {
  const vscode = acquireVsCodeApi();
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const limitInput = document.getElementById('limitInput');
  const scoreInput = document.getElementById('scoreInput');
  const resultsDiv = document.getElementById('results');
  const statusBar = document.getElementById('statusBar');

  function doSearch() {
    const query = searchInput.value.trim();
    if (!query) return;
    searchBtn.disabled = true;
    statusBar.textContent = 'Searching...';
    vscode.postMessage({
      type: 'search',
      query,
      limit: parseInt(limitInput.value) || 10,
      minScore: parseFloat(scoreInput.value) || 0.3,
    });
  }

  searchBtn.addEventListener('click', doSearch);
  searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });

  function scoreColor(score) {
    if (score >= 0.8) return 'var(--score-high)';
    if (score >= 0.5) return 'var(--score-mid)';
    return 'var(--score-low)';
  }

  function resultHtml(r) {
    const color = scoreColor(r.score);
    const pct = (r.score * 100).toFixed(0);
    const filePath = r.file_path || '';
    const snippet = (r.content || '').slice(0, 300);
    const scoreWidth = Math.round(r.score * 100);
    return '<div class="result-card" data-path="' + filePath.replace(/"/g, '&quot;') + '">' +
      '<div class="result-header">' +
        '<span class="result-path">' + escapeHtml(filePath) + '</span>' +
        '<span class="result-score" style="color:' + color + '">' + pct + '%</span>' +
      '</div>' +
      '<div class="score-bar" style="width:' + scoreWidth + '%;background:' + color + '"></div>' +
      '<div class="result-snippet">' + escapeHtml(snippet) + '</div>' +
    '</div>';
  }

  function escapeHtml(s) {
    if (!s) return '';
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  window.addEventListener('message', (e) => {
    const msg = e.data;
    switch (msg.type) {
      case 'searchResults':
        searchBtn.disabled = false;
        if (msg.results.length === 0) {
          resultsDiv.innerHTML = '<div class="no-results">No results found. Try a different query.</div>';
          statusBar.textContent = 'No results (' + msg.duration + 'ms)';
        } else {
          resultsDiv.innerHTML = msg.results.map(resultHtml).join('');
          statusBar.textContent = msg.results.length + ' results (' + msg.duration + 'ms)';
          resultsDiv.querySelectorAll('.result-card').forEach((el, i) => {
            el.addEventListener('click', () => {
              vscode.postMessage({ type: 'openFile', filePath: msg.results[i].file_path });
            });
          });
        }
        break;
      case 'error':
        searchBtn.disabled = false;
        resultsDiv.innerHTML = '<div class="error-msg">' + escapeHtml(msg.message) + '</div>';
        statusBar.textContent = 'Error';
        break;
      case 'daemonStatus':
        statusBar.textContent = 'Daemon: ' + msg.state + (msg.indexedFiles !== undefined ? ' | ' + msg.indexedFiles + ' files indexed' : '');
        break;
    }
  });
})();
</script>
</body>
</html>`;
}
