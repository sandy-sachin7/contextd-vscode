import * as vscode from "vscode";
import * as cp from "child_process";
import { EventEmitter } from "events";
import { RestClient } from "./restClient";
import { ContextdConfig, loadConfig } from "./config";

export enum DaemonState {
  Stopped = "stopped",
  Starting = "starting",
  Running = "running",
  Crashed = "crashed",
  Dead = "dead",
}

export interface DaemonStatus {
  state: DaemonState;
  indexedFiles?: number;
  totalChunks?: number;
  uptimeSecs?: number;
  lastError?: string;
}

type DaemonEventMap = {
  stateChange: (status: DaemonStatus) => void;
};

export class DaemonManager extends EventEmitter {
  on<K extends keyof DaemonEventMap>(event: K, listener: DaemonEventMap[K]): this {
    return super.on(event as string, listener as (...args: unknown[]) => void);
  }
  emit<K extends keyof DaemonEventMap>(event: K, ...args: Parameters<DaemonEventMap[K]>): boolean {
    return super.emit(event as string, ...args);
  }
  private state: DaemonState = DaemonState.Stopped;
  private client: RestClient;
  private config: ContextdConfig;
  private process: cp.ChildProcess | null = null;
  private healthTimer: ReturnType<typeof setInterval> | null = null;
  private restartAttempts = 0;
  private maxRestarts = 3;
  private status: DaemonStatus;

  constructor(config: ContextdConfig) {
    super();
    this.config = config;
    this.client = new RestClient(config);
    this.status = { state: DaemonState.Stopped };
  }

  private setState(newState: DaemonState, extra?: Partial<DaemonStatus>): void {
    this.state = newState;
    this.status = { ...this.status, state: newState, ...extra };
    this.emit("stateChange", this.status);
  }

  async start(): Promise<void> {
    if (this.state === DaemonState.Running || this.state === DaemonState.Starting) return;

    this.setState(DaemonState.Starting);

    const healthy = await this.checkExistingDaemon();
    if (healthy) {
      this.setState(DaemonState.Running);
      this.startHealthPoll();
      return;
    }

    const spawned = await this.spawnDaemon();
    if (spawned) {
      this.startHealthPoll();
    } else {
      this.setState(DaemonState.Crashed, { lastError: "Failed to spawn daemon" });
    }
  }

  stop(): void {
    this.stopHealthPoll();
    if (this.process) {
      this.process.kill("SIGTERM");
      this.process = null;
    }
    this.restartAttempts = 0;
    this.setState(DaemonState.Stopped);
  }

  async restart(): Promise<void> {
    this.stop();
    await this.start();
  }

  getState(): DaemonState {
    return this.state;
  }

  getStatus(): DaemonStatus {
    return this.status;
  }

  getClient(): RestClient {
    return this.client;
  }

  refreshConfig(): void {
    this.config = loadConfig();
    this.client.updateConfig(this.config);
  }

  private async checkExistingDaemon(): Promise<boolean> {
    try {
      const health = await this.client.health();
      return health.status === "ok";
    } catch {
      return false;
    }
  }

  private async spawnDaemon(): Promise<boolean> {
    const binaryPath = await this.resolveBinary();
    if (!binaryPath) return false;

    return new Promise<boolean>((resolve) => {
      try {
        const child = cp.spawn(binaryPath, ["daemon"], {
          stdio: ["ignore", "pipe", "pipe"],
          detached: false,
        });

        this.process = child;

        child.on("error", (err) => {
          this.setState(DaemonState.Crashed, { lastError: err.message });
          resolve(false);
        });

        child.on("exit", (code, signal) => {
          this.process = null;
          if (this.state === DaemonState.Starting || this.state === DaemonState.Running) {
            this.onCrash(code, signal);
          }
        });

        const maxRetries = 5;
        let attempts = 0;
        const check = setInterval(async () => {
          attempts++;
          try {
            const health = await this.client.health();
            if (health.status === "ok") {
              clearInterval(check);
              this.setState(DaemonState.Running);
              resolve(true);
            }
          } catch {
            if (attempts >= maxRetries) {
              clearInterval(check);
              this.setState(DaemonState.Crashed, { lastError: "Daemon started but not responding" });
              resolve(false);
            }
          }
        }, 1000);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.setState(DaemonState.Crashed, { lastError: msg });
        resolve(false);
      }
    });
  }

  private async resolveBinary(): Promise<string | null> {
    if (this.config.binaryPath) {
      return this.config.binaryPath;
    }

    const whichCmd = process.platform === "win32" ? "where" : "which";
    return new Promise<string | null>((resolve) => {
      cp.exec(`${whichCmd} contextd`, (err) => {
        if (err) {
          vscode.window.showErrorMessage(
            "contextd binary not found. Install it from https://github.com/sandy-sachin7/contextd",
            "Download",
          ).then((choice) => {
            if (choice === "Download") {
              vscode.env.openExternal(
                vscode.Uri.parse("https://github.com/sandy-sachin7/contextd/releases"),
              );
            }
          });
          resolve(null);
        } else {
          resolve("contextd");
        }
      });
    });
  }

  private onCrash(_code: number | null, _signal: string | null): void {
    this.restartAttempts++;
    if (this.restartAttempts <= this.maxRestarts) {
      const delay = Math.pow(2, this.restartAttempts) * 1000;
      this.setState(DaemonState.Crashed, {
        lastError: `Crashed (attempt ${this.restartAttempts}/${this.maxRestarts}), restarting in ${delay}ms`,
      });
      setTimeout(() => {
        if (this.state !== DaemonState.Stopped) {
          this.spawnDaemon();
        }
      }, delay);
    } else {
      this.setState(DaemonState.Dead, {
        lastError: `Daemon crashed ${this.maxRestarts} times. Please restart manually.`,
      });
      vscode.window.showErrorMessage(
        "contextd daemon crashed too many times. Check logs for details.",
      );
    }
  }

  private startHealthPoll(): void {
    this.stopHealthPoll();
    this.healthTimer = setInterval(async () => {
      try {
        const status = await this.client.status();
        this.setState(DaemonState.Running, {
          indexedFiles: status.indexed_files,
          totalChunks: status.total_chunks,
          uptimeSecs: status.uptime_secs,
        });
      } catch {
        if (this.state === DaemonState.Running) {
          this.setState(DaemonState.Crashed, { lastError: "Health check failed" });
          this.onCrash(null, null);
        }
      }
    }, 10000);
  }

  private stopHealthPoll(): void {
    if (this.healthTimer) {
      clearInterval(this.healthTimer);
      this.healthTimer = null;
    }
  }
}
