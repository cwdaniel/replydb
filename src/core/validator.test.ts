import { describe, it, expect } from "vitest";
import { safeJsonParse, isReplyDBEvent, parseEventFromText } from "./validator.js";

describe("safeJsonParse", () => {
  it("should parse valid JSON", () => {
    expect(safeJsonParse('{"a":1}')).toEqual({ a: 1 });
    expect(safeJsonParse("[1,2,3]")).toEqual([1, 2, 3]);
    expect(safeJsonParse('"string"')).toBe("string");
    expect(safeJsonParse("123")).toBe(123);
    expect(safeJsonParse("null")).toBe(null);
  });

  it("should return null for invalid JSON", () => {
    expect(safeJsonParse("{invalid}")).toBeNull();
    expect(safeJsonParse("")).toBeNull();
    expect(safeJsonParse("undefined")).toBeNull();
    expect(safeJsonParse("{a:1}")).toBeNull();
  });
});

describe("isReplyDBEvent", () => {
  it("should accept valid insert events", () => {
    expect(isReplyDBEvent({ v: 1, op: "ins", content: { text: "hello" } })).toBe(true);
    expect(isReplyDBEvent({ v: 1, op: "ins", content: {} })).toBe(true);
    expect(isReplyDBEvent({ v: 1, op: "ins", content: null })).toBe(true);
  });

  it("should accept valid update events", () => {
    expect(isReplyDBEvent({ v: 1, op: "upd", id: "r_123" })).toBe(true);
    expect(isReplyDBEvent({ v: 1, op: "upd", id: "r_123", content: { done: true } })).toBe(true);
  });

  it("should accept valid delete events", () => {
    expect(isReplyDBEvent({ v: 1, op: "del", id: "r_123" })).toBe(true);
  });

  it("should reject events with wrong version", () => {
    expect(isReplyDBEvent({ v: 2, op: "ins", content: {} })).toBe(false);
    expect(isReplyDBEvent({ v: 0, op: "ins", content: {} })).toBe(false);
    expect(isReplyDBEvent({ op: "ins", content: {} })).toBe(false);
  });

  it("should reject events with invalid op", () => {
    expect(isReplyDBEvent({ v: 1, op: "insert", content: {} })).toBe(false);
    expect(isReplyDBEvent({ v: 1, op: "update", id: "r_123" })).toBe(false);
    expect(isReplyDBEvent({ v: 1, op: "delete", id: "r_123" })).toBe(false);
    expect(isReplyDBEvent({ v: 1, content: {} })).toBe(false);
  });

  it("should reject insert events without content", () => {
    expect(isReplyDBEvent({ v: 1, op: "ins" })).toBe(false);
    expect(isReplyDBEvent({ v: 1, op: "ins", id: "r_123" })).toBe(false);
  });

  it("should reject update/delete events without id", () => {
    expect(isReplyDBEvent({ v: 1, op: "upd", content: {} })).toBe(false);
    expect(isReplyDBEvent({ v: 1, op: "del" })).toBe(false);
    expect(isReplyDBEvent({ v: 1, op: "upd", id: 123 })).toBe(false);
  });

  it("should reject non-objects", () => {
    expect(isReplyDBEvent(null)).toBe(false);
    expect(isReplyDBEvent(undefined)).toBe(false);
    expect(isReplyDBEvent("string")).toBe(false);
    expect(isReplyDBEvent(123)).toBe(false);
    expect(isReplyDBEvent([])).toBe(false);
  });
});

describe("parseEventFromText", () => {
  it("should parse valid event JSON", () => {
    const event = parseEventFromText('{"v":1,"op":"ins","content":{"text":"hello"}}');
    expect(event).toEqual({ v: 1, op: "ins", content: { text: "hello" } });
  });

  it("should return null for invalid JSON", () => {
    expect(parseEventFromText("{invalid}")).toBeNull();
  });

  it("should return null for valid JSON that is not a valid event", () => {
    expect(parseEventFromText('{"v":2,"op":"ins"}')).toBeNull();
    expect(parseEventFromText('{"text":"just a message"}')).toBeNull();
  });
});
