import * as vscode from "vscode";
import { DaemonManager } from "./daemonManager";

export function registerQuickSearch(context: vscode.ExtensionContext, manager: DaemonManager): void {
  const disposable = vscode.commands.registerCommand("contextd.search", async () => {
    const query = await vscode.window.showInputBox({
      prompt: "Search codebase by meaning...",
      placeHolder: "e.g., authentication middleware",
      ignoreFocusOut: true,
    });

    if (!query) return;

    const client = manager.getClient();
    const status = manager.getStatus();
    if (status.state !== "running") {
      vscode.window.showWarningMessage("contextd daemon is not running. Start it first.");
      return;
    }

    vscode.window.withProgress(
      { location: vscode.ProgressLocation.Window, title: "Searching..." },
      async () => {
        try {
          const resp = await client.query({ query, limit: 10 });
          if (resp.results.length === 0) {
            vscode.window.showInformationMessage("No results found.");
            return;
          }

          const items = resp.results.map((r) => {
            const label = `${r.file_path.split("/").pop() || r.file_path}`;
            const desc = `${(r.score * 100).toFixed(0)}% match`;
            const detail = `${r.file_path}:${r.content.slice(0, 80).replace(/\n/g, " ")}`;
            return { label, description: desc, detail, result: r } as vscode.QuickPickItem & {
              result: typeof r;
            };
          });

          const picked = await vscode.window.showQuickPick(items, {
            matchOnDetail: true,
            placeHolder: `${resp.results.length} results. Select to open.`,
          });

          if (picked) {
            const doc = await vscode.workspace.openTextDocument(picked.result.file_path);
            const editor = await vscode.window.showTextDocument(doc);
            const firstLine = doc.getText().split("\n")[0];
            if (firstLine && picked.result.content) {
              const lineIdx = doc.getText().indexOf(picked.result.content.slice(0, 40));
              if (lineIdx >= 0) {
                const lineNum = doc.getText().slice(0, lineIdx).split("\n").length - 1;
                editor.selection = new vscode.Selection(lineNum, 0, lineNum, 0);
                editor.revealRange(
                  new vscode.Range(lineNum, 0, lineNum, 0),
                  vscode.TextEditorRevealType.InCenter,
                );
              }
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          vscode.window.showErrorMessage(`Search failed: ${msg}`);
        }
      },
    );
  });

  context.subscriptions.push(disposable);
}
