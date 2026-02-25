import { describe, expect, it } from "vitest";

import {
  formatDataSize,
  generateRandomString,
  getInputtedArgumentStr,
  getCurrentArgumentIndex,
  isNumeric,
  isPreviewVersion,
  purifyUnsafeText,
  validateIpv4Address,
  isBukkit,
  objectToMap,
  getRandom,
} from "@/lib/utils";

describe("formatDataSize", () => {
  it("formats KB", () => {
    expect(formatDataSize(512)).toBe("0.50 KB");
    expect(formatDataSize(1023)).toBe("1.00 KB");
  });

  it("formats MB", () => {
    expect(formatDataSize(1024 * 1024)).toBe("1.00 MB");
    expect(formatDataSize(1536 * 1024)).toBe("1.50 MB");
  });

  it("formats GB", () => {
    expect(formatDataSize(1024 * 1024 * 1024)).toBe("1.00 GB");
    expect(formatDataSize(2.5 * 1024 * 1024 * 1024)).toBe("2.50 GB");
  });

  it("formats TB", () => {
    expect(formatDataSize(1024 * 1024 * 1024 * 1024)).toBe("1.00 TB");
  });
});

describe("isNumeric", () => {
  it("returns true for valid numbers", () => {
    expect(isNumeric("42")).toBe(true);
    expect(isNumeric("3.14")).toBe(true);
    expect(isNumeric("-1")).toBe(true);
    expect(isNumeric("0")).toBe(true);
  });

  it("returns false for non-numbers", () => {
    expect(isNumeric("")).toBe(false);
    expect(isNumeric("abc")).toBe(false);
    expect(isNumeric("12abc")).toBe(false);
    expect(isNumeric("NaN")).toBe(false);
  });
});

describe("isBukkit", () => {
  it("identifies Bukkit-derived server types", () => {
    expect(isBukkit("Bukkit")).toBe(true);
    expect(isBukkit("Spigot")).toBe(true);
    expect(isBukkit("Paper")).toBe(true);
    expect(isBukkit("Folia")).toBe(true);
    expect(isBukkit("Leaves")).toBe(true);
  });

  it("rejects non-Bukkit types", () => {
    expect(isBukkit("Fabric")).toBe(false);
    expect(isBukkit("Forge")).toBe(false);
    expect(isBukkit("Neoforge")).toBe(false);
  });
});

describe("validateIpv4Address", () => {
  it("validates correct IPs", () => {
    expect(validateIpv4Address("192.168.1.1")).toBe(true);
    expect(validateIpv4Address("0.0.0.0")).toBe(true);
    expect(validateIpv4Address("255.255.255.255")).toBe(true);
    expect(validateIpv4Address("10.0.0.1")).toBe(true);
  });

  it("rejects invalid IPs", () => {
    expect(validateIpv4Address("256.1.1.1")).toBe(false);
    expect(validateIpv4Address("1.2.3")).toBe(false);
    expect(validateIpv4Address("1.2.3.4.5")).toBe(false);
    expect(validateIpv4Address("abc")).toBe(false);
    expect(validateIpv4Address("")).toBe(false);
  });
});

describe("isPreviewVersion", () => {
  it("detects pre-release versions", () => {
    expect(isPreviewVersion("1.21.5-pre1")).toBe(true);
    expect(isPreviewVersion("1.21.5-rc1")).toBe(true);
    expect(isPreviewVersion("1.21pre1")).toBe(true);
  });

  it("rejects stable versions", () => {
    expect(isPreviewVersion("1.21.5")).toBe(false);
    expect(isPreviewVersion("1.20.4")).toBe(false);
  });
});

describe("purifyUnsafeText", () => {
  it("escapes HTML characters", () => {
    expect(purifyUnsafeText('<script>alert("xss")</script>')).toBe(
      "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
    );
  });

  it("escapes ampersands", () => {
    expect(purifyUnsafeText("foo & bar")).toBe("foo &amp; bar");
  });

  it("escapes single quotes", () => {
    expect(purifyUnsafeText("it's")).toBe("it&apos;s");
  });

  it("returns empty string for empty input", () => {
    expect(purifyUnsafeText("")).toBe("");
  });
});

describe("getInputtedArgumentStr", () => {
  it("extracts current argument at cursor", () => {
    expect(getInputtedArgumentStr("do hello world", 5)).toBe("he");
    expect(getInputtedArgumentStr("do hello world", 13)).toBe("worl");
  });

  it("handles cursor at start", () => {
    expect(getInputtedArgumentStr("hello", 0)).toBe("");
  });

  it("throws on out-of-bounds cursor", () => {
    expect(() => getInputtedArgumentStr("hi", 5)).toThrow();
  });
});

describe("getCurrentArgumentIndex", () => {
  it("returns correct argument index", () => {
    expect(getCurrentArgumentIndex("do hello world", 5)).toBe(2);
    expect(getCurrentArgumentIndex("do hello world", 13)).toBe(3);
  });

  it("returns 1 for first argument", () => {
    expect(getCurrentArgumentIndex("hello", 3)).toBe(1);
  });
});

describe("generateRandomString", () => {
  it("generates string of correct length", () => {
    expect(generateRandomString(10).length).toBe(10);
    expect(generateRandomString(0).length).toBe(0);
    expect(generateRandomString(50).length).toBe(50);
  });

  it("only contains alphanumeric characters", () => {
    const str = generateRandomString(100);
    expect(str).toMatch(/^[A-Za-z0-9]*$/);
  });
});

describe("objectToMap", () => {
  it("converts object to Map", () => {
    const map = objectToMap({ a: 1, b: 2 });
    expect(map.get("a")).toBe(1);
    expect(map.get("b")).toBe(2);
    expect(map.size).toBe(2);
  });

  it("handles empty object", () => {
    const map = objectToMap({});
    expect(map.size).toBe(0);
  });
});

describe("getRandom", () => {
  it("returns values within range", () => {
    for (let i = 0; i < 100; i++) {
      const val = getRandom(5, 10);
      expect(val).toBeGreaterThanOrEqual(5);
      expect(val).toBeLessThanOrEqual(10);
    }
  });

  it("works with same min and max", () => {
    expect(getRandom(7, 7)).toBe(7);
  });
});
