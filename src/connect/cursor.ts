import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { Tool, mergeConfig, registerTool } from "./tool";

function detectCursor(): boolean {
  const envPath = process.env.PATH || "";
  const dirs = envPath.split(path.delimiter);
  for (const dir of dirs) {
    try {
      const files = fs.readdirSync(dir);
      if (files.includes("cursor") || files.includes("cursor.exe")) return true;
    } catch {
      // skip
    }
  }
  return fs.existsSync(path.join(os.homedir(), ".cursor"));
}

const cursor: Tool = {
  id: "cursor",
  name: "Cursor",
  detect(): boolean {
    return detectCursor();
  },
  configPaths(): string[] {
    return [
      path.join(process.cwd(), ".cursor", "mcp.json"),
      path.join(os.homedir(), ".cursor", "mcp.json"),
    ];
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
    return `Config: .cursor/mcp.json`;
  },
};

registerTool(cursor);
export { cursor };
