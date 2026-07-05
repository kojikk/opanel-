import { describe, expect, it, vi } from "vitest";
import {
  KNOWN_GAMERULES,
  fetchGamerules,
  findUnknownGameruleKeys,
  isUnknownGameruleReply,
  parseGameruleValue,
} from "@/lib/rcon/gamerules-fetch";

const reply = (rule: string, value: string) => `Gamerule ${rule} is currently set to: ${value}`;

describe("parseGameruleValue", () => {
  it("parses vanilla output", () => {
    expect(parseGameruleValue("Gamerule doDaylightCycle is currently set to: true")).toBe("true");
    expect(parseGameruleValue("Gamerule randomTickSpeed is currently set to: 3")).toBe("3");
  });

  it("parses 'has value' variant", () => {
    expect(parseGameruleValue("doFireTick has value: false")).toBe("false");
  });

  it("returns null for error messages (no broad colon fallback)", () => {
    expect(parseGameruleValue("Unknown or incomplete command, see below for error: gamerule<--[HERE]")).toBeNull();
    expect(parseGameruleValue("An unexpected error occurred: timeout")).toBeNull();
    expect(parseGameruleValue("")).toBeNull();
  });
});

describe("isUnknownGameruleReply", () => {
  it("detects unknown gamerule/command replies", () => {
    expect(isUnknownGameruleReply("Unknown game rule: doVinesSpread")).toBe(true);
    expect(isUnknownGameruleReply("Unknown gamerule 'spawnChunkRadius'")).toBe(true);
    expect(isUnknownGameruleReply("Unknown command")).toBe(true);
    expect(isUnknownGameruleReply("Incorrect argument for command")).toBe(true);
  });

  it("does not flag normal value replies", () => {
    expect(isUnknownGameruleReply(reply("keepInventory", "false"))).toBe(false);
  });
});

describe("fetchGamerules", () => {
  it("returns all values when every command succeeds", async () => {
    const exec = vi.fn(async (command: string) => {
      const rule = command.replace("gamerule ", "");
      return reply(rule, "true");
    });

    const result = await fetchGamerules(exec, KNOWN_GAMERULES);

    expect(result.failed).toEqual([]);
    expect(Object.keys(result.rules)).toHaveLength(KNOWN_GAMERULES.length);
    expect(result.rules.keepInventory).toBe("true");
    expect(exec).toHaveBeenCalledTimes(KNOWN_GAMERULES.length);
  });

  it("retries once and succeeds (value present, failed empty)", async () => {
    const attempts = new Map<string, number>();
    const exec = vi.fn(async (command: string) => {
      const rule = command.replace("gamerule ", "");
      const n = (attempts.get(rule) ?? 0) + 1;
      attempts.set(rule, n);
      if (rule === "doFireTick" && n === 1) throw new Error("read ECONNRESET");
      return reply(rule, "true");
    });

    const result = await fetchGamerules(exec, ["doFireTick", "keepInventory"]);

    expect(result.rules.doFireTick).toBe("true");
    expect(result.rules.keepInventory).toBe("true");
    expect(result.failed).toEqual([]);
    expect(attempts.get("doFireTick")).toBe(2);
  });

  it("reports rules that fail twice in failed[] instead of silently dropping them", async () => {
    const exec = vi.fn(async (command: string) => {
      const rule = command.replace("gamerule ", "");
      if (rule === "mobGriefing") throw new Error("timeout");
      return reply(rule, "false");
    });

    const result = await fetchGamerules(exec, ["mobGriefing", "doInsomnia"]);

    expect(result.failed).toEqual(["mobGriefing"]);
    expect(result.rules).not.toHaveProperty("mobGriefing");
    expect(result.rules.doInsomnia).toBe("false");
  });

  it("omits genuinely unsupported rules (unknown gamerule reply) without listing them as failed", async () => {
    const exec = vi.fn(async (command: string) => {
      const rule = command.replace("gamerule ", "");
      if (rule === "doVinesSpread") return "Unknown game rule: doVinesSpread";
      return reply(rule, "true");
    });

    const result = await fetchGamerules(exec, ["doVinesSpread", "fallDamage"]);

    expect(result.rules).not.toHaveProperty("doVinesSpread");
    expect(result.failed).toEqual([]);
    expect(result.rules.fallDamage).toBe("true");
    // Unknown-gamerule replies are conclusive: no retry.
    expect(exec.mock.calls.filter(([c]) => c === "gamerule doVinesSpread")).toHaveLength(1);
  });

  it("never runs more than 8 commands in flight at once", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const exec = vi.fn(async (command: string) => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 1));
      inFlight--;
      return reply(command.replace("gamerule ", ""), "true");
    });

    await fetchGamerules(exec, KNOWN_GAMERULES);

    expect(maxInFlight).toBeLessThanOrEqual(8);
    expect(maxInFlight).toBeGreaterThan(1);
  });
});

describe("findUnknownGameruleKeys", () => {
  it("returns empty array when all keys are known", () => {
    expect(findUnknownGameruleKeys(["keepInventory", "doFireTick"])).toEqual([]);
  });

  it("lists unknown keys", () => {
    expect(findUnknownGameruleKeys(["keepInventory", "totallyFake", "alsoFake"]))
      .toEqual(["totallyFake", "alsoFake"]);
  });
});
