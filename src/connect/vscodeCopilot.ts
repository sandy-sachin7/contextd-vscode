import * as path from "path";
import { Tool, mergeConfig, registerTool } from "./tool";

const vscodeCopilot: Tool = {
  id: "vscode-copilot",
  name: "GitHub Copilot (VSCode)",
  detect(): boolean {
    return true;
  },
  configPaths(): string[] {
    return [path.join(process.cwd(), ".vscode", "mcp.json")];
  },
  generateConfig(contextdPath: string): Record<string, unknown> {
    return {
      servers: {
        contextd: {
          type: "stdio",
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
    return mergeConfig(existing, "servers", {
      contextd: {
        type: "stdio",
        command: contextdPath,
        args: ["mcp"],
      },
    });
  },
  summary(_contextdPath: string): string {
    return `Config: .vscode/mcp.json (key: "servers")`;
  },
};

registerTool(vscodeCopilot);
export { vscodeCopilot };
