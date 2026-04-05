import { describe, expect, it } from "vitest";

function sanitizeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

describe("sanitizeName", () => {
  it("lowercases the name", () => {
    expect(sanitizeName("MyServer")).toBe("myserver");
  });

  it("replaces spaces with hyphens", () => {
    expect(sanitizeName("my server")).toBe("my-server");
  });

  it("replaces special characters with hyphens", () => {
    expect(sanitizeName("server@2024!")).toBe("server-2024-");
    expect(sanitizeName("test.server.name")).toBe("test-server-name");
  });

  it("keeps numbers and hyphens", () => {
    expect(sanitizeName("server-1")).toBe("server-1");
    expect(sanitizeName("my-server-2")).toBe("my-server-2");
  });

  it("handles empty string", () => {
    expect(sanitizeName("")).toBe("");
  });

  it("handles unicode characters", () => {
    expect(sanitizeName("сервер")).toBe("------");
    expect(sanitizeName("server-日本")).toBe("server---");
  });
});

describe("container name generation", () => {
  const CONTAINER_PREFIX = "opanel-mc-";

  function containerName(name: string) {
    return `${CONTAINER_PREFIX}${sanitizeName(name)}`;
  }

  it("generates valid container names", () => {
    expect(containerName("My Server")).toBe("opanel-mc-my-server");
    expect(containerName("SMP")).toBe("opanel-mc-smp");
    expect(containerName("creative-1")).toBe("opanel-mc-creative-1");
  });

  it("always starts with prefix", () => {
    expect(containerName("test").startsWith(CONTAINER_PREFIX)).toBe(true);
  });
});
