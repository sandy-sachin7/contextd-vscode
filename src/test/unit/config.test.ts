import { describe, it, expect } from "vitest";
import { ContextdConfig, apiUrl } from "../../config";
import { loadConfig } from "../../config";

describe("config", () => {
  it("returns defaults when no config set", () => {
    const config = loadConfig();
    expect(config.host).toBe("127.0.0.1");
    expect(config.port).toBe(3030);
    expect(config.binaryPath).toBe("");
    expect(config.searchLimit).toBe(10);
    expect(config.minScore).toBe(0.3);
    expect(config.autoStartDaemon).toBe(true);
  });

  it("builds correct API URL", () => {
    const config: ContextdConfig = {
      host: "127.0.0.1",
      port: 3030,
      binaryPath: "",
      searchLimit: 10,
      minScore: 0.3,
      autoStartDaemon: true,
    };
    expect(apiUrl(config, "/health")).toBe("http://127.0.0.1:3030/health");
    expect(apiUrl(config, "/query")).toBe("http://127.0.0.1:3030/query");
  });
});
