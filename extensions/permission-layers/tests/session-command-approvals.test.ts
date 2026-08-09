import { describe, expect, test, vi } from "vitest";
import { getSettingsMock } from "./fixtures/helpers";

vi.mock("../src/core/settings", () => getSettingsMock());

import sessionCommandApprovals from "../index";

type Handler = (event: any, ctx: any) => Promise<unknown> | unknown;

const createExtension = () => {
  const handlers = new Map<string, Handler>();
  sessionCommandApprovals({
    on: (event: string, handler: Handler) => handlers.set(event, handler),
  } as any);
  return handlers;
};

const createContext = (choice: string | string[]) => {
  const choices = Array.isArray(choice) ? [...choice] : [choice];
  const selectCalls: Array<{ message: string; options: string[] }> = [];
  return {
    hasUI: true,
    ui: {
      select: async (message: string, options: string[]) => {
        selectCalls.push({ message, options });
        return choices.shift() ?? "Cancel";
      },
      notify: vi.fn(),
    },
    selectCalls,
  };
};

describe("session command approvals", () => {
  test("offers scoped approvals without a global permission level", async () => {
    const handlers = createExtension();
    const start = handlers.get("session_start")!;
    const toolCall = handlers.get("tool_call")!;
    const prefixLabel = 'Allow commands beginning with "npm run" (session)';
    const firstCtx = createContext(prefixLabel);

    await start({}, firstCtx);
    const firstResult = await toolCall(
      { toolName: "bash", input: { command: "npm run test" } },
      firstCtx,
    );

    expect(firstResult).toBeUndefined();
    expect(firstCtx.selectCalls[0].message).toContain(
      "Approval needed",
    );
    expect(firstCtx.selectCalls[0].options).toEqual(
      expect.arrayContaining([
        'Allow exactly "npm run test" (session)',
        prefixLabel,
        'Allow commands beginning with "npm" (session)',
        "Choose a global command approval…",
      ]),
    );

    const laterCtx = createContext("Cancel");
    const laterResult = await toolCall(
      { toolName: "bash", input: { command: "npm run ci" } },
      laterCtx,
    );
    expect(laterResult).toBeUndefined();
    expect(laterCtx.selectCalls).toHaveLength(0);

    await start({}, laterCtx);
    const afterRestartResult = await toolCall(
      { toolName: "bash", input: { command: "npm run ci" } },
      laterCtx,
    );
    expect(afterRestartResult).toMatchObject({ block: true });
  });

  test("offers global scopes in a second, explicit selection", async () => {
    const handlers = createExtension();
    const start = handlers.get("session_start")!;
    const toolCall = handlers.get("tool_call")!;
    const ctx = createContext([
      "Choose a global command approval…",
      'Always allow commands beginning with "npm run" (all sessions)',
    ]);

    await start({}, ctx);
    const result = await toolCall(
      { toolName: "bash", input: { command: "npm run test" } },
      ctx,
    );

    expect(result).toBeUndefined();
    expect(ctx.selectCalls).toHaveLength(2);
    expect(ctx.selectCalls[1].message).toBe("Choose a global command approval:");
    expect(ctx.selectCalls[1].options).toContain(
      'Always allow commands beginning with "npm run" (all sessions)',
    );
  });

  test("breaks compound commands down by approval requirement", async () => {
    const handlers = createExtension();
    const toolCall = handlers.get("tool_call")!;
    const ctx = createContext("Cancel");

    const result = await toolCall(
      { toolName: "bash", input: { command: "git status && npm run ci" } },
      ctx,
    );

    expect(result).toMatchObject({ block: true });
    expect((result as { reason: string }).reason).toContain(
      "Do not send compound shell commands; use one bash command per tool call",
    );
    expect(ctx.selectCalls[0].message).toContain(
      "✓ no approval · ! approval · ✕ danger",
    );
    expect(ctx.selectCalls[0].message).toContain("✓ git status");
    expect(ctx.selectCalls[0].message).toContain("! npm run ci");
  });

  test("offers reusable approval scopes for elevated commands in a compound command", async () => {
    const handlers = createExtension();
    const toolCall = handlers.get("tool_call")!;
    const ctx = createContext('Allow commands beginning with "npm run" (session)');

    const result = await toolCall(
      { toolName: "bash", input: { command: "git status && npm run ci" } },
      ctx,
    );

    expect(result).toBeUndefined();
    expect(ctx.selectCalls).toHaveLength(1);
    expect(ctx.selectCalls[0].options).toContain(
      'Allow commands beginning with "npm run" (session)',
    );
  });

  test("auto-approves a score at the configured threshold", async () => {
    const handlers = createExtension();
    const toolCall = handlers.get("tool_call")!;
    const ctx = createContext("Cancel") as any;
    ctx.modelRegistry = {
      find: vi.fn(() => ({ provider: "opencode-go", id: "deepseek-v4-flash" })),
      hasConfiguredAuth: vi.fn(() => true),
      complete: vi.fn(async () => ({
        content: [{ type: "text", text: '{"score":70,"reason":"local reversible development task"}' }],
      })),
    };

    const result = await toolCall(
      { toolName: "bash", input: { command: "npm run test" } },
      ctx,
    );

    expect(result).toBeUndefined();
    expect(ctx.modelRegistry.find).toHaveBeenCalledWith(
      "opencode-go",
      "deepseek-v4-flash",
    );
    expect(ctx.selectCalls).toHaveLength(0);
    expect(ctx.ui.notify).toHaveBeenCalledWith(
      "✓ auto-approved\n$ npm run test\n◆ safety 70/100 · local reversible development task",
      "info",
    );
  });

  test("auto-approves safety scores above 70", async () => {
    const handlers = createExtension();
    const toolCall = handlers.get("tool_call")!;
    const ctx = createContext("Cancel") as any;
    ctx.modelRegistry = {
      find: vi.fn(() => ({ provider: "opencode-go", id: "deepseek-v4-flash" })),
      hasConfiguredAuth: vi.fn(() => true),
      complete: vi.fn(async () => ({
        content: [{ type: "text", text: '{"score":71,"reason":"local reversible development task"}' }],
      })),
    };

    const result = await toolCall(
      { toolName: "bash", input: { command: "npm run test" } },
      ctx,
    );

    expect(result).toBeUndefined();
    expect(ctx.selectCalls).toHaveLength(0);
    expect(ctx.ui.notify).toHaveBeenCalledWith(
      "✓ auto-approved\n$ npm run test\n◆ safety 71/100 · local reversible development task",
      "info",
    );
  });

  test("uses semantic theme colours for the command breakdown", async () => {
    const handlers = createExtension();
    const toolCall = handlers.get("tool_call")!;
    const ctx = createContext("Cancel");
    (ctx.ui as any).theme = {
      fg: (color: string, text: string) => `<${color}>${text}</${color}>`,
    };

    await toolCall(
      { toolName: "bash", input: { command: "git status && npm run ci" } },
      ctx,
    );

    expect(ctx.selectCalls[0].message).toContain(
      "<success>✓ git status</success>",
    );
    expect(ctx.selectCalls[0].message).toContain(
      "<warning>! npm run ci</warning>",
    );
  });

  test("allows the read-only baseline without a prompt", async () => {
    const handlers = createExtension();
    const toolCall = handlers.get("tool_call")!;
    const ctx = createContext("Cancel");

    const result = await toolCall(
      { toolName: "bash", input: { command: "git status" } },
      ctx,
    );

    expect(result).toBeUndefined();
    expect(ctx.selectCalls).toHaveLength(0);
  });
});
