import * as vscode from "vscode";
import { DaemonManager } from "./daemonManager";
import { StatusBarProvider } from "./statusBarProvider";
import { registerQuickSearch } from "./quickSearch";
import { createWebviewPanel } from "./webviewPanel";
import { TreeDataProvider } from "./treeDataProvider";
import { loadConfig } from "./config";
import { TOOLS } from "./connect/index";

export function activate(context: vscode.ExtensionContext): void {
  const config = loadConfig();
  const manager = new DaemonManager(config);

  const statusBar = new StatusBarProvider(manager);
  context.subscriptions.push(statusBar);

  const treeProvider = new TreeDataProvider(manager);
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("contextdIndexedFiles", treeProvider),
  );

  registerQuickSearch(context, manager);

  context.subscriptions.push(
    vscode.commands.registerCommand("contextd.searchPanel", () => {
      createWebviewPanel(context, manager);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("contextd.status", async () => {
      const status = manager.getStatus();
      const items: string[] = [];
      items.push(`State: ${status.state}`);
      if (status.indexedFiles !== undefined) items.push(`Indexed: ${status.indexedFiles} files`);
      if (status.totalChunks !== undefined) items.push(`Chunks: ${status.totalChunks}`);
      if (status.uptimeSecs !== undefined) items.push(`Uptime: ${status.uptimeSecs}s`);
      if (status.lastError) items.push(`Error: ${status.lastError}`);
      vscode.window.showInformationMessage(items.join(" | "));
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("contextd.toggle", async () => {
      const state = manager.getState();
      if (state === "running") {
        manager.stop();
        vscode.window.showInformationMessage("contextd daemon stopped.");
      } else {
        await manager.start();
        if (manager.getState() === "running") {
          vscode.window.showInformationMessage("contextd daemon started.");
        }
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("contextd.connect", async () => {
      const detected = TOOLS.filter((t) => t.detect());
      if (detected.length === 0) {
        vscode.window.showInformationMessage("No compatible AI tools detected.");
        return;
      }

      const items = detected.map((t) => ({
        label: t.name,
        description: t.summary("contextd"),
        picked: true,
        tool: t,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        canPickMany: true,
        placeHolder: "Select tools to configure contextd MCP for...",
      });

      if (!selected || selected.length === 0) return;

      const contextdPath = config.binaryPath || "contextd";
      let configured = 0;

      for (const s of selected) {
        const paths = s.tool.configPaths();
        for (const cfgPath of paths) {
          try {
            const dir = cfgPath.substring(0, cfgPath.lastIndexOf("/"));
            const fs = await import("fs");
            fs.mkdirSync(dir, { recursive: true });

            const isToml = cfgPath.endsWith(".toml");
            let existing: Record<string, unknown> = {};
            try {
              const content = fs.readFileSync(cfgPath, "utf-8");
              if (isToml) {
                // @ts-ignore
                const TOML = await import("@iarna/toml");
                existing = TOML.parse(content) as Record<string, unknown>;
              } else {
                existing = JSON.parse(content);
              }
            } catch {
              // file doesn't exist or invalid JSON/TOML — start fresh
            }

            const merged = s.tool.merge(existing, contextdPath);
            
            if (isToml) {
              // @ts-ignore
              const TOML = await import("@iarna/toml");
              fs.writeFileSync(cfgPath, TOML.stringify(merged as any));
            } else {
              fs.writeFileSync(cfgPath, JSON.stringify(merged, null, 2));
            }
            
            configured++;
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            vscode.window.showErrorMessage(`Failed to configure ${s.tool.name}: ${msg}`);
          }
        }
      }

      vscode.window.showInformationMessage(
        `contextd MCP configured for ${configured} tool${configured !== 1 ? "s" : ""}.`,
      );
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("contextd.reindex", async () => {
      vscode.window.showInformationMessage("Re-index triggered. contextd watches files automatically.");
    }),
  );

  if (config.autoStartDaemon) {
    manager.start();
  }

  context.subscriptions.push({
    dispose: () => manager.stop(),
  });
}

export function deactivate(): void {
}
