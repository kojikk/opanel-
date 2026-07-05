import { describe, expect, it } from "vitest";
import { parseMspt, parsePlayerList, parseTps } from "@/lib/rcon/parsers";

describe("parseTps", () => {
  it("parses Paper TPS response with color codes", () => {
    expect(parseTps("§6TPS from last 1m, 5m, 15m: §a*20.0, §a*20.0, §a*20.0")).toBe(20);
  });

  it("parses degraded TPS", () => {
    expect(parseTps("§6TPS from last 1m, 5m, 15m: §e18.5, §a19.2, §a19.8")).toBe(18.5);
  });

  it("caps TPS at 20", () => {
    expect(parseTps("TPS: 25.0")).toBe(20);
  });

  it("returns null for empty or unparseable response", () => {
    expect(parseTps("")).toBeNull();
    expect(parseTps("Unknown command")).toBeNull();
  });

  it("returns null for error messages without numbers", () => {
    expect(parseTps("Unknown or incomplete command, see below for error")).toBeNull();
    expect(parseTps("An error occurred while running this command")).toBeNull();
  });

  it("parses response without color codes", () => {
    expect(parseTps("TPS from last 1m, 5m, 15m: 19.3, 19.8, 20.0")).toBe(19.3);
  });

  it("parses single TPS value", () => {
    expect(parseTps("Current TPS: 17.8")).toBe(17.8);
  });
});

describe("parseMspt", () => {
  it("parses Paper MSPT response", () => {
    expect(parseMspt("Server tick times (avg/min/max) from last 5s, 10s, 60s: §a25.3/22.1/30.5ms")).toBe(30.5);
  });

  it("parses simple ms response", () => {
    expect(parseMspt("Average tick time: 12.5 ms")).toBe(12.5);
  });

  it("returns null for empty or unparseable response", () => {
    expect(parseMspt("")).toBeNull();
    expect(parseMspt("Unknown command")).toBeNull();
  });

  it("returns null for numeric responses without ms unit", () => {
    expect(parseMspt("TPS: 20.0")).toBeNull();
    expect(parseMspt("There are 5 players")).toBeNull();
  });

  it("handles integer ms value", () => {
    expect(parseMspt("50ms")).toBe(50);
  });
});

describe("parsePlayerList", () => {
  it("parses standard response with players", () => {
    const result = parsePlayerList("There are 3 of a max of 20 players online: Steve, Alex, Notch");
    expect(result).not.toBeNull();
    expect(result!.online).toBe(3);
    expect(result!.max).toBe(20);
    expect(result!.players).toEqual(["Steve", "Alex", "Notch"]);
  });

  it("parses zero players", () => {
    const result = parsePlayerList("There are 0 of a max of 20 players online:");
    expect(result).not.toBeNull();
    expect(result!.online).toBe(0);
    expect(result!.max).toBe(20);
    expect(result!.players).toEqual([]);
  });

  it("handles single player", () => {
    const result = parsePlayerList("There are 1 of a max of 100 players online: Steve");
    expect(result).not.toBeNull();
    expect(result!.online).toBe(1);
    expect(result!.max).toBe(100);
    expect(result!.players).toEqual(["Steve"]);
  });

  it("returns null for unknown format instead of a fake empty server", () => {
    expect(parsePlayerList("This is not a player list")).toBeNull();
    expect(parsePlayerList("")).toBeNull();
    expect(parsePlayerList("Unknown command")).toBeNull();
  });

  it("trims player names", () => {
    const result = parsePlayerList("There are 2 of a max of 10 players online:  Steve , Alex ");
    expect(result).not.toBeNull();
    expect(result!.players).toEqual(["Steve", "Alex"]);
  });
});
