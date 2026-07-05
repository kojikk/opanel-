import { afterEach, describe, expect, it, vi } from "vitest";
import type { Rcon } from "rcon-client";
import { _setRconConnectForTests, disconnectAll, sendCommand } from "@/lib/rcon/client";

function makeFakeRcon(sendImpl?: (command: string) => Promise<string>) {
  return {
    send: vi.fn(sendImpl ?? (async (command: string) => `ok:${command}`)),
    end: vi.fn(async () => {}),
  } as unknown as Rcon & { send: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> };
}

afterEach(async () => {
  await disconnectAll();
  _setRconConnectForTests(null);
  vi.useRealTimers();
});

describe("rcon connection pool", () => {
  it("shares a single connect across 10 concurrent sendCommand calls", async () => {
    let connectCount = 0;
    const fake = makeFakeRcon();
    _setRconConnectForTests(async () => {
      connectCount++;
      // Simulate connect latency so all 10 callers arrive before it resolves.
      await new Promise((resolve) => setTimeout(resolve, 10));
      return fake;
    });

    const results = await Promise.all(
      Array.from({ length: 10 }, () => sendCommand("localhost", 25575, "pw", "list"))
    );

    expect(connectCount).toBe(1);
    expect(results.every((r) => r === "ok:list")).toBe(true);
    expect(fake.send).toHaveBeenCalledTimes(10);
  });

  it("clears the pool entry when connect rejects so the next call retries", async () => {
    let connectCount = 0;
    const fake = makeFakeRcon();
    _setRconConnectForTests(async () => {
      connectCount++;
      if (connectCount === 1) throw new Error("ECONNREFUSED");
      return fake;
    });

    await expect(sendCommand("localhost", 25575, "pw", "list")).rejects.toThrow("ECONNREFUSED");
    // Wait a tick so the rejection cleanup handler runs.
    await new Promise((resolve) => setImmediate(resolve));

    await expect(sendCommand("localhost", 25575, "pw", "list")).resolves.toBe("ok:list");
    expect(connectCount).toBe(2);
  });

  it("evicts and closes idle connections after the idle timeout", async () => {
    vi.useFakeTimers();
    vi.resetModules();
    // Fresh import so the sweep interval is registered with fake timers.
    const mod = await import("@/lib/rcon/client");

    let connectCount = 0;
    const fake = makeFakeRcon();
    mod._setRconConnectForTests(async () => {
      connectCount++;
      return fake;
    });

    await mod.sendCommand("localhost", 25575, "pw", "list");
    expect(connectCount).toBe(1);

    // Advance past IDLE_TIMEOUT (60s) so a sweep (every 30s) evicts the entry.
    await vi.advanceTimersByTimeAsync(91_000);
    expect(fake.end).toHaveBeenCalled();

    // Next command needs a fresh connection.
    await mod.sendCommand("localhost", 25575, "pw", "list");
    expect(connectCount).toBe(2);

    await mod.disconnectAll();
    mod._setRconConnectForTests(null);
  });

  it("reconnects once on connection-level command failure and retries the command", async () => {
    let connectCount = 0;
    const deadRcon = makeFakeRcon(async () => {
      throw new Error("read ECONNRESET");
    });
    const freshRcon = makeFakeRcon();
    _setRconConnectForTests(async () => {
      connectCount++;
      return connectCount === 1 ? deadRcon : freshRcon;
    });

    await expect(sendCommand("localhost", 25575, "pw", "list")).resolves.toBe("ok:list");
    expect(connectCount).toBe(2);
    expect(deadRcon.send).toHaveBeenCalledTimes(1);
    expect(freshRcon.send).toHaveBeenCalledTimes(1);
    expect(deadRcon.end).toHaveBeenCalled();
  });

  it("propagates the error after exactly one reconnect attempt (no infinite retry)", async () => {
    let connectCount = 0;
    _setRconConnectForTests(async () => {
      connectCount++;
      return makeFakeRcon(async () => {
        throw new Error("socket closed");
      });
    });

    await expect(sendCommand("localhost", 25575, "pw", "list")).rejects.toThrow("socket closed");
    expect(connectCount).toBe(2);
  });

  it("does not reconnect on non-connection command errors", async () => {
    let connectCount = 0;
    const fake = makeFakeRcon(async () => {
      throw new Error("Invalid gamerule value");
    });
    _setRconConnectForTests(async () => {
      connectCount++;
      return fake;
    });

    await expect(sendCommand("localhost", 25575, "pw", "gamerule foo")).rejects.toThrow("Invalid gamerule value");
    expect(connectCount).toBe(1);
  });
});
