import * as vscode from "vscode";
import { DaemonManager, DaemonStatus } from "./daemonManager";

class FileTreeItem extends vscode.TreeItem {
  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly filePath?: string,
  ) {
    super(label, collapsibleState);
    if (filePath) {
      this.tooltip = filePath;
      this.command = {
        command: "vscode.open",
        title: "Open File",
        arguments: [vscode.Uri.file(filePath)],
      };
    }
  }
}

export class TreeDataProvider implements vscode.TreeDataProvider<FileTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<FileTreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private manager: DaemonManager;
  private status: DaemonStatus;

  constructor(manager: DaemonManager) {
    this.manager = manager;
    this.status = manager.getStatus();

    manager.on("stateChange", (s) => {
      this.status = s;
      this.refresh();
    });
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: FileTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(_element?: FileTreeItem): Thenable<FileTreeItem[]> {
    const s = this.status;
    if (s.state !== "running") {
      return Promise.resolve([
        new FileTreeItem(
          s.state === "starting" ? "Starting daemon..." : "Daemon offline",
          vscode.TreeItemCollapsibleState.None,
        ),
      ]);
    }

    const items: FileTreeItem[] = [];
    if (s.indexedFiles !== undefined) {
      items.push(
        new FileTreeItem(
          `Indexed Files: ${s.indexedFiles.toLocaleString()}`,
          vscode.TreeItemCollapsibleState.None,
        ),
      );
    }
    if (s.totalChunks !== undefined) {
      items.push(
        new FileTreeItem(
          `Total Chunks: ${s.totalChunks.toLocaleString()}`,
          vscode.TreeItemCollapsibleState.None,
        ),
      );
    }
    if (s.uptimeSecs !== undefined) {
      const uptime = formatUptime(s.uptimeSecs);
      items.push(new FileTreeItem(`Uptime: ${uptime}`, vscode.TreeItemCollapsibleState.None));
    }
    return Promise.resolve(items);
  }
}

function formatUptime(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
