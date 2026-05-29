import * as vscode from "vscode";

export interface ContextdConfig {
  host: string;
  port: number;
  binaryPath: string;
  searchLimit: number;
  minScore: number;
  autoStartDaemon: boolean;
}

const defaults: ContextdConfig = {
  host: "127.0.0.1",
  port: 3030,
  binaryPath: "",
  searchLimit: 10,
  minScore: 0.3,
  autoStartDaemon: true,
};

export function loadConfig(): ContextdConfig {
  const c = vscode.workspace.getConfiguration("contextd");
  return {
    host: c.get<string>("host", defaults.host),
    port: c.get<number>("port", defaults.port),
    binaryPath: c.get<string>("binaryPath", defaults.binaryPath),
    searchLimit: c.get<number>("searchLimit", defaults.searchLimit),
    minScore: c.get<number>("minScore", defaults.minScore),
    autoStartDaemon: c.get<boolean>("autoStartDaemon", defaults.autoStartDaemon),
  };
}

export function apiUrl(config: ContextdConfig, path: string): string {
  return `http://${config.host}:${config.port}${path}`;
}
