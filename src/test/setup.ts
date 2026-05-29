import { vi } from "vitest";

const mockConfigGet = vi.fn((_key: string, defaultValue: unknown) => defaultValue);

vi.mock("vscode", () => ({
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: mockConfigGet,
    })),
  },
  window: {
    createStatusBarItem: vi.fn(() => ({
      show: vi.fn(),
      dispose: vi.fn(),
      text: "",
      tooltip: "",
      backgroundColor: undefined,
      color: undefined,
      command: "",
    })),
    showErrorMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    showInformationMessage: vi.fn(),
    showInputBox: vi.fn(),
    showQuickPick: vi.fn(() => Promise.resolve(undefined)),
    createWebviewPanel: vi.fn(() => ({
      webview: {
        html: "",
        postMessage: vi.fn(),
        onDidReceiveMessage: vi.fn(),
      },
      onDidDispose: vi.fn(),
      dispose: vi.fn(),
    })),
    withProgress: vi.fn(),
    createTreeView: vi.fn(),
    openTextDocument: vi.fn(),
    showTextDocument: vi.fn(),
  },
  env: {
    openExternal: vi.fn(),
  },
  Uri: {
    parse: vi.fn((s: string) => s),
    file: vi.fn((s: string) => s),
    joinPath: vi.fn(() => ({ fsPath: "" })),
  },
  EventEmitter: vi.fn(() => ({
    event: vi.fn(),
    fire: vi.fn(),
  })),
  StatusBarAlignment: { Left: 1, Right: 2 },
  ThemeColor: vi.fn((id: string) => ({ id })),
  TreeItem: vi.fn(),
  TreeItemCollapsibleState: { None: 0, Collapsed: 1 },
  commands: {
    registerCommand: vi.fn(),
    executeCommand: vi.fn(),
  },
}));

vi.mock("fs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("fs")>()),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(),
  existsSync: vi.fn(() => false),
  readdirSync: vi.fn(() => []),
}));
