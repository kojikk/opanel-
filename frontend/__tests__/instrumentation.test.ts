import { beforeEach, describe, expect, it, vi } from "vitest";

const initScheduler = vi.fn(async () => {});
vi.mock("@/lib/tasks/scheduler", () => ({ initScheduler }));

import { register } from "@/instrumentation";

const g = globalThis as unknown as { __opanelSchedulerInit?: boolean };

describe("instrumentation register()", () => {
  beforeEach(() => {
    g.__opanelSchedulerInit = false;
    initScheduler.mockClear();
    vi.unstubAllEnvs();
  });

  it("initializes the scheduler on the nodejs runtime", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    await register();
    expect(initScheduler).toHaveBeenCalledTimes(1);
  });

  it("guards against double-init across repeated register() calls", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    await register();
    await register();
    expect(initScheduler).toHaveBeenCalledTimes(1);
  });

  it("does nothing on the edge runtime", async () => {
    vi.stubEnv("NEXT_RUNTIME", "edge");
    await register();
    expect(initScheduler).not.toHaveBeenCalled();
    expect(g.__opanelSchedulerInit).toBe(false);
  });
});
