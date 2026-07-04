import { describe, expect, it } from "vitest";

import { MAX_PLUGIN_UPLOAD_SIZE, sanitizeUploadFilename, validatePluginUpload } from "@/lib/utils";

describe("sanitizeUploadFilename", () => {
  it("passes plain file names through", () => {
    expect(sanitizeUploadFilename("test.jar")).toBe("test.jar");
    expect(sanitizeUploadFilename("My Plugin-1.2.jar")).toBe("My Plugin-1.2.jar");
  });

  it("strips path components", () => {
    expect(sanitizeUploadFilename("../escape.jar")).toBe("escape.jar");
    expect(sanitizeUploadFilename("a/../b.jar")).toBe("b.jar");
    expect(sanitizeUploadFilename("sub/dir.jar")).toBe("dir.jar");
    expect(sanitizeUploadFilename("..\\escape.jar")).toBe("escape.jar");
  });

  it("throws on empty or traversal-only names", () => {
    expect(() => sanitizeUploadFilename("")).toThrow();
    expect(() => sanitizeUploadFilename("..")).toThrow();
    expect(() => sanitizeUploadFilename("plugins/")).toThrow();
    expect(() => sanitizeUploadFilename("a/..")).toThrow();
  });

  it("throws on null bytes", () => {
    expect(() => sanitizeUploadFilename("evil\0.jar")).toThrow();
  });
});

describe("validatePluginUpload", () => {
  it("accepts a valid .jar upload and returns the sanitized name", () => {
    expect(validatePluginUpload("test.jar", 1024)).toBe("test.jar");
    expect(validatePluginUpload("TEST.JAR", 1024)).toBe("TEST.JAR");
    expect(validatePluginUpload("sub/dir.jar", 1024)).toBe("dir.jar");
  });

  it("rejects non-.jar extensions", () => {
    expect(() => validatePluginUpload("evil.sh", 1024)).toThrow(/\.jar/);
    expect(() => validatePluginUpload("plugin.jar.exe", 1024)).toThrow(/\.jar/);
  });

  it("rejects oversized files", () => {
    expect(() => validatePluginUpload("big.jar", MAX_PLUGIN_UPLOAD_SIZE + 1)).toThrow(/50 MB/);
    expect(validatePluginUpload("ok.jar", MAX_PLUGIN_UPLOAD_SIZE)).toBe("ok.jar");
  });
});
