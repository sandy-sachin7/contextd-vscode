import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { Tool, mergeConfig, registerTool } from "./tool";

function claudeConfigPath(): string {
  const home = os.homedir();
  if (process.platform === "darwin") {
    return path.join(home, "Library", "Application Support", "Claude", "claude_desktop_config.json");
  }
  if (process.platform === "win32") {
    return path.join(process.env.APPDATA || "", "Claude", "claude_desktop_config.json");
  }
  return path.join(home, ".config", "Claude", "claude_desktop_config.json");
}

const claudeDesktop: Tool = {
  id: "claude-desktop",
  name: "Claude Desktop",
  detect(): boolean {
    if (process.platform === "darwin") {
      return fs.existsSync("/Applications/Claude.app");
    }
    return fs.existsSync(claudeConfigPath().replace("claude_desktop_config.json", ""));
  },
  configPaths(): string[] {
    return [claudeConfigPath()];
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
    return `Config: ${claudeConfigPath()}`;
  },
};

registerTool(claudeDesktop);
export { claudeDesktop };
