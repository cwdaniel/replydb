import type { ReplyDBEvent } from "./types.js";

/**
 * Safely parse JSON without throwing.
 *
 * @param text - The JSON string to parse
 * @returns Parsed value or null if parsing fails
 */
export function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/**
 * Type guard to validate if an unknown value is a valid ReplyDBEvent.
 *
 * Validates:
 * - v === 1
 * - op is "ins" | "upd" | "del"
 * - For upd/del: id must be a string
 * - For ins: content must be present (not undefined)
 *
 * Note: Does NOT validate the internal shape of `content` - that's app responsibility.
 *
 * @param x - Unknown value to validate
 * @returns True if x is a valid ReplyDBEvent
 */
export function isReplyDBEvent(x: unknown): x is ReplyDBEvent {
  if (typeof x !== "object" || x === null) {
    return false;
  }

  const obj = x as Record<string, unknown>;

  // Check version
  if (obj.v !== 1) {
    return false;
  }

  // Check operation type
  const validOps = ["ins", "upd", "del"];
  if (typeof obj.op !== "string" || !validOps.includes(obj.op)) {
    return false;
  }

  const op = obj.op as "ins" | "upd" | "del";

  // For upd/del: id must be a string
  if ((op === "upd" || op === "del") && typeof obj.id !== "string") {
    return false;
  }

  // For ins: content must be present (not undefined)
  if (op === "ins" && obj.content === undefined) {
    return false;
  }

  return true;
}

/**
 * Extract and validate a ReplyDBEvent from raw text.
 *
 * @param text - Raw text that should contain JSON event
 * @returns Validated event or null if invalid
 */
export function parseEventFromText(text: string): ReplyDBEvent | null {
  const parsed = safeJsonParse(text);
  if (parsed === null) {
    return null;
  }

  if (!isReplyDBEvent(parsed)) {
    return null;
  }

  return parsed;
}
