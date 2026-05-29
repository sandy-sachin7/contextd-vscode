import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { Tool, mergeConfig, registerTool } from "./tool";

function detectAntigravity(): boolean {
  const envPath = process.env.PATH || "";
  const dirs = envPath.split(path.delimiter);
  for (const dir of dirs) {
    try {
      const files = fs.readdirSync(dir);
      if (files.includes("agy") || files.includes("agy.exe")) return true;
    } catch {
      // skip
    }
  }
  return false;
}

const antigravity: Tool = {
  id: "antigravity",
  name: "Antigravity (agy)",
  detect(): boolean {
    return detectAntigravity();
  },
  configPaths(): string[] {
    return [path.join(os.homedir(), ".antigravity", "plugins", "mcp.json")];
  },
  generateConfig(contextdPath: string): Record<string, unknown> {
    return {
      mcpServers: {
        contextd: {
          command: contextdPath,
          args: ["mcp"],
        },
      },
    };
  },
  merge(
    existing: Record<string, unknown>,
    contextdPath: string,
  ): Record<string, unknown> {
    return mergeConfig(existing, "mcpServers", {
      contextd: {
        command: contextdPath,
        args: ["mcp"],
      },
    });
  },
  summary(_contextdPath: string): string {
    return `Config: ~/.antigravity/plugins/mcp.json`;
  },
};

registerTool(antigravity);
export { antigravity };
