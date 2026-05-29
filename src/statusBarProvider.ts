import * as vscode from "vscode";
import { DaemonManager, DaemonState, DaemonStatus } from "./daemonManager";

export class StatusBarProvider {
  private item: vscode.StatusBarItem;
  private manager: DaemonManager;

  constructor(manager: DaemonManager) {
    this.manager = manager;
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.item.command = "contextd.status";
    this.item.tooltip = "Click for contextd commands";
    this.item.show();

    this.manager.on("stateChange", (status: DaemonStatus) => this.update(status));
    this.update(manager.getStatus());
  }

  private update(status: DaemonStatus): void {
    switch (status.state) {
      case DaemonState.Running: {
        const files = status.indexedFiles !== undefined
          ? status.indexedFiles.toLocaleString()
          : "?";
        this.item.text = `$(symbol-method) contextd | ${files} indexed`;
        this.item.backgroundColor = undefined;
        this.item.color = undefined;
        break;
      }
      case DaemonState.Starting:
      case DaemonState.Crashed: {
        this.item.text = `$(loading~spin) contextd – ${status.state}`;
        this.item.backgroundColor = new vscode.ThemeColor(
          "statusBarItem.warningBackground",
        );
        break;
      }
      case DaemonState.Dead:
      case DaemonState.Stopped: {
        this.item.text = `$(error) contextd – offline`;
        this.item.backgroundColor = new vscode.ThemeColor(
          "statusBarItem.errorBackground",
        );
        break;
      }
    }
  }

  dispose(): void {
    this.item.dispose();
  }
}
