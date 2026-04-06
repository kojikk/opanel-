import AnsiToHtml from "ansi-to-html";
import { purify, parseTextToANSI } from "./text";

const ansiConverter = new AnsiToHtml({ fg: "#ccc", bg: "transparent" });

/**
 * Convert a raw console line to safe HTML with color support.
 * Handles both:
 *  - Minecraft § color codes (§a, §c, §l, etc.)
 *  - Direct ANSI escape sequences from plugins
 *
 * Pipeline: raw → purify (fix §-encoding) → §→ANSI → ANSI→HTML
 */
export function formatConsoleLine(line: string): string {
  const purified = purify(line);
  const ansi = parseTextToANSI(purified);
  return ansiConverter.toHtml(ansi);
}
