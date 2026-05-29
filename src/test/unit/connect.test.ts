import { describe, it, expect } from "vitest";
import {
  mergeConfig,
  mergeArrayConfig,
} from "../../connect/tool";

describe("connect/tool", () => {
  describe("mergeConfig", () => {
    it("merges new server into empty config", () => {
      const result = mergeConfig({}, "mcpServers", {
        contextd: { command: "/usr/bin/contextd", args: ["mcp"] },
      });
      expect(result).toEqual({
        mcpServers: {
          contextd: { command: "/usr/bin/contextd", args: ["mcp"] },
        },
      });
    });

    it("merges into existing mcpServers preserving other entries", () => {
      const existing = {
        mcpServers: {
          existingTool: { command: "other", args: [] },
        },
      };
      const result = mergeConfig(existing, "mcpServers", {
        contextd: { command: "/usr/bin/contextd", args: ["mcp"] },
      });
      expect(result.mcpServers.existingTool).toEqual({ command: "other", args: [] });
      expect(result.mcpServers.contextd).toEqual({
        command: "/usr/bin/contextd",
        args: ["mcp"],
      });
    });

    it("overwrites existing contextd entry", () => {
      const existing = {
        mcpServers: {
          contextd: { command: "/old/path", args: [] },
        },
      };
      const result = mergeConfig(existing, "mcpServers", {
        contextd: { command: "/new/path", args: ["mcp"] },
      });
      expect(result.mcpServers.contextd.command).toBe("/new/path");
    });

    it("works with 'servers' key for VSCode Copilot", () => {
      const result = mergeConfig({}, "servers", {
        contextd: { type: "stdio", command: "contextd", args: ["mcp"] },
      });
      expect(result.servers.contextd.type).toBe("stdio");
    });

    it("works with 'mcp' key for OpenCode", () => {
      const result = mergeConfig({}, "mcp", {
        contextd: { type: "local", command: ["contextd", "mcp"] },
      });
      expect(result.mcp.contextd.type).toBe("local");
      expect(result.mcp.contextd.command).toEqual(["contextd", "mcp"]);
    });
  });

  describe("mergeArrayConfig", () => {
    it("adds entry to empty array", () => {
      const result = mergeArrayConfig({}, "mcpServers", {
        name: "contextd",
        command: "contextd",
        args: ["mcp"],
      });
      expect(result.mcpServers).toHaveLength(1);
      expect(result.mcpServers[0].name).toBe("contextd");
    });

    it("replaces existing entry with same name", () => {
      const existing = {
        mcpServers: [
          { name: "contextd", command: "/old", args: [] },
          { name: "other", command: "other", args: [] },
        ],
      };
      const result = mergeArrayConfig(existing, "mcpServers", {
        name: "contextd",
        command: "/new",
        args: ["mcp"],
      });
      expect(result.mcpServers).toHaveLength(2);
      const arr = result.mcpServers as Array<Record<string, unknown>>;
      expect(arr.find((s) => s.name === "contextd")?.command).toBe("/new");
      expect(arr.find((s) => s.name === "other")).toBeDefined();
    });
  });
});
