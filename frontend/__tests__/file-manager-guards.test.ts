import path from "path";
import { describe, expect, it, vi } from "vitest";

const BASE = path.resolve(path.join("/x", "servers", "test"));

vi.mock("@/lib/db/client", async () => {
  const { default: p } = await import("path");
  const dataPath = p.resolve(p.join("/x", "servers", "test"));
  return {
    prisma: {
      server: {
        findUnique: vi.fn().mockResolvedValue({ id: "srv1", dataPath }),
      },
    },
  };
});

import { assertInsideBase, fileExists } from "@/lib/file-manager";

describe("assertInsideBase", () => {
  it("accepts the base itself", () => {
    expect(() => assertInsideBase(BASE, BASE)).not.toThrow();
  });

  it("accepts paths inside the base", () => {
    expect(() => assertInsideBase(path.join(BASE, "sub", "f"), BASE)).not.toThrow();
    expect(() => assertInsideBase(path.join(BASE, "f.jar"), BASE)).not.toThrow();
  });

  it("rejects sibling directories sharing the base as a prefix", () => {
    const sibling = path.resolve(path.join("/x", "servers", "testXYZ", "f"));
    expect(() => assertInsideBase(sibling, BASE)).toThrow("Path traversal not allowed");
  });

  it("rejects paths outside the base", () => {
    expect(() => assertInsideBase(path.resolve(path.join("/x", "servers")), BASE)).toThrow("Path traversal not allowed");
    expect(() => assertInsideBase(path.resolve(path.join("/etc", "passwd")), BASE)).toThrow("Path traversal not allowed");
  });
});

describe("fileExists", () => {
  it("throws on path traversal input", async () => {
    await expect(fileExists("srv1", "../../etc/passwd")).rejects.toThrow("Path traversal not allowed");
  });

  it("does not throw for paths inside the server directory", async () => {
    await expect(fileExists("srv1", "plugins/some.jar")).resolves.toBe(false);
  });
});
