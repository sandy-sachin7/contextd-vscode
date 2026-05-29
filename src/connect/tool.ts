export interface Tool {
  readonly id: string;
  readonly name: string;
  detect(): boolean;
  configPaths(): string[];
  generateConfig(contextdPath: string): Record<string, unknown>;
  merge(
    existing: Record<string, unknown>,
    contextdPath: string,
  ): Record<string, unknown>;
  summary(contextdPath: string): string;
}

export function mergeConfig(
  existing: Record<string, unknown>,
  key: string,
  newValue: Record<string, unknown>,
): Record<string, unknown> {
  const existingSection = (existing[key] as Record<string, unknown>) || {};
  return {
    ...existing,
    [key]: {
      ...existingSection,
      ...newValue,
    },
  };
}

export function mergeArrayConfig(
  existing: Record<string, unknown>,
  key: string,
  newEntry: Record<string, unknown>,
): Record<string, unknown> {
  const existingArr = (existing[key] as Record<string, unknown>[]) || [];
  const filtered = existingArr.filter(
    (e: Record<string, unknown>) => e.name !== (newEntry.name as string),
  );
  return {
    ...existing,
    [key]: [...filtered, newEntry],
  };
}

export const TOOLS: Tool[] = [];

export function registerTool(tool: Tool): void {
  TOOLS.push(tool);
}
