import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { Tool, mergeArrayConfig, registerTool } from "./tool";

function detectContinue(): boolean {
  return fs.existsSync(path.join(os.homedir(), ".continue"));
}

const continueTool: Tool = {
  id: "continue",
  name: "Continue",
  detect(): boolean {
    return detectContinue();
  },
  configPaths(): string[] {
    return [
      path.join(os.homedir(), ".continue", "config.json"),
      path.join(process.cwd(), ".continuerc.json"),
    ];
  },
  generateConfig(contextdPath: string): Record<string, unknown> {
    return {
      mcpServers: [
        {
          name: "contextd",
          command: contextdPath,
          args: ["mcp"],
        },
      ],
    };
  },
  merge(
    existing: Record<string, unknown>,
    contextdPath: string,
  ): Record<string, unknown> {
    return mergeArrayConfig(existing, "mcpServers", {
      name: "contextd",
      command: contextdPath,
      args: ["mcp"],
    });
  },
  summary(_contextdPath: string): string {
    return `Config: ~/.continue/config.json (key: "mcpServers", ARRAY format)`;
  },
};

registerTool(continueTool);
export { continueTool };
