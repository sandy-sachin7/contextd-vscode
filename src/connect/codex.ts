import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { Tool, mergeConfig, registerTool } from "./tool";

function getHomeDir(): string {
  return os.homedir();
}

const codex: Tool = {
  id: "codex",
  name: "Codex",
  
  detect(): boolean {
    const home = getHomeDir();
    const configPath = path.join(home, ".codex", "config.toml");
    
    if (fs.existsSync(configPath)) {
      return true;
    }
    
    // Check path for codex
    const paths = process.env.PATH ? process.env.PATH.split(path.delimiter) : [];
    for (const p of paths) {
      if (fs.existsSync(path.join(p, "codex")) || fs.existsSync(path.join(p, "codex.exe"))) {
        return true;
      }
    }
    
    return false;
  },

  configPaths(): string[] {
    const home = getHomeDir();
    return [
      path.join(process.cwd(), ".codex", "config.toml"),
      path.join(home, ".codex", "config.toml"),
    ];
  },

  generateConfig(contextdPath: string): Record<string, unknown> {
    return {
      mcp_servers: {
        contextd: {
          command: contextdPath,
          args: ["mcp"]
        }
      }
    };
  },

  merge(existing: Record<string, unknown>, contextdPath: string): Record<string, unknown> {
    const gen = this.generateConfig(contextdPath);
    return mergeConfig(existing, "mcp_servers", gen.mcp_servers as Record<string, unknown>);
  },

  summary(contextdPath: string): string {
    return `Adds contextd to mcp_servers`;
  }
};

registerTool(codex);
export { codex };
