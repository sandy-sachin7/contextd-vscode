import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { Tool, mergeConfig, registerTool } from "./tool";

function detectCopilotCli(): boolean {
  const envPath = process.env.PATH || "";
  const dirs = envPath.split(path.delimiter);
  for (const dir of dirs) {
    try {
      const files = fs.readdirSync(dir);
      if (
        files.includes("github-copilot-cli") ||
        files.includes("github-copilot-cli.exe") ||
        files.includes("copilot")
      )
        return true;
    } catch {
      // skip
    }
  }
  return false;
}

const copilotCli: Tool = {
  id: "copilot-cli",
  name: "GitHub Copilot CLI",
  detect(): boolean {
    return detectCopilotCli();
  },
  configPaths(): string[] {
    return [path.join(os.homedir(), ".copilot", "mcp-config.json")];
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
    return `Config: ~/.copilot/mcp-config.json`;
  },
};

registerTool(copilotCli);
export { copilotCli };
