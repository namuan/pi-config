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

const createContext = (choice: string) => {
  const selectCalls: Array<{ message: string; options: string[] }> = [];
  return {
    hasUI: true,
    ui: {
      select: async (message: string, options: string[]) => {
        selectCalls.push({ message, options });
        return choice;
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
      "Session approval required:",
    );
    expect(firstCtx.selectCalls[0].options).toEqual(
      expect.arrayContaining([
        'Allow exactly "npm run test" (session)',
        prefixLabel,
        'Allow commands beginning with "npm" (session)',
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
    expect(ctx.selectCalls[0].message).toContain("Command breakdown:");
    expect(ctx.selectCalls[0].message).toContain("read-only: git status");
    expect(ctx.selectCalls[0].message).toContain("needs approval: npm run ci");
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
      "<success>  ✓ read-only: git status</success>",
    );
    expect(ctx.selectCalls[0].message).toContain(
      "<warning>  ! needs approval: npm run ci</warning>",
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
