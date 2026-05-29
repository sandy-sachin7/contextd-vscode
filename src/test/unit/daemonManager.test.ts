import { describe, it, expect, vi, beforeEach } from "vitest";
import { DaemonManager, DaemonState } from "../../daemonManager";
import { ContextdConfig } from "../../config";

vi.mock("child_process", () => {
  const mockChild = {
    on: vi.fn(),
    kill: vi.fn(),
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
  };
  return {
    spawn: vi.fn(() => mockChild),
    exec: vi.fn((_cmd: string, cb: (err: Error | null) => void) => { cb(null); }),
  };
});

vi.mock("http", () => ({ request: vi.fn() }));
import * as http from "http";
const mockRequest = http.request as ReturnType<typeof vi.fn>;

describe("DaemonManager", () => {
  const config: ContextdConfig = {
    host: "127.0.0.1", port: 3030, binaryPath: "", searchLimit: 10, minScore: 0.3, autoStartDaemon: false,
  };
  let manager: DaemonManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new DaemonManager(config);
    mockRequest.mockImplementation((_opts: unknown, callback?: (res: unknown) => void) => {
      if (callback) {
        const mockRes = {
          on: vi.fn((event: string, handler: (c: string) => void) => {
            if (event === "data") handler(JSON.stringify({ status: "ok" }));
            if (event === "end") handler("");
            return mockRes;
          }),
          statusCode: 200,
        };
        setTimeout(() => callback(mockRes), 0);
      }
      return { on: vi.fn().mockReturnThis(), write: vi.fn(), end: vi.fn(), destroy: vi.fn() };
    });
  });

  it("starts in Stopped state", () => {
    expect(manager.getState()).toBe(DaemonState.Stopped);
  });

  it("emits stateChange event on start attempt", async () => {
    const handler = vi.fn();
    manager.on("stateChange", handler);
    await manager.start();
    expect(handler).toHaveBeenCalled();
  });

  it("transitions to Stopped on stop()", () => {
    manager.stop();
    expect(manager.getState()).toBe(DaemonState.Stopped);
  });

  it("stop does nothing if already stopped", () => {
    manager.stop();
    expect(manager.getState()).toBe(DaemonState.Stopped);
  });

  it("getClient returns RestClient instance", () => {
    const client = manager.getClient();
    expect(client).toBeDefined();
  });

  it("restart stops and starts", async () => {
    await manager.restart();
    expect(manager.getState()).toBe(DaemonState.Running);
  });

  it("returns status object", () => {
    const status = manager.getStatus();
    expect(status).toHaveProperty("state");
    expect(status.state).toBe(DaemonState.Stopped);
  });
});
