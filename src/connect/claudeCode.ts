import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { Tool, mergeConfig, registerTool } from "./tool";

function detectClaudeCode(): boolean {
  const envPath = process.env.PATH || "";
  const dirs = envPath.split(path.delimiter);
  for (const dir of dirs) {
    try {
      const files = fs.readdirSync(dir);
      if (files.includes("claude") || files.includes("claude.exe")) return true;
    } catch {
      // skip
    }
  }
  return false;
}

const claudeCode: Tool = {
  id: "claude-code",
  name: "Claude Code",
  detect(): boolean {
    return detectClaudeCode() || fs.existsSync(path.join(os.homedir(), ".claude.json"));
  },
  configPaths(): string[] {
    return [
      path.join(process.cwd(), ".mcp.json"),
      path.join(os.homedir(), ".claude.json"),
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
    return `Config: .mcp.json or ~/.claude.json`;
  },
};

registerTool(claudeCode);
export { claudeCode };
