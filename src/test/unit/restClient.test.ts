import { describe, it, expect, vi, beforeEach } from "vitest";
import { RestClient } from "../../restClient";
import { ContextdConfig } from "../../config";

vi.mock("http", () => ({ request: vi.fn() }));
import * as http from "http";
const mockRequest = http.request as ReturnType<typeof vi.fn>;

describe("RestClient", () => {
  const config: ContextdConfig = {
    host: "127.0.0.1", port: 3030, binaryPath: "", searchLimit: 10, minScore: 0.3, autoStartDaemon: true,
  };
  let client: RestClient;

  beforeEach(() => {
    client = new RestClient(config);
    mockRequest.mockReset();
    mockRequest.mockReturnValue({ on: vi.fn().mockReturnThis(), write: vi.fn(), end: vi.fn(), destroy: vi.fn() });
  });

  it("builds correct URLs for requests", () => {
    client.health();
    expect(mockRequest).toHaveBeenCalled();
    const opts = mockRequest.mock.calls[0][0];
    expect(opts.hostname).toBe("127.0.0.1");
    expect(opts.port).toBe("3030");
    expect(opts.path).toBe("/health");
  });

  it("handles health response correctly", async () => {
    mockRequest.mockImplementation((_opts: unknown, callback: (res: unknown) => void) => {
      setTimeout(() => callback({
        on: (e: string, h: (c: string) => void) => { if (e === "data") h(JSON.stringify({ status: "ok", uptime_secs: 3600 })); if (e === "end") h(""); },
        statusCode: 200,
      }), 0);
      return { on: vi.fn().mockReturnThis(), write: vi.fn(), end: vi.fn(), destroy: vi.fn() };
    });

    const result = await client.health();
    expect(result.status).toBe("ok");
    expect(result.uptime_secs).toBe(3600);
  });

  it("handles query response correctly", async () => {
    mockRequest.mockImplementation((_opts: unknown, callback: (res: unknown) => void) => {
      setTimeout(() => callback({
        on: (e: string, h: (c: string) => void) => { if (e === "data") h(JSON.stringify({ results: [{ content: "fn test() {}", score: 0.95, file_path: "/src/test.rs", file_type: ".rs", last_modified: 1700000000 }] })); if (e === "end") h(""); },
        statusCode: 200,
      }), 0);
      return { on: vi.fn().mockReturnThis(), write: vi.fn(), end: vi.fn(), destroy: vi.fn() };
    });

    const result = await client.query({ query: "test" });
    expect(result.results).toHaveLength(1);
    expect(result.results[0].score).toBe(0.95);
  });

  it("rejects on HTTP error", async () => {
    mockRequest.mockImplementation((_opts: unknown, callback: (res: unknown) => void) => {
      setTimeout(() => callback({ on: (e: string, h: (c: string) => void) => { if (e === "data") h("Not Found"); if (e === "end") h(""); }, statusCode: 404 }), 0);
      return { on: vi.fn().mockReturnThis(), write: vi.fn(), end: vi.fn(), destroy: vi.fn() };
    });
    await expect(client.health()).rejects.toThrow("HTTP 404");
  });

  it("rejects on connection error", async () => {
    mockRequest.mockImplementation(() => {
      const req = { on: vi.fn(), write: vi.fn(), end: vi.fn(), destroy: vi.fn() };
      req.on.mockImplementation((e: string, h: (err: Error) => void) => { if (e === "error") setTimeout(() => h(new Error("ECONNREFUSED")), 0); return req; });
      return req;
    });
    await expect(client.health()).rejects.toThrow("ECONNREFUSED");
  });
});
