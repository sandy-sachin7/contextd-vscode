import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { Tool, registerTool } from "./tool";

function detectOpenCode(): boolean {
  const envPath = process.env.PATH || "";
  const dirs = envPath.split(path.delimiter);
  for (const dir of dirs) {
    try {
      const files = fs.readdirSync(dir);
      if (files.includes("opencode") || files.includes("opencode.exe")) return true;
    } catch {
      // skip
    }
  }
  return fs.existsSync(path.join(os.homedir(), ".config", "opencode"));
}

const opencode: Tool = {
  id: "opencode",
  name: "OpenCode",
  detect(): boolean {
    return detectOpenCode();
  },
  configPaths(): string[] {
    return [
      path.join(process.cwd(), "opencode.json"),
      path.join(process.cwd(), "opencode.jsonc"),
      path.join(os.homedir(), ".config", "opencode", "config.json"),
    ];
  },
  generateConfig(contextdPath: string): Record<string, unknown> {
    return {
      $schema: "https://opencode.ai/config.json",
      mcp: {
        contextd: {
          type: "local",
          command: [contextdPath, "mcp"],
        },
      },
    };
  },
  merge(
    existing: Record<string, unknown>,
    contextdPath: string,
  ): Record<string, unknown> {
    const existingMCP = (existing.mcp as Record<string, unknown>) || {};
    return {
      ...existing,
      mcp: {
        ...existingMCP,
        contextd: {
          type: "local",
          command: [contextdPath, "mcp"],
        },
      },
    };
  },
  summary(_contextdPath: string): string {
    return `Config: opencode.json or ~/.config/opencode/config.json`;
  },
};

registerTool(opencode);
export { opencode };
