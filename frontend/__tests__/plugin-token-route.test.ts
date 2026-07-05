import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const requireAuth = vi.fn(async (_req: NextRequest) => ({ userId: "test" }));
vi.mock("@/lib/auth", () => ({
  requireAuth: (req: NextRequest) => requireAuth(req),
}));

const getServer = vi.fn();
vi.mock("@/lib/server-manager", () => ({
  getServer: (id: string) => getServer(id),
}));

import { GET } from "@/app/api/servers/[serverId]/plugin-token/route";
import { derivePluginSecret, verifyPluginToken } from "@/lib/plugin-token";

const params = Promise.resolve({ serverId: "srv-1" });
const request = {} as NextRequest;

beforeEach(() => {
  requireAuth.mockClear();
  requireAuth.mockResolvedValue({ userId: "test" });
  getServer.mockReset();
});

describe("plugin-token route", () => {
  it("returns 401 when unauthenticated", async () => {
    requireAuth.mockRejectedValueOnce(new Error("Unauthorized"));
    const res = await GET(request, { params });
    expect(res.status).toBe(401);
  });

  it("returns 404 when the server does not exist", async () => {
    getServer.mockResolvedValueOnce(null);
    const res = await GET(request, { params });
    expect(res.status).toBe(404);
  });

  it("returns 409 when the plugin is not installed", async () => {
    getServer.mockResolvedValueOnce({ pluginInstalled: false, rconPassword: "pw" });
    const res = await GET(request, { params });
    expect(res.status).toBe(409);
  });

  it("mints a verifiable token for a plugin-enabled server", async () => {
    getServer.mockResolvedValueOnce({ pluginInstalled: true, rconPassword: "pw" });
    const res = await GET(request, { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(verifyPluginToken(data.token, derivePluginSecret("pw"))).toBe(true);
  });
});
