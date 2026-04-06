import { describe, it, expect } from "vitest";
import { P, ALL_PERMISSIONS, PERMISSION_GROUPS } from "@/lib/auth/permissions";

describe("permissions", () => {
  it("P object contains string values", () => {
    expect(typeof P.SERVER_VIEW).toBe("string");
    expect(P.SERVER_VIEW).toBe("server.view");
    expect(P.PLAYERS_GAMEMODE).toBe("players.gamemode");
  });

  it("ALL_PERMISSIONS includes every P value", () => {
    const pValues = Object.values(P);
    expect(ALL_PERMISSIONS).toHaveLength(pValues.length);
    for (const v of pValues) {
      expect(ALL_PERMISSIONS).toContain(v);
    }
  });

  it("PERMISSION_GROUPS covers all permissions", () => {
    const allGroupKeys = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key));
    for (const perm of ALL_PERMISSIONS) {
      expect(allGroupKeys).toContain(perm);
    }
  });

  it("no duplicate permissions across groups", () => {
    const allGroupKeys = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key));
    const unique = new Set(allGroupKeys);
    expect(unique.size).toBe(allGroupKeys.length);
  });

  it("permission format is resource.action", () => {
    for (const perm of ALL_PERMISSIONS) {
      expect(perm).toMatch(/^[a-z]+\.[a-z]+$/);
    }
  });
});
