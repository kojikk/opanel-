import { beforeEach, describe, expect, it, vi } from "vitest";

const GIB = 1024 * 1024 * 1024;
const MIB = 1024 * 1024;

const { stopMock, removeMock } = vi.hoisted(() => ({
  stopMock: vi.fn(),
  removeMock: vi.fn(),
}));

vi.mock("dockerode", () => ({
  default: class MockDocker {
    getContainer() {
      return { stop: stopMock, remove: removeMock };
    }
  },
}));

import { deriveContainerMemoryBytes, removeContainer } from "@/lib/docker/client";

function statusError(statusCode: number): Error {
  const err = new Error(`docker error ${statusCode}`) as Error & { statusCode: number };
  err.statusCode = statusCode;
  return err;
}

describe("deriveContainerMemoryBytes", () => {
  it("adds 1 GiB overhead for small heaps (512M)", () => {
    expect(deriveContainerMemoryBytes("512M")).toBe(512 * MIB + GIB);
  });

  it("adds max(1 GiB, 50% of heap) for 2G", () => {
    expect(deriveContainerMemoryBytes("2G")).toBe(3 * GIB);
  });

  it("adds 50% of heap for large heaps (16G -> 24 GiB)", () => {
    expect(deriveContainerMemoryBytes("16G")).toBe(24 * GIB);
  });

  it("accepts lowercase suffixes", () => {
    expect(deriveContainerMemoryBytes("2g")).toBe(3 * GIB);
    expect(deriveContainerMemoryBytes("512m")).toBe(512 * MIB + GIB);
  });

  it("throws on unparseable values", () => {
    expect(() => deriveContainerMemoryBytes("garbage")).toThrow(/Unparseable/);
    expect(() => deriveContainerMemoryBytes("")).toThrow(/Unparseable/);
    expect(() => deriveContainerMemoryBytes("2GB")).toThrow(/Unparseable/);
    expect(() => deriveContainerMemoryBytes("2048")).toThrow(/Unparseable/);
    expect(() => deriveContainerMemoryBytes("0G")).toThrow(/Unparseable/);
  });
});

describe("removeContainer", () => {
  beforeEach(() => {
    stopMock.mockReset().mockResolvedValue(undefined);
    removeMock.mockReset().mockResolvedValue(undefined);
  });

  it("resolves normally when stop and remove succeed", async () => {
    await expect(removeContainer("abc")).resolves.toBeUndefined();
    expect(stopMock).toHaveBeenCalled();
    expect(removeMock).toHaveBeenCalledWith({ force: true });
  });

  it("resolves when the container is already gone (404 on both)", async () => {
    stopMock.mockRejectedValue(statusError(404));
    removeMock.mockRejectedValue(statusError(404));
    await expect(removeContainer("abc")).resolves.toBeUndefined();
  });

  it("resolves when remove throws 404 but stop succeeded", async () => {
    removeMock.mockRejectedValue(statusError(404));
    await expect(removeContainer("abc")).resolves.toBeUndefined();
  });

  it("propagates non-404 errors from remove", async () => {
    removeMock.mockRejectedValue(statusError(500));
    await expect(removeContainer("abc")).rejects.toThrow(/500/);
  });
});
