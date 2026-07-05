import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(async () => ({ userId: "test" })),
}));

const executeCommand = vi.fn(async (_serverId: string, command: string) => {
  const match = command.match(/^gamerule (\S+)(?: (.+))?$/);
  if (!match) return "Unknown command";
  const [, rule, value] = match;
  if (value !== undefined) return `Gamerule ${rule} is now set to: ${value}`;
  return `Gamerule ${rule} is currently set to: true`;
});

vi.mock("@/lib/server-manager", () => ({
  executeCommand: (serverId: string, command: string) => executeCommand(serverId, command),
}));

import { GET, POST } from "@/app/api/servers/[serverId]/gamerules/route";

const params = Promise.resolve({ serverId: "srv-1" });

function makeRequest(body?: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

beforeEach(() => {
  executeCommand.mockClear();
});

describe("gamerules route POST validation", () => {
  it("rejects unknown gamerule keys with 400 and does not execute any command", async () => {
    const res = await POST(makeRequest({ keepInventory: "true", notARealRule: "1" }), { params });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.unknownKeys).toEqual(["notARealRule"]);
    expect(data.error).toContain("notARealRule");
    expect(executeCommand).not.toHaveBeenCalled();
  });

  it("accepts known gamerule keys and executes commands", async () => {
    const res = await POST(makeRequest({ keepInventory: "true" }), { params });

    expect(res.status).toBe(200);
    expect(executeCommand).toHaveBeenCalledWith("srv-1", "gamerule keepInventory true");
  });
});

describe("gamerules route GET", () => {
  it("returns { rules, failed } with parsed values", async () => {
    const res = await GET(makeRequest(), { params });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.failed).toEqual([]);
    expect(data.rules.keepInventory).toBe("true");
  });
});
